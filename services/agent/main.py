"""
openNBA Agent Service — FastAPI entrypoint
"""

import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import get_settings
from pipeline.orchestrator import AgentOrchestrator
from providers.factory import create_data_provider

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    settings = get_settings()
    logger.info(
        "agent_service_startup",
        data_mode=settings.data_mode,
        version=settings.git_sha,
    )
    yield
    logger.info("agent_service_shutdown")


app = FastAPI(
    title="openNBA Agent Service",
    description="LangGraph-based NBA pipeline for Pharma MRs",
    version="0.1.0",
    docs_url="/docs" if os.getenv("NODE_ENV") != "production" else None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("ALLOWED_ORIGIN", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────
# Health
# ─────────────────────────────────────────────────────────────


class HealthResponse(BaseModel):
    status: str
    version: str
    data_mode: str


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(
        status="ok",
        version=settings.git_sha,
        data_mode=settings.data_mode,
    )


# ─────────────────────────────────────────────────────────────
# Agent Pipeline
# ─────────────────────────────────────────────────────────────


class RunResponse(BaseModel):
    run_id: str
    status: str


class RunStatusResponse(BaseModel):
    run_id: str
    status: str
    cards_generated: int | None = None
    error_message: str | None = None


_orchestrator: AgentOrchestrator | None = None


def get_orchestrator() -> AgentOrchestrator:
    global _orchestrator
    if _orchestrator is None:
        provider = create_data_provider()
        _orchestrator = AgentOrchestrator(provider=provider)
    return _orchestrator


@app.post(
    "/agent/run/{mr_id}",
    response_model=RunResponse,
    status_code=202,
    tags=["Agent"],
)
async def trigger_run(mr_id: str) -> RunResponse:
    """
    Trigger an async NBA pipeline run for the given MR.
    Returns a run_id immediately for status polling.
    If a run is already in progress for this MR, the new request is queued.
    """
    orchestrator = get_orchestrator()
    run_id = await orchestrator.enqueue_run(mr_id)
    return RunResponse(run_id=run_id, status="QUEUED")


@app.get(
    "/agent/status/{run_id}",
    response_model=RunStatusResponse,
    tags=["Agent"],
)
async def get_run_status(run_id: str) -> RunStatusResponse:
    """Poll the status of a pipeline run."""
    orchestrator = get_orchestrator()
    status = orchestrator.get_status(run_id)
    if status is None:
        raise HTTPException(status_code=404, detail="Run not found")
    return RunStatusResponse(**status)
