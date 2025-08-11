FROM python:3.12-slim

WORKDIR /app

# Install uv
RUN pip install uv

# Copy project configuration and source code
COPY pyproject.toml .
COPY app/ ./app/
COPY main.py .

# Use uv to install dependencies from pyproject.toml
RUN uv sync

# Copy remaining files
COPY . .

EXPOSE 8000

# Use uv run to execute uvicorn with proper environment
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]