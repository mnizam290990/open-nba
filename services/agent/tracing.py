"""
LangSmith tracing initialisation.

Call `configure_tracing()` once at app startup.
When LANGSMITH_API_KEY is absent or empty the function is a no-op so the
service works without tracing in dev/CI environments.
"""

import os
import structlog

logger = structlog.get_logger(__name__)


def configure_tracing(api_key: str, project: str) -> bool:
    """
    Set the standard LangChain environment variables that enable LangSmith
    tracing automatically for all LangChain / LangGraph calls.

    Returns True when tracing was enabled, False otherwise.
    """
    if not api_key:
        logger.info("langsmith_tracing_disabled", reason="LANGSMITH_API_KEY not set")
        return False

    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_API_KEY"] = api_key
    os.environ["LANGCHAIN_PROJECT"] = project
    os.environ["LANGCHAIN_ENDPOINT"] = os.getenv(
        "LANGSMITH_ENDPOINT", "https://api.smith.langchain.com"
    )

    logger.info("langsmith_tracing_enabled", project=project)
    return True
