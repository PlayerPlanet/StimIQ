from __future__ import annotations

import numpy as np


def check_finite(arr: np.ndarray, name: str) -> None:
    if not np.all(np.isfinite(arr)):
        raise ValueError(f"{name} contains non-finite values")


def check_energy_bound(pos: np.ndarray, vel: np.ndarray, bound: float = 1e6) -> None:
    energy = float(np.mean(np.sum(pos**2 + vel**2, axis=1)))
    if energy > bound:
        raise ValueError(f"Trajectory energy too high: {energy}")
