# Multi-stage Dockerfile for RoadDogs FastAPI application

FROM python:3.12-slim AS base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv (the installer's target dir has moved between versions - .cargo/bin
# historically, .local/bin on newer releases - so put both on PATH)
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:/root/.cargo/bin:${PATH}"

WORKDIR /app


# Development stage
FROM base AS development

# Copy dependency files
COPY pyproject.toml .
COPY requirements.txt* ./
COPY src/ctx-timer ./src/ctx-timer

# Install all dependencies (including dev)
RUN uv pip install --system -r pyproject.toml --all-extras
# ctx_timer is this project's own package (src/ctx-timer), not on PyPI - legacy
# Tornado servers (sublayers_server, sublayers_site) import it directly.
RUN uv pip install --system -e src/ctx-timer/

# Copy application code
COPY . .

# Expose ports
EXPOSE 8000

# Development command with hot-reload
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]


# Production build stage
FROM base AS builder

# Copy dependency files
COPY pyproject.toml .
COPY requirements.txt* ./

# Install production dependencies only (plain `uv pip install -r pyproject.toml`
# already excludes dev/optional extras unless --all-extras is passed, so this
# is production-only by default; `--no-dev` here is a uv-sync-only flag that
# `uv pip install` rejects outright)
RUN uv pip install --system -r pyproject.toml

# Copy application code
COPY app ./app
COPY sublayers_common ./sublayers_common
# Every app/routers/*.py that renders HTML uses Jinja2Templates(directory="templates")
# - a relative path resolved against the process CWD, not app/templates. Omitting
# this left every HTML-rendering route in the production image throwing
# TemplateNotFound.
COPY templates ./templates


# Production stage
FROM python:3.12-slim AS production

# Install runtime dependencies only
RUN apt-get update && apt-get install -y \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY --from=builder /app/app ./app
COPY --from=builder /app/sublayers_common ./sublayers_common
COPY --from=builder /app/templates ./templates

# Create non-root user
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

# Production command
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
