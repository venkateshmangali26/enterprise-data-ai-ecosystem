"""
Predictive Maintenance Inference Engine - Resilient ONNX / Scikit-Learn Fallback
================================================================================
Executes edge automotive telemetry inference with dual-engine fallback:
  1. Primary: High-throughput ONNX Runtime (C++ acceleration, cross-platform)
  2. Fallback: Native Scikit-Learn Pipeline (StandardScaler + GradientBoosting)
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union
import joblib
import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("mlops-inference")


class ResilientMaintenanceInferenceEngine:
    """
    Dual-engine failure predictor:
      - Tries ONNX Runtime first for maximum performance.
      - Automatically falls back to Scikit-Learn pipeline on runtime or hardware failure.
      - Automatically loads and applies the cost-optimized decision threshold from model_metadata.json.
    """

    FEATURE_KEYS = [
        "rms", "peak_to_peak", "crest_factor", "variance", "mean_abs",
        "shape_factor", "impulse_factor", "margin_factor", "skewness",
        "kurtosis", "spectral_energy", "spectral_centroid", "spectral_spread"
    ]

    def __init__(self, models_dir: Optional[Path] = None):
        if models_dir is None:
            models_dir = Path(__file__).resolve().parent.parent / "models"
        self.models_dir = Path(models_dir)

        self.onnx_path = self.models_dir / "engine_failure_model.onnx"
        self.pipeline_path = self.models_dir / "predictive_maintenance_pipeline.joblib"
        self.metadata_path = self.models_dir / "model_metadata.json"

        self.ort_session = None
        self.input_name = None
        self.sklearn_pipeline = None
        self.optimal_threshold: float = 0.08  # Default fallback if metadata not present

        self._load_models()
        self._load_metadata()

    def _load_metadata(self):
        """Loads cost-optimized threshold and feature specifications from training metadata."""
        if self.metadata_path.exists():
            try:
                with open(self.metadata_path, "r") as f:
                    meta = json.load(f)
                    self.optimal_threshold = float(meta.get("optimal_threshold", 0.08))
                    logger.info(f"Loaded calibrated optimal decision threshold: {self.optimal_threshold:.4f}")
            except Exception as e:
                logger.warning(f"Failed to read model metadata ({e}); using default threshold {self.optimal_threshold}")
        else:
            logger.info(f"Metadata file {self.metadata_path} not found; using default threshold {self.optimal_threshold}")

    def _load_models(self):
        # 1. Load Scikit-Learn Fallback Pipeline
        if self.pipeline_path.exists():
            try:
                self.sklearn_pipeline = joblib.load(self.pipeline_path)
                logger.info("Loaded Scikit-Learn pipeline fallback successfully.")
            except Exception as e:
                logger.warning(f"Could not load Scikit-Learn pipeline ({e}).")
        else:
            logger.warning(f"Scikit-Learn pipeline not found at {self.pipeline_path}.")

        # 2. Attempt ONNX Runtime Session initialization
        if self.onnx_path.exists():
            try:
                import onnxruntime as ort
                self.ort_session = ort.InferenceSession(str(self.onnx_path))
                self.input_name = self.ort_session.get_inputs()[0].name
                logger.info("Initialized primary ONNX Runtime inference session.")
            except Exception as e:
                logger.warning(f"ONNX Runtime initialization failed ({e}); operating in Scikit-Learn fallback mode.")
                self.ort_session = None
        else:
            logger.warning(f"ONNX model not found at {self.onnx_path}; relying on Scikit-Learn fallback.")

    def predict(
        self,
        feature_vector: Union[List[float], np.ndarray, Dict[str, float]],
        optimal_threshold: Optional[float] = None
    ) -> Dict[str, Union[int, float, str, bool]]:
        """
        Runs dual-engine inference with automatic failover and strict input validation.
        """
        threshold = self.optimal_threshold if optimal_threshold is None else optimal_threshold

        # Strict input validation and dimensional checks
        if isinstance(feature_vector, dict):
            missing = [k for k in self.FEATURE_KEYS if k not in feature_vector]
            if missing:
                raise ValueError(f"Missing required feature keys: {missing}")
            arr = np.array([[feature_vector[k] for k in self.FEATURE_KEYS]], dtype=np.float32)
        else:
            arr = np.asarray(feature_vector, dtype=np.float32)
            if arr.ndim == 1:
                arr = arr.reshape(1, -1)
            if arr.ndim != 2 or arr.shape[1] != len(self.FEATURE_KEYS):
                raise ValueError(
                    f"Expected input shape (n, {len(self.FEATURE_KEYS)}), "
                    f"received {arr.shape}"
                )
            if not np.isfinite(arr).all():
                raise ValueError("Input contains NaN or infinite values.")

        # Extra safety sanitization pass
        arr = np.nan_to_num(arr, nan=0.0, posinf=1.0, neginf=-1.0)

        engine_used = "onnx"
        failure_prob: float = 0.0

        # Attempt ONNX Runtime execution
        if self.ort_session is not None:
            try:
                inputs = {self.input_name: arr}
                outputs = self.ort_session.run(None, inputs)
                if len(outputs) > 1 and isinstance(outputs[1], list) and isinstance(outputs[1][0], dict):
                    failure_prob = float(outputs[1][0].get(1, 0.0))
                elif len(outputs) > 1 and isinstance(outputs[1], np.ndarray):
                    failure_prob = float(outputs[1][0, 1]) if outputs[1].shape[1] > 1 else float(outputs[1][0, 0])
                else:
                    pred_class = int(outputs[0][0])
                    failure_prob = 1.0 if pred_class == 1 else 0.0
            except Exception as e:
                logger.warning(f"ONNX inference failed ({e}); falling back to native scikit-learn model.")
                engine_used = "sklearn_fallback"
                failure_prob = self._predict_sklearn(arr)
        else:
            engine_used = "sklearn"
            failure_prob = self._predict_sklearn(arr)

        is_anomaly = bool(failure_prob >= threshold)

        return {
            "anomaly_detected": is_anomaly,
            "failure_probability": round(failure_prob, 4),
            "decision_threshold": round(threshold, 4),
            "engine": engine_used,
            "risk_level": "CRITICAL" if failure_prob >= 0.7 else "ELEVATED" if is_anomaly else "NOMINAL"
        }

    def _predict_sklearn(self, arr: np.ndarray) -> float:
        if self.sklearn_pipeline is None:
            raise RuntimeError("Both ONNX and Scikit-Learn inference engines are unavailable.")
        probs = self.sklearn_pipeline.predict_proba(arr)
        return float(probs[0, 1])


if __name__ == "__main__":
    engine = ResilientMaintenanceInferenceEngine()
    sample_feats = {
        "rms": 1.45, "peak_to_peak": 4.2, "crest_factor": 2.89, "variance": 0.88,
        "mean_abs": 1.12, "shape_factor": 1.29, "impulse_factor": 3.75, "margin_factor": 4.10,
        "skewness": 0.45, "kurtosis": 5.12, "spectral_energy": 142.0, "spectral_centroid": 88.5,
        "spectral_spread": 42.1
    }
    result = engine.predict(sample_feats)
    print("Dual-Engine Inference Verification:", result)
