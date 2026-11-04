"""
Predictive Maintenance Engine - Model Export to ONNX Runtime
============================================================
Converts the trained Scikit-learn Pipeline (StandardScaler + GradientBoostingClassifier)
into a unified, cross-platform ONNX pipeline for edge automotive inference.
"""

from __future__ import annotations

import sys
from pathlib import Path
import joblib
import numpy as np


def export_model_to_onnx():
    base_dir = Path(__file__).resolve().parent.parent
    models_dir = base_dir / "models"
    pipeline_path = models_dir / "predictive_maintenance_pipeline.joblib"
    onnx_output = models_dir / "engine_failure_model.onnx"

    if not pipeline_path.exists():
        print(f"Error: Pipeline artifact not found at {pipeline_path}. Run src/train.py first.")
        sys.exit(1)

    try:
        from skl2onnx import convert_sklearn
        from skl2onnx.common.data_types import FloatTensorType
        import onnxruntime as ort
    except ImportError:
        print("Note: skl2onnx or onnxruntime not installed in environment.")
        print("Install via: pip install skl2onnx onnxruntime")
        return

    print("Loading Scikit-learn end-to-end pipeline...")
    pipeline = joblib.load(pipeline_path)

    # 13 unscaled statistical and spectral features input directly
    initial_type = [("float_input", FloatTensorType([None, 13]))]

    print("Converting full pipeline (Scaler + GradientBoosting) to ONNX format...")
    onnx_model = convert_sklearn(pipeline, initial_types=initial_type, target_opset=12)

    with open(onnx_output, "wb") as f:
        f.write(onnx_model.SerializeToString())
    print(f"ONNX Model saved successfully to: {onnx_output}")

    # Verification run with ONNX Runtime
    print("Verifying inference via ONNX Runtime...")
    session = ort.InferenceSession(str(onnx_output))
    sample_input = np.random.randn(1, 13).astype(np.float32)
    inputs = {session.get_inputs()[0].name: sample_input}
    outputs = session.run(None, inputs)
    print(f"Inference verified! Output shape: {outputs[0].shape} (Predicted Class: {outputs[0][0]})")


if __name__ == "__main__":
    export_model_to_onnx()
