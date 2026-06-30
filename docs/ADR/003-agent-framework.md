# ADR-003 — Agent Framework: LangGraph

**Date:** 2026-06-30
**Status:** Accepted
**Authors:** Nagarro Platform Team

---

## Context

The AI pipeline involves five ordered, stateful steps (signal harvesting → gap detection → scoring → context synthesis → offer recommendation) with requirements for:
- Per-step retry with exponential backoff
- Partial-enrichment when a step fails
- Async execution with status polling
- Structured intermediate state passed between steps
- Easy step replacement or addition for future verticals

## Decision

Use **LangGraph** (by LangChain) as the agent orchestration framework.

## Alternatives Considered

| Option | Pros | Cons |
|---|---|---|
| **LangGraph** ✓ | Native graph DSL, built-in state mgmt, LangSmith integration | LangChain dependency, evolving API |
| **Prefect** | Excellent DAG/workflow tooling, great UI | Not LLM-focused, heavy infra |
| **Celery + custom** | Full control, battle-tested | No LLM primitives, manual retry/state |
| **CrewAI** | Simple multi-agent setup | Less control over step orchestration |
| **Pure Python asyncio** | Zero deps | Re-inventing state machine, no observability |

## Consequences

- **Positive:** LangGraph's `StateGraph` + checkpointing handles partial-enrichment states natively.
- **Positive:** LangSmith tracing comes for free — every LLM call is captured with tokens, latency, cost.
- **Positive:** Each agent node is a plain Python function, easy to unit-test in isolation.
- **Negative:** LangChain ecosystem changes quickly; pinned versions in `pyproject.toml` reduce churn.
- **Negative:** Graph config adds indirection vs plain Python; compensated by clear documentation in `docs/AGENT_PIPELINE.md`.
