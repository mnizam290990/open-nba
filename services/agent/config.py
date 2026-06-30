"""
Centralised settings loaded from environment variables.
"""

import os
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    data_mode: str = Field(default="MOCK", alias="DATA_MODE")
    git_sha: str = Field(default="local", alias="VERCEL_GIT_COMMIT_SHA")
    database_url: str = Field(default="", alias="DATABASE_URL")
    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    aws_access_key_id: str = Field(default="", alias="AWS_ACCESS_KEY_ID")
    aws_secret_access_key: str = Field(default="", alias="AWS_SECRET_ACCESS_KEY")
    aws_region: str = Field(default="us-east-1", alias="AWS_REGION")
    bedrock_model_id: str = Field(
        default="anthropic.claude-3-5-sonnet-20241022-v2:0",
        alias="BEDROCK_MODEL_ID",
    )
    langsmith_api_key: str = Field(default="", alias="LANGSMITH_API_KEY")
    langsmith_project: str = Field(default="opennba", alias="LANGSMITH_PROJECT")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    # Gap threshold in days (hot-reloadable via VerticalConfig)
    gap_threshold_days: int = Field(default=60, alias="GAP_THRESHOLD_DAYS")
    pipeline_timeout_seconds: int = Field(default=600, alias="PIPELINE_TIMEOUT_SECONDS")

    class Config:
        env_file = ".env"
        populate_by_name = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
