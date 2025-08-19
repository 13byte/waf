FROM python:3.12-slim

WORKDIR /app

# Install uv with pip cache mount for faster rebuilds
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install uv

# Copy only dependency files first for better layer caching
COPY pyproject.toml .

# Use uv to install dependencies with cache mount
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync

# Copy source code after dependencies are installed
COPY app/ ./app/
COPY main.py .

# Copy remaining files
COPY . .

EXPOSE 8000

# Use uv run to execute uvicorn with proper environment
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]