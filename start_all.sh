#!/usr/bin/env bash
# =============================================================================
# Tri-Pillar Enterprise Data & AI Ecosystem - Linux/macOS Orchestrator
# =============================================================================

echo "========================================================================="
echo "              Tri-Pillar Enterprise Data & AI Ecosystem                  "
echo "========================================================================="
echo ""
echo "[1] Start Pillar 1: Retail Analytics (Bun + SQLite + React on :3001)"
echo "[2] Start Pillar 2: AutoRAG Telemetry Engine (FastAPI on :8000)"
echo "[3] Run AutoRAG Pytest Verification Suite (19 tests)"
echo "[4] Run Pillar 3: Predictive Maintenance ML Training & Cost Matrix"
echo "[5] Exit"
echo ""
read -p "Select an option (1-5): " choice

case $choice in
    1)
        echo "Starting Pillar 1 on http://localhost:3001..."
        bun run start
        ;;
    2)
        echo "Starting Pillar 2 on http://localhost:8000..."
        python autorag-telemetry/main.py
        ;;
    3)
        echo "Running Pytest Suite..."
        pytest autorag-telemetry/test_rag_engine.py -v
        ;;
    4)
        echo "Running MLOps Pipeline..."
        python predictive-maintenance-ml/src/train.py
        ;;
    *)
        exit 0
        ;;
esac

