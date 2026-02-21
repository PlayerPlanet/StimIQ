from __future__ import annotations

import numpy as np


def sinusoid(t: np.ndarray, amp: float, freq_hz: float, phase: float) -> np.ndarray:
    return amp * np.sin(2.0 * np.pi * freq_hz * t + phase)


def square_pulse_train(
    t: np.ndarray,
    amp: float,
    freq_hz: float,
    pulse_width_s: float,
    phase: float,
) -> np.ndarray:
    if freq_hz <= 0.0:
        return np.zeros_like(t)
    period = 1.0 / freq_hz
    shifted = (t + phase / (2.0 * np.pi * freq_hz)) % period
    return np.where(shifted < pulse_width_s, amp, 0.0)


def smooth_rectified_sinusoid(t: np.ndarray, amp: float, freq_hz: float, phase: float) -> np.ndarray:
    base = np.sin(2.0 * np.pi * freq_hz * t + phase)
    return amp * np.maximum(base, 0.0)
