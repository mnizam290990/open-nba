FROM python:3.12-slim AS base

# Security: non-root user
RUN groupadd --gid 1001 appgroup && \
    useradd --uid 1001 --gid appgroup --shell /bin/bash --create-home appuser

WORKDIR /app

# Install uv for fast dependency installation
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Install dependencies (separate layer for caching)
COPY pyproject.toml uv.lock* ./
RUN uv sync --no-dev --frozen

# Copy application code
COPY --chown=appuser:appgroup . .

# Security: run as non-root
USER appuser

# Security: no writable root (use /tmp for any writes)
ENV TMPDIR=/tmp

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD python -c "import httpx; httpx.get('http://localhost:8000/health').raise_for_status()"

CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
