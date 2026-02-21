from __future__ import annotations

import numpy as np

from sim.api.base import BrainModel
from sim.api.types import LatentState, PatientParams
from sim.brain.utils import moving_rms


class BGTCSLite(BrainModel):
    """Minimal mean-field inspired oscillator used as a stable backbone."""

    def __init__(
        self,
        natural_freq_hz: float = 5.0,
        damping: float = 1.2,
        coupling: float = 0.8,
        dt_hint: float = 1e-3,
    ) -> None:
        self.natural_freq_hz = natural_freq_hz
        self.damping = damping
        self.coupling = coupling
        self.dt_hint = dt_hint

    def simulate(
        self,
        t: np.ndarray,
        stimulation: np.ndarray,
        patient: PatientParams,
        rng: np.random.Generator,
    ) -> LatentState:
        drive_in = stimulation[:, 0] if stimulation.ndim == 2 else stimulation
        n = t.shape[0]
        z = np.zeros(n, dtype=float)
        v = np.zeros(n, dtype=float)
        omega = 2.0 * np.pi * float(patient.brain.get("natural_freq_hz", self.natural_freq_hz))
        damping = float(patient.brain.get("damping", self.damping))
        coupling = float(patient.brain.get("coupling", self.coupling))

        dt = float(np.mean(np.diff(t))) if n > 1 else self.dt_hint
        for i in range(1, n):
            a = -2.0 * damping * omega * v[i - 1] - (omega ** 2) * z[i - 1] + coupling * drive_in[i - 1]
            v[i] = v[i - 1] + dt * a
            z[i] = z[i - 1] + dt * v[i]

        latent = z[:, None]
        features = {
            "bandpower_proxy": moving_rms(z, max(2, int(0.25 / max(dt, 1e-6)))),
            "drive_in": drive_in,
        }
        return LatentState(t=t, drive=latent, features=features)
