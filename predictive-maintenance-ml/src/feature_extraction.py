"""
Predictive Maintenance - Time & Frequency Domain Feature Extraction
===================================================================
Extracts statistical moments and spectral features from multi-channel
vibration, pressure, and accelerometer sensor streams.
"""

from __future__ import annotations

from typing import Dict, List, Union
import numpy as np
import pandas as pd
from scipy import stats


def extract_signal_features(sig: np.ndarray) -> Dict[str, float]:
    """
    Extracts comprehensive time-domain and frequency-domain features from a 1D sensor signal.
    Hardened against sensor dropouts, packet drops, NaNs, and infinite bursts.
    
    Parameters:
        sig (np.ndarray): 1D continuous sensor readings array.
        
    Returns:
        Dict[str, float]: Sanitized statistical and spectral indicators.
    """
    # Enforce float64 array and robust imputation for packet dropouts
    sig_arr = np.asarray(sig, dtype=np.float64)
    sig_clean = np.nan_to_num(sig_arr, nan=0.0, posinf=1.0, neginf=-1.0)
    
    # Baseline de-meaning
    norm_sig = sig_clean - np.mean(sig_clean)

    # 1. Time-Domain Statistical Moments
    rms = float(np.sqrt(np.mean(norm_sig**2))) + 1e-8
    peak = float(np.max(np.abs(norm_sig))) if len(norm_sig) > 0 else 0.0
    ptp = float(np.ptp(norm_sig)) if len(norm_sig) > 0 else 0.0
    variance = float(np.var(norm_sig))
    mean_abs = float(np.mean(np.abs(norm_sig))) + 1e-8

    # Dimensionless ratios (sensitive to bearing spalling and impact degradation)
    crest_factor = peak / rms
    shape_factor = rms / mean_abs
    impulse_factor = peak / mean_abs
    margin_factor = peak / (float(np.mean(np.sqrt(np.abs(norm_sig))))**2 + 1e-8)

    # Higher-order statistical moments
    skewness = float(stats.skew(norm_sig)) if len(norm_sig) > 2 else 0.0
    kurtosis = float(stats.kurtosis(norm_sig)) if len(norm_sig) > 3 else 0.0 # Fisher's excess kurtosis

    # 2. Frequency-Domain Spectral Indicators (via FFT)
    n = max(len(norm_sig), 1)
    fft_vals = np.abs(np.fft.rfft(norm_sig))
    fft_freqs = np.fft.rfftfreq(n, d=1.0 / 300.0) # 300Hz sampling baseline

    spectral_energy = float(np.sum(fft_vals**2) / (n + 1e-8))
    sum_fft = float(np.sum(fft_vals)) + 1e-8
    spectral_centroid = float(np.sum(fft_freqs * fft_vals) / sum_fft)
    spectral_spread = float(np.sqrt(np.sum(((fft_freqs - spectral_centroid)**2) * fft_vals) / sum_fft))

    raw_features = {
        "rms": rms,
        "peak_to_peak": ptp,
        "crest_factor": crest_factor,
        "variance": variance,
        "mean_abs": mean_abs,
        "shape_factor": shape_factor,
        "impulse_factor": impulse_factor,
        "margin_factor": margin_factor,
        "skewness": skewness,
        "kurtosis": kurtosis,
        "spectral_energy": spectral_energy,
        "spectral_centroid": spectral_centroid,
        "spectral_spread": spectral_spread,
    }

    # Final sanitization pass: zero-impute any NaN or infinite moments
    sanitized = {}
    for k, v in raw_features.items():
        val = float(np.nan_to_num(v, nan=0.0, posinf=1.0, neginf=-1.0))
        sanitized[k] = round(val, 5)

    return sanitized


def extract_batch_features(signals: Union[np.ndarray, List[List[float]]]) -> pd.DataFrame:
    """
    Extracts features across a batch (2D matrix) of time-series signals.
    Shape: (n_samples, timesteps) -> DataFrame with shape (n_samples, n_features).
    """
    signals = np.asarray(signals, dtype=np.float64)
    rows = [extract_signal_features(sig) for sig in signals]
    return pd.DataFrame(rows)


if __name__ == "__main__":
    # Self-test with sample synthetic vibration wave
    t = np.linspace(0, 1, 300)
    sample_wave = 1.2 * np.sin(2 * np.pi * 60 * t) + np.random.normal(0, 0.2, len(t))
    feats = extract_signal_features(sample_wave)
    print("Self-test Feature Extraction:")
    for k, v in feats.items():
        print(f"  {k:20s}: {v}")

