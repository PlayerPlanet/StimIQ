from __future__ import annotations

import numpy as np


def stable_second_order_mats(freq_hz: float, damping: float) -> tuple[np.ndarray, np.ndarray]:
    omega = 2.0 * np.pi * freq_hz
    a_pos = -(omega ** 2)
    a_vel = -2.0 * damping * omega
    A = np.eye(3) * a_pos
    B = np.eye(3) * a_vel
    return A, B
