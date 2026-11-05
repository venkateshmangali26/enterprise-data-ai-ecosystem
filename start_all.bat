@echo off
title Tri-Pillar Enterprise Data & AI Ecosystem
echo =========================================================================
echo               Tri-Pillar Enterprise Data & AI Ecosystem
echo =========================================================================
echo.
echo [1] Start Pillar 1: Retail Analytics (Bun + SQLite + React on :3001)
echo [2] Start Pillar 2: AutoRAG Telemetry Engine (FastAPI on :8000)
echo [3] Run AutoRAG Pytest Verification Suite (19 tests)
echo [4] Run Pillar 3: Predictive Maintenance ML Training & Cost Matrix
echo [5] Spin up entire Ecosystem with Docker Compose (docker compose up --build)
echo [6] Exit
echo.
set /p choice="Select an option (1-6): "

if "%choice%"=="1" (
    echo Starting Pillar 1 on http://localhost:3001...
    bun run start
)
if "%choice%"=="2" (
    echo Starting Pillar 2 on http://localhost:8000...
    python autorag-telemetry/main.py
)
if "%choice%"=="3" (
    echo Running Pytest Suite...
    python -m pytest autorag-telemetry/test_rag_engine.py -v
    pause
)
if "%choice%"=="4" (
    echo Running MLOps Pipeline...
    python predictive-maintenance-ml/src/train.py
    pause
)
if "%choice%"=="5" (
    echo Launching Docker Compose...
    docker compose up --build
    pause
)
if "%choice%"=="6" (
    exit
)

