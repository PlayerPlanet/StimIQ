from __future__ import annotations


def positive(x: float, minimum: float = 1e-6) -> float:
    return max(float(x), minimum)


def clamp(x: float, lo: float, hi: float) -> float:
    return min(max(float(x), lo), hi)


def stable_damping(x: float) -> float:
    return clamp(x, 0.05, 3.0)
