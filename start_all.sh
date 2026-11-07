#!/usr/bin/env bash
# =============================================================================
# Tri-Pillar Enterprise Data & AI Ecosystem - Linux/macOS Orchestrator
# =============================================================================

echo "========================================================================="
echo "              Tri-Pillar Enterprise Data & AI Ecosystem                  "
echo "========================================================================="
echo ""
echo "[0] Launch ALL 3 Services Concurrently (Pillars 1, 2, and 3)"
echo "[1] Start Pillar 1: Retail Analytics (Bun + SQLite + React on :3001)"
echo "[2] Start Pillar 2: AutoRAG Telemetry Engine (FastAPI on :8000)"
echo "[3] Start Pillar 3: Predictive Maintenance ML Service (FastAPI on :5000)"
echo "[4] Run AutoRAG Pytest Verification Suite (21 tests)"
echo "[5] Run Pillar 3: Predictive Maintenance ML Training & Cost Matrix"
echo "[6] Spin up entire Ecosystem with Docker Compose (docker compose up --build)"
echo "[7] Exit"
echo ""
read -p "Select an option (0-7): " choice

case $choice in
    0)
        echo "Launching all 3 services concurrently..."
        bun run start &
        (cd autorag-telemetry && python main.py) &
        (cd predictive-maintenance-ml && python src/server.py) &
        echo "[SUCCESS] All 3 services running in background (:3001, :8000, :5000)."
        ;;
    1)
        echo "Starting Pillar 1 on http://localhost:3001..."
        bun run start
        ;;
    2)
        echo "Starting Pillar 2 on http://localhost:8000..."
        python autorag-telemetry/main.py
        ;;
    3)
        echo "Starting Pillar 3 on http://localhost:5000..."
        python predictive-maintenance-ml/src/server.py
        ;;
    4)
        echo "Running Pytest Suite..."
        python -m pytest autorag-telemetry/test_rag_engine.py -v
        ;;
    5)
        echo "Running MLOps Pipeline & Threshold Optimization..."
        python predictive-maintenance-ml/src/train.py
        ;;
    6)
        echo "Launching Docker Compose..."
        docker compose up --build
        ;;
    *)
        exit 0
        ;;
esac
