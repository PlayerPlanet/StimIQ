from __future__ import annotations

import numpy as np


class GaussianNoiseModel:
    def __init__(self, std: float = 0.02) -> None:
        self.std = std

    def sample(self, shape: tuple[int, ...], rng: np.random.Generator, std: float | None = None) -> np.ndarray:
        sigma = self.std if std is None else float(std)
        return rng.normal(0.0, sigma, size=shape)
