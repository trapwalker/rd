# Multi-stage Dockerfile for RoadDogs FastAPI application

FROM python:3.12-slim AS base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.cargo/bin:${PATH}"

WORKDIR /app


# Development stage
FROM base AS development

# Copy dependency files
COPY pyproject.toml .
COPY requirements.txt* ./

# Install all dependencies (including dev)
RUN uv pip install --system -r pyproject.toml --all-extras

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

# Install production dependencies only
RUN uv pip install --system -r pyproject.toml --no-dev

# Copy application code
COPY app ./app
COPY sublayers_common ./sublayers_common


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
