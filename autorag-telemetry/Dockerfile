# ==============================================================================
# Dockerfile for Pillar 2: Enterprise AutoRAG Diagnostic Engine
# High-speed sandboxed FastAPI service with dense vector search & diagnostic UI
# ==============================================================================
FROM python:3.11-slim AS runner

WORKDIR /app

# Install system dependencies (curl for container healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Optimize Python execution in container
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    HOST=0.0.0.0 \
    AUTORAG_FAST_FALLBACK=1

# Install PyTorch CPU first to avoid heavy CUDA wheels (saves >2GB download)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Copy requirements and install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy service code, static UI, and security test suite
COPY main.py test_rag_engine.py ./
COPY static/ ./static/

# Expose FastAPI REST API & Diagnostic UI port
EXPOSE 8000

# Container healthcheck
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

# Start FastAPI application via Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
