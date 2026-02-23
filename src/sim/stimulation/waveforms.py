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
    if t.size == 0:
        return np.zeros_like(t)
    if t.size == 1:
        period = 1.0 / freq_hz
        shifted = (t + phase / (2.0 * np.pi * freq_hz)) % period
        return np.where(shifted < pulse_width_s, amp, 0.0)

    period = 1.0 / freq_hz
    width = float(np.clip(pulse_width_s, 0.0, period))
    if width <= 0.0:
        return np.zeros_like(t)
    if width >= period:
        return np.full_like(t, amp, dtype=float)

    # Area-preserving sample model: each output sample is the fraction of time
    # "ON" inside its [t_i - dt/2, t_i + dt/2] interval.
    dt = float(np.mean(np.diff(t)))
    tau = float(phase) / (2.0 * np.pi * freq_hz)
    a = t + tau - 0.5 * dt
    b = a + dt

    # Shift to positive domain by whole periods so periodic integral can be used.
    shift_periods = 0.0
    min_a = float(np.min(a))
    if min_a < 0.0:
        shift_periods = float(np.ceil((-min_a) / period) + 1.0) * period
    ap = a + shift_periods
    bp = b + shift_periods

    def _periodic_on_integral_pos(x: np.ndarray, p: float, w: float) -> np.ndarray:
        k = np.floor(x / p)
        r = x - k * p
        return k * w + np.minimum(r, w)

    on_time = _periodic_on_integral_pos(bp, period, width) - _periodic_on_integral_pos(ap, period, width)
    frac_on = np.clip(on_time / dt, 0.0, 1.0)
    return amp * frac_on


def smooth_rectified_sinusoid(t: np.ndarray, amp: float, freq_hz: float, phase: float) -> np.ndarray:
    base = np.sin(2.0 * np.pi * freq_hz * t + phase)
    return amp * np.maximum(base, 0.0)
