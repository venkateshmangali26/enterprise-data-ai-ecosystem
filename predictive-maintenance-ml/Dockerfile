# ==============================================================================
# Dockerfile for Pillar 3: Predictive Maintenance MLOps Pipeline
# Automated signal synthesis, cost-utility training, and ONNX runtime export
# ==============================================================================
FROM python:3.11-slim AS mlops-runner

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Install requirements
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code and ensure output directories exist
COPY src/ ./src/
RUN mkdir -p models data

# Expose port for inference REST microservice
EXPOSE 5000

# Execute server with model verification
CMD ["python", "src/server.py"]

