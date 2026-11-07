# ==============================================================================
# Dockerfile for Pillar 2: Enterprise AutoRAG Diagnostic Engine
# FastAPI Vector Semantic Search + XML Sandboxed Diagnostic Studio
# ==============================================================================
FROM python:3.11-slim AS autorag-runner

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    HOST=0.0.0.0 \
    AUTORAG_FAST_FALLBACK=1

# Install curl for container healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Install requirements
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code and static web assets
COPY main.py ./
COPY static/ ./static/

EXPOSE 8000

# Healthcheck to verify service availability
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Start FastAPI server via uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
