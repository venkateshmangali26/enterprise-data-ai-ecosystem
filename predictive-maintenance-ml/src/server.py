"""
Predictive Maintenance MLOps Edge Inference Microservice
========================================================
Dedicated high-throughput REST API for edge automotive failure prediction.
Powered by:
  - 13-feature Time & Spectral FFT extraction
  - Dual-engine ONNX Runtime with Scikit-Learn automatic failover
  - Dynamic loading of cost-optimized decision threshold (₹15L vs ₹15k)
"""

from __future__ import annotations

import os
import time
import uuid
import logging
from typing import Dict, List, Optional, Union
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from .feature_extraction import extract_signal_features
    from .inference import ResilientMaintenanceInferenceEngine
except ImportError:
    from feature_extraction import extract_signal_features
    from inference import ResilientMaintenanceInferenceEngine

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("mlops-server")

app = FastAPI(
    title="Predictive Maintenance Edge MLOps Service",
    version="2.1.0",
    description="Dual-engine ONNX/Scikit-learn automotive telemetry failure prediction microservice."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

engine = ResilientMaintenanceInferenceEngine()


class SensorStreamPayload(BaseModel):
    sensor_readings: List[float] = Field(
        ...,
        min_length=50,
        max_length=2000,
        description="Raw continuous vibration or pressure time-series stream"
    )
    decision_threshold: Optional[float] = Field(
        default=None,
        ge=0.01,
        le=0.99,
        description="Optional custom probability threshold override"
    )


class FeatureVectorPayload(BaseModel):
    features: Union[Dict[str, float], List[float]] = Field(
        ...,
        description="13 statistical and spectral features (dict or list)"
    )
    decision_threshold: Optional[float] = Field(
        default=None,
        ge=0.01,
        le=0.99,
        description="Optional custom probability threshold override"
    )


class FailurePredictionResponse(BaseModel):
    anomaly_detected: bool
    failure_probability: float
    decision_threshold: float
    risk_level: str
    engine: str
    features: Optional[Dict[str, float]] = None
    estimated_intervention_cost: float
    recommended_action: str


@app.middleware("http")
async def add_observability_headers(request: Request, call_next):
    req_id = str(uuid.uuid4())
    t0 = time.perf_counter()
    response: Response = await call_next(request)
    elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)
    response.headers["X-Request-ID"] = req_id
    response.headers["X-Response-Time-MS"] = str(elapsed_ms)
    logger.info("HTTP %s %s -> %d (%.2f ms) [req_id=%s]", request.method, request.url.path, response.status_code, elapsed_ms, req_id)
    return response


@app.get("/health", status_code=status.HTTP_200_OK, tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "service": "Predictive Maintenance Edge MLOps Service",
        "engine": "ONNX Runtime (C++ Accelerated)" if engine.ort_session else "Scikit-Learn Pipeline Fallback",
        "optimal_threshold": engine.optimal_threshold,
        "feature_count": len(engine.FEATURE_KEYS),
        "timestamp": time.time()
    }


@app.get("/metadata", tags=["Model Governance"])
async def get_metadata():
    if engine.metadata_path.exists():
        import json
        with open(engine.metadata_path, "r") as f:
            return json.load(f)
    return {
        "optimal_threshold": engine.optimal_threshold,
        "feature_keys": engine.FEATURE_KEYS,
        "fallback": True
    }


@app.post("/predict/sensor", response_model=FailurePredictionResponse, tags=["Inference"])
async def predict_from_sensor_stream(payload: SensorStreamPayload):
    """
    Extracts 13 time-domain and FFT spectral features from raw sensor readings
    and runs dual-engine ONNX/Scikit-learn inference.
    """
    try:
        extracted = extract_signal_features(payload.sensor_readings)
        res = engine.predict(extracted, optimal_threshold=payload.decision_threshold)

        prob = res["failure_probability"]
        if prob >= 0.70:
            action = "Immediate powertrain shutdown. Bearing spalling or resonant misfire detected on transit."
            cost = 1500000.0  # ₹15,00,000 (Overhaul / recovery)
        elif res["anomaly_detected"]:
            action = "Schedule authorized depot maintenance within 24 operating hours; early mechanical wear pattern detected."
            cost = 85000.0   # ₹85,000 (Subsystem bench service)
        else:
            action = "Telemetry nominal within calibrated operating envelope."
            cost = 15000.0   # ₹15,000 (Routine inspection)

        return FailurePredictionResponse(
            anomaly_detected=res["anomaly_detected"],
            failure_probability=res["failure_probability"],
            decision_threshold=res["decision_threshold"],
            risk_level=res["risk_level"],
            engine=res["engine"],
            features=extracted,
            estimated_intervention_cost=cost,
            recommended_action=action
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        logger.exception("Inference error")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Inference failure: {str(e)}")


@app.post("/predict/features", response_model=FailurePredictionResponse, tags=["Inference"])
async def predict_from_features(payload: FeatureVectorPayload):
    """
    Direct inference on pre-extracted 13-feature vector.
    """
    try:
        res = engine.predict(payload.features, optimal_threshold=payload.decision_threshold)
        prob = res["failure_probability"]
        if prob >= 0.70:
            action = "Immediate powertrain shutdown. Critical failure signature detected."
            cost = 1500000.0
        elif res["anomaly_detected"]:
            action = "Schedule depot maintenance within 24 hours."
            cost = 85000.0
        else:
            action = "Telemetry nominal."
            cost = 15000.0

        return FailurePredictionResponse(
            anomaly_detected=res["anomaly_detected"],
            failure_probability=res["failure_probability"],
            decision_threshold=res["decision_threshold"],
            risk_level=res["risk_level"],
            engine=res["engine"],
            features=payload.features if isinstance(payload.features, dict) else None,
            estimated_intervention_cost=cost,
            recommended_action=action
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        logger.exception("Inference error")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Inference failure: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "5000"))
    uvicorn.run(app, host=host, port=port)

