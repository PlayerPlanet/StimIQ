from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import numpy as np


@dataclass(frozen=True)
class StimParams:
    amp: np.ndarray
    freq: np.ndarray
    pw: np.ndarray
    phase: np.ndarray

    def __post_init__(self) -> None:
        n = self.amp.shape[0]
        if any(arr.shape != (n,) for arr in (self.freq, self.pw, self.phase)):
            raise ValueError("amp/freq/pw/phase must all have shape (N,)")

    @property
    def n_channels(self) -> int:
        return int(self.amp.shape[0])

    def as_matrix(self) -> np.ndarray:
        return np.vstack([self.amp, self.freq, self.pw, self.phase])

    @classmethod
    def from_matrix(cls, params: np.ndarray) -> "StimParams":
        arr = np.asarray(params, dtype=float)
        if arr.ndim != 2 or arr.shape[0] != 4:
            raise ValueError("Stim params must have shape (4, N)")
        return cls(amp=arr[0], freq=arr[1], pw=arr[2], phase=arr[3])


@dataclass(frozen=True)
class RolloutConfig:
    dt: float = 0.001
    duration_s: float = 10.0
    imu_sample_rate_hz: float = 100.0
    include_noise: bool = True
    schema_version: str = "sim.v1"

    @property
    def n_steps(self) -> int:
        return int(np.floor(self.duration_s / self.dt)) + 1

    @property
    def t(self) -> np.ndarray:
        return np.linspace(0.0, self.duration_s, self.n_steps)


@dataclass(frozen=True)
class PatientParams:
    brain: dict[str, float] = field(default_factory=dict)
    periphery: dict[str, float] = field(default_factory=dict)
    sensor: dict[str, float] = field(default_factory=dict)


@dataclass(frozen=True)
class LatentState:
    t: np.ndarray
    drive: np.ndarray
    features: dict[str, np.ndarray] = field(default_factory=dict)


@dataclass(frozen=True)
class KinematicState:
    t: np.ndarray
    pos: np.ndarray
    vel: np.ndarray
    acc: np.ndarray


@dataclass(frozen=True)
class MeasurementOutput:
    t: np.ndarray
    pos: np.ndarray
    vel: np.ndarray
    acc: np.ndarray
    meta: dict[str, Any] = field(default_factory=dict)
