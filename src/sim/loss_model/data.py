from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np


@dataclass(frozen=True)
class SplitData:
    x_train: np.ndarray
    y_train: np.ndarray
    x_val: np.ndarray
    y_val: np.ndarray
    x_test: np.ndarray
    y_test: np.ndarray


def load_window_dataset(path: str | Path, x_key: str = "X", y_key: str = "y") -> tuple[np.ndarray, np.ndarray]:
    src = Path(path)
    if not src.exists():
        raise FileNotFoundError(f"Dataset not found: {src}")

    if src.suffix.lower() == ".npz":
        arr = np.load(src, allow_pickle=False)
        if x_key not in arr or y_key not in arr:
            raise KeyError(f"NPZ must contain keys '{x_key}' and '{y_key}'")
        x = np.asarray(arr[x_key], dtype=np.float32)
        y = np.asarray(arr[y_key], dtype=np.float32).reshape(-1)
    else:
        raise ValueError("Only .npz datasets are supported in v1. Expected arrays X:(N,T,9), y:(N,).")

    if x.ndim != 3:
        raise ValueError(f"X must be rank-3 (N,T,C). Got shape {x.shape}")
    if x.shape[2] != 9:
        raise ValueError(f"X channel dimension must be 9. Got {x.shape[2]}")
    if y.ndim != 1:
        raise ValueError(f"y must be rank-1. Got shape {y.shape}")
    if x.shape[0] != y.shape[0]:
        raise ValueError(f"X/y sample mismatch: {x.shape[0]} != {y.shape[0]}")

    return x, np.clip(y, -1.0, 1.0)


def split_dataset(
    x: np.ndarray,
    y: np.ndarray,
    train_ratio: float = 0.7,
    val_ratio: float = 0.15,
    seed: int = 7,
) -> SplitData:
    if train_ratio <= 0.0 or val_ratio <= 0.0 or (train_ratio + val_ratio) >= 1.0:
        raise ValueError("Require 0 < train_ratio, val_ratio and train_ratio + val_ratio < 1")

    n = x.shape[0]
    if n < 10:
        raise ValueError("Need at least 10 samples for a stable train/val/test split")

    rng = np.random.default_rng(seed)
    idx = rng.permutation(n)
    n_train = int(round(train_ratio * n))
    n_val = int(round(val_ratio * n))
    n_test = n - n_train - n_val
    if n_test <= 0:
        raise ValueError("Split produced empty test set")

    i_train = idx[:n_train]
    i_val = idx[n_train : n_train + n_val]
    i_test = idx[n_train + n_val :]
    return SplitData(
        x_train=x[i_train],
        y_train=y[i_train],
        x_val=x[i_val],
        y_val=y[i_val],
        x_test=x[i_test],
        y_test=y[i_test],
    )
