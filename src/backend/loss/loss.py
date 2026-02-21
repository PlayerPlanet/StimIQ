from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any
import sys

import numpy as np

MODEL_PATH = Path(__file__).resolve().with_name("model.pt")
WINDOW_SIZE = 256
WINDOW_STRIDE = 128
ROLLOUT_DURATION_S = 300.0  # 5 minutes


def _ensure_sim_importable() -> None:
    sim_src = Path(__file__).resolve().parents[2] / "sim"
    sim_src_str = str(sim_src)
    if sim_src_str not in sys.path:
        sys.path.insert(0, sim_src_str)


def _to_parameter_matrix(parameters: Any) -> np.ndarray:
    matrix = np.asarray(parameters, dtype=np.float64)
    if matrix.ndim != 2 or matrix.shape[0] != 4:
        raise ValueError(f"Expected parameters with shape (4, N), got {matrix.shape}")
    if matrix.shape[1] == 0:
        raise ValueError("Expected parameters with at least one channel (N > 0)")
    return matrix


def _make_windows(x: np.ndarray, window: int = WINDOW_SIZE, stride: int = WINDOW_STRIDE) -> np.ndarray:
    if x.ndim != 2 or x.shape[1] != 9:
        raise ValueError(f"Expected simulated matrix with shape (T, 9), got {x.shape}")
    if x.shape[0] < window:
        raise ValueError(f"Need at least {window} samples, got {x.shape[0]}")

    chunks = [x[start : start + window] for start in range(0, x.shape[0] - window + 1, stride)]
    return np.stack(chunks, axis=0).astype(np.float32)


@lru_cache(maxsize=1)
def _load_model_bundle(model_path: str) -> tuple[Any, np.ndarray, np.ndarray]:
    _ensure_sim_importable()

    try:
        import torch
    except ImportError as exc:
        raise ImportError("torch is required for loss inference") from exc

    from sim.loss_model.models import build_cnn_regressor

    payload = torch.load(model_path, map_location="cpu")

    model = build_cnn_regressor()
    norm_mean = np.zeros((1, 1, 9), dtype=np.float32)
    norm_std = np.ones((1, 1, 9), dtype=np.float32)

    if isinstance(payload, dict):
        state_dict = None
        if "model_state_dict" in payload:
            state_dict = payload["model_state_dict"]
        elif "state_dict" in payload:
            state_dict = payload["state_dict"]

        if state_dict is not None:
            model.load_state_dict(state_dict)

        if "norm_mean" in payload and "norm_std" in payload:
            norm_mean = np.asarray(payload["norm_mean"], dtype=np.float32)
            norm_std = np.asarray(payload["norm_std"], dtype=np.float32)
    elif hasattr(payload, "state_dict"):
        model = payload
    else:
        raise ValueError("Unsupported model checkpoint format")

    norm_std = np.where(norm_std < 1e-6, 1.0, norm_std)
    model.eval()
    return model, norm_mean, norm_std


def calculate_loss(parameters: Any) -> float:
    _ensure_sim_importable()

    try:
        import torch
    except ImportError as exc:
        raise ImportError("torch is required for loss inference") from exc

    from sim.api.types import StimParams
    from sim.cohort.sampling import sample_patient_params
    from sim.config.runtime import load_config
    from sim.factory import build_rollout_config, build_simulator

    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")

    param_matrix = _to_parameter_matrix(parameters)

    cfg = load_config(overrides=[f"rollout.duration_s={ROLLOUT_DURATION_S}"])
    rollout_cfg = build_rollout_config(cfg)
    simulator = build_simulator(cfg)

    seed = int(cfg.seed)
    rng = np.random.default_rng(seed)
    patient = sample_patient_params(rng, n=1)[0]

    stim = StimParams.from_matrix(param_matrix)
    simulated = simulator.run(stim_params=stim, patient=patient, config=rollout_cfg, rng=rng)

    imu_9ch = np.concatenate([simulated.pos, simulated.vel, simulated.acc], axis=1).astype(np.float32)
    windows = _make_windows(imu_9ch)

    model, norm_mean, norm_std = _load_model_bundle(str(MODEL_PATH))
    windows_norm = (windows - norm_mean) / norm_std

    x = torch.from_numpy(np.transpose(windows_norm, (0, 2, 1)))
    with torch.inference_mode():
        pred = model(x).detach().cpu().numpy().reshape(-1)

    return float(np.mean(pred, dtype=np.float64))
