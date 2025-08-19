FROM python:3.12-slim

WORKDIR /app

# Install uv with pip cache mount for faster rebuilds
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install uv

# Copy all source code first (uv needs app directory for package info)
COPY . .

# Use uv to install dependencies with cache mount
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync

EXPOSE 8000

# Use uv run to execute uvicorn with proper environment
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]