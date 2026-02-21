from __future__ import annotations

import numpy as np


def moving_rms(x: np.ndarray, window: int) -> np.ndarray:
    window = max(1, int(window))
    sq = x ** 2
    kernel = np.ones(window) / window
    return np.sqrt(np.convolve(sq, kernel, mode="same"))
