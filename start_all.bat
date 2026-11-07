@echo off
title Tri-Pillar Enterprise Data & AI Ecosystem
echo =========================================================================
echo               Tri-Pillar Enterprise Data & AI Ecosystem
echo =========================================================================
echo.
echo [0] Launch ALL 3 Services Concurrently (Pillars 1, 2, and 3)
echo [1] Start Pillar 1: Retail Analytics (Bun + SQLite + React on :3001)
echo [2] Start Pillar 2: AutoRAG Telemetry Engine (FastAPI on :8000)
echo [3] Start Pillar 3: Predictive Maintenance ML Service (FastAPI on :5000)
echo [4] Run AutoRAG Pytest Verification Suite (21 tests)
echo [5] Run Pillar 3: Predictive Maintenance ML Training & Cost Matrix
echo [6] Spin up entire Ecosystem with Docker Compose (docker compose up --build)
echo [7] Exit
echo.
set /p choice="Select an option (0-7): "

if "%choice%"=="0" (
    echo.
    echo Launching all 3 enterprise microservices concurrently...
    start "Pillar 1: Retail Analytics" cmd /k "cd /d %~dp0 && bun run start"
    start "Pillar 2: AutoRAG Telemetry Engine" cmd /k "cd /d %~dp0autorag-telemetry && python main.py"
    start "Pillar 3: Predictive Maintenance ML Service" cmd /k "cd /d %~dp0predictive-maintenance-ml && python src/server.py"
    echo.
    echo =========================================================================
    echo [SUCCESS] All 3 services dispatched:
    echo   * Pillar 1 Dashboard: http://localhost:3001
    echo   * Pillar 2 AutoRAG:   http://localhost:8000 (Docs: /docs)
    echo   * Pillar 3 ML Engine: http://localhost:5000 (Docs: /docs)
    echo =========================================================================
    pause
)
if "%choice%"=="1" (
    echo Starting Pillar 1 on http://localhost:3001...
    bun run start
)
if "%choice%"=="2" (
    echo Starting Pillar 2 on http://localhost:8000...
    python autorag-telemetry/main.py
)
if "%choice%"=="3" (
    echo Starting Pillar 3 on http://localhost:5000...
    python predictive-maintenance-ml/src/server.py
)
if "%choice%"=="4" (
    echo Running Pytest Suite (21 tests)...
    python -m pytest autorag-telemetry/test_rag_engine.py -v
    pause
)
if "%choice%"=="5" (
    echo Running MLOps Pipeline & Threshold Optimization...
    python predictive-maintenance-ml/src/train.py
    pause
)
if "%choice%"=="6" (
    echo Launching Docker Compose...
    docker compose up --build
    pause
)
if "%choice%"=="7" (
    exit
)
