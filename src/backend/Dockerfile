FROM python:3.11-slim

WORKDIR /app

# Install uv package manager
RUN pip install --no-cache-dir uv

# Keep virtualenv outside /app so docker-compose bind mounts do not hide it.
ENV UV_PROJECT_ENVIRONMENT=/opt/venv

# Copy dependency files and local package source first for better layer caching.
# This Dockerfile is intended to be built from repository root context (`.`).
COPY src/backend/pyproject.toml /app/pyproject.toml
COPY src/backend/uv.lock /app/uv.lock
COPY src/sim /sim

# Install dependencies exactly as locked
RUN uv sync --frozen

# Copy application code
COPY src/backend /app

# Expose port (Cloud Run expects PORT, default 8080)
EXPOSE 8080

# Run FastAPI app using PORT env var (fallback to 8080)
CMD ["/bin/sh", "-c", "/opt/venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
