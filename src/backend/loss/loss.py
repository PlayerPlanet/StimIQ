from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any
import sys

import numpy as np

MODEL_PATH = Path(__file__).resolve().with_name("model.pt")
XGBOOST_MODEL_PATH_DEFAULT = (
    Path(__file__).resolve().parents[2] / "sim" / "artifacts" / "loss_model" / "checkpoints" / "xgboost_model.json"
)
WINDOW_SIZE = 256
WINDOW_STRIDE = 128
ROLLOUT_DURATION_S = 300.0  # 5 minutes
BASELINE_CACHE_PATH_DEFAULT = Path(__file__).resolve().parents[1] / "artifacts" / "baseline_rms_cache.json"


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


def _flatten_windows(x: np.ndarray) -> np.ndarray:
    return x.reshape(x.shape[0], -1)


def _xgboost_features(x: np.ndarray, max_fft_bins: int = 96) -> np.ndarray:
    if x.ndim != 3:
        raise ValueError(f"Expected x with shape (N,T,C), got {x.shape}")
    if x.shape[2] != 9:
        raise ValueError(f"Expected 9 IMU channels, got {x.shape[2]}")

    mean = np.mean(x, axis=1)
    std = np.std(x, axis=1)
    rms = np.sqrt(np.mean(np.square(x), axis=1))
    td = np.concatenate([mean, std, rms], axis=1).astype(np.float32)

    t = x.shape[1]
    hann = np.hanning(t).astype(np.float32)[None, :, None]
    xw = x * hann
    spec = np.fft.rfft(xw, axis=1)
    mag = np.log1p(np.abs(spec)).astype(np.float32)
    if max_fft_bins > 0 and mag.shape[1] > max_fft_bins:
        idx = np.linspace(0, mag.shape[1] - 1, num=max_fft_bins, dtype=int)
        mag = mag[:, idx, :]
    fd = mag.reshape(mag.shape[0], -1)
    return np.concatenate([td, fd], axis=1).astype(np.float32)


VALID_BACKENDS = {"cnn", "xgboost", "analytical"}


def _resolve_loss_backend(backend: str | None = None) -> str:
    if backend:
        b = backend.strip().lower()
        if b in VALID_BACKENDS:
            return b
        raise ValueError(f"Unsupported loss backend '{backend}'. Choose from: {VALID_BACKENDS}")

    try:
        from config import get_settings
    except Exception:
        get_settings = None  # type: ignore

    if get_settings is not None:
        b = str(get_settings().loss_model_backend).strip().lower()
        if b in VALID_BACKENDS:
            return b
    return "cnn"


def _resolve_xgboost_model_path() -> Path:
    try:
        from config import get_settings
    except Exception:
        get_settings = None  # type: ignore

    if get_settings is not None:
        p = get_settings().loss_xgboost_model_path
        if p:
            return Path(p)
    return XGBOOST_MODEL_PATH_DEFAULT


def _baseline_cache_enabled() -> bool:
    try:
        from config import get_settings
    except Exception:
        return True
    return bool(get_settings().loss_baseline_cache_enabled)


def _resolve_baseline_cache_path() -> Path:
    try:
        from config import get_settings
    except Exception:
        return BASELINE_CACHE_PATH_DEFAULT

    configured = get_settings().loss_baseline_cache_path
    if configured:
        return Path(configured)
    return BASELINE_CACHE_PATH_DEFAULT


def _load_baseline_cache(path: Path) -> dict[str, float]:
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}
    if not isinstance(data, dict):
        return {}
    out: dict[str, float] = {}
    for k, v in data.items():
        try:
            out[str(k)] = float(v)
        except (TypeError, ValueError):
            continue
    return out


def _save_baseline_cache(path: Path, cache: dict[str, float]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(cache, indent=2, sort_keys=True), encoding="utf-8")


def _baseline_cache_key(patient_id: str, seed: int, n_channels: int, duration_s: float, dt: float) -> str:
    return f"{patient_id}|seed={seed}|ch={n_channels}|dur={duration_s}|dt={dt}"


@lru_cache(maxsize=1)
def _load_model_bundle(model_path: str) -> tuple[Any, np.ndarray, np.ndarray]:
    _ensure_sim_importable()

    try:
        import torch
    except ImportError as exc:
        raise ImportError("torch is required for loss inference") from exc

    from sim.loss_model.models import build_cnn_regressor, build_cnn_regressor_v1

    # Local trusted checkpoint may include numpy objects (norm stats),
    # which requires full pickle loading on torch>=2.6.
    payload = torch.load(model_path, map_location="cpu", weights_only=False)

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
            try:
                model.load_state_dict(state_dict)
            except RuntimeError:
                # Backward compatibility for checkpoints trained with the older CNN.
                model = build_cnn_regressor_v1()
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


@lru_cache(maxsize=1)
def _load_xgboost_model(model_path: str) -> Any:
    try:
        import xgboost as xgb
    except ImportError as exc:
        raise ImportError("xgboost is required for LOSS_MODEL_BACKEND=xgboost") from exc

    model = xgb.XGBRegressor()
    model.load_model(model_path)
    return model


def _acc_rms(simulated: Any) -> float:
    """Root-mean-square of accelerometer magnitude across all axes and time."""
    return float(np.sqrt(np.mean(simulated.acc ** 2, dtype=np.float64)))


def calculate_loss(parameters: Any, backend: str | None = None, patient_id: str | None = None) -> float:
    """Compute a scalar loss for the given stimulation parameter matrix.

    Backends
    --------
    analytical
        Runs two simulations (zero-stim baseline + stim) with identical noise
        realisations.  Returns the normalised tremor suppression mapped to
        [-1, 1] via::

            loss = 1 - 2 * clamp(suppression_ratio, 0, 1)

        where ``suppression_ratio = (rms_baseline - rms_stim) / rms_baseline``.
        Perfect suppression → −1.  No effect → 0.  Worsening → up to +1.

    cnn / xgboost
        Scores IMU windows with the pre-trained model (original behaviour).
    """
    _ensure_sim_importable()

    from sim.api.types import StimParams
    from sim.cohort.sampling import sample_patient_params
    from sim.config.runtime import load_config
    from sim.factory import build_rollout_config, build_simulator

    param_matrix = _to_parameter_matrix(parameters)

    cfg = load_config(overrides=[f"rollout.duration_s={ROLLOUT_DURATION_S}"])
    rollout_cfg = build_rollout_config(cfg)
    simulator = build_simulator(cfg)

    seed = int(cfg.seed)
    rng = np.random.default_rng(seed)
    patient = sample_patient_params(rng, n=1)[0]

    loss_backend = _resolve_loss_backend(backend=backend)

    # ── analytical backend ────────────────────────────────────────────────────
    if loss_backend == "analytical":
        stim = StimParams.from_matrix(param_matrix)
        zero_stim = StimParams(
            amp=np.zeros(stim.n_channels),
            freq=stim.freq.copy(),
            pw=stim.pw.copy(),
            phase=stim.phase.copy(),
        )
        # Use the same noise seed for both runs so only the stim params differ.
        sim_seed = seed + 1
        rms_baseline: float | None = None
        cache_path: Path | None = None
        cache_key: str | None = None

        if patient_id and _baseline_cache_enabled():
            cache_path = _resolve_baseline_cache_path()
            cache_key = _baseline_cache_key(
                patient_id=patient_id,
                seed=seed,
                n_channels=stim.n_channels,
                duration_s=float(rollout_cfg.duration_s),
                dt=float(rollout_cfg.dt),
            )
            cached = _load_baseline_cache(cache_path)
            rms_baseline = cached.get(cache_key)

        if rms_baseline is None:
            rms_baseline = _acc_rms(
                simulator.run(
                    stim_params=zero_stim,
                    patient=patient,
                    config=rollout_cfg,
                    rng=np.random.default_rng(sim_seed),
                )
            )
            if cache_path is not None and cache_key is not None:
                cached = _load_baseline_cache(cache_path)
                cached[cache_key] = float(rms_baseline)
                _save_baseline_cache(cache_path, cached)

        rms_stim = _acc_rms(
            simulator.run(stim_params=stim, patient=patient,
                          config=rollout_cfg, rng=np.random.default_rng(sim_seed))
        )
        if rms_baseline < 1e-12:
            return 0.0
        suppression = (rms_baseline - rms_stim) / rms_baseline
        suppression = float(np.clip(suppression, 0.0, 1.0))
        return 1.0 - 2.0 * suppression

    # ── model-based backends (cnn / xgboost) ─────────────────────────────────
    stim = StimParams.from_matrix(param_matrix)
    simulated = simulator.run(stim_params=stim, patient=patient, config=rollout_cfg, rng=rng)

    imu_9ch = np.concatenate([simulated.pos, simulated.vel, simulated.acc], axis=1).astype(np.float32)
    windows = _make_windows(imu_9ch)

    if loss_backend == "xgboost":
        xgb_path = _resolve_xgboost_model_path()
        if not xgb_path.exists():
            raise FileNotFoundError(f"XGBoost model file not found: {xgb_path}")
        model = _load_xgboost_model(str(xgb_path))
        pred = np.asarray(model.predict(_xgboost_features(windows)), dtype=np.float32)
        pred = np.tanh(pred)
    else:  # cnn
        try:
            import torch
        except ImportError as exc:
            raise ImportError("torch is required for cnn loss inference") from exc
        if not MODEL_PATH.exists():
            raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")
        model, norm_mean, norm_std = _load_model_bundle(str(MODEL_PATH))
        windows_norm = (windows - norm_mean) / norm_std
        x = torch.from_numpy(np.transpose(windows_norm, (0, 2, 1)))
        with torch.inference_mode():
            pred = model(x).detach().cpu().numpy().reshape(-1)

    return float(np.mean(pred, dtype=np.float64))
