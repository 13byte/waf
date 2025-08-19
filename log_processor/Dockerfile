FROM python:3.12-slim

WORKDIR /app

# Install uv with pip cache mount for faster rebuilds
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install uv

# Copy all source code first (uv needs package info)
COPY . .

# Use uv to install dependencies with cache mount
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync

# Use uv run to execute the log processor
CMD ["uv", "run", "python", "log_processor.py"]