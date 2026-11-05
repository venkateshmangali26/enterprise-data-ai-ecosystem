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

# Execute training pipeline followed by ONNX export
CMD ["sh", "-c", "python src/train_pipeline.py && python src/export_onnx.py"]

