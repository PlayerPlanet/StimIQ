from __future__ import annotations

import numpy as np

from sim.api.base import PeripheryTransducer
from sim.api.types import KinematicState, LatentState, PatientParams
from sim.periphery.mixins import stable_second_order_mats


class SpringMass3D(PeripheryTransducer):
    def __init__(self, freq_hz: float = 4.5, damping: float = 0.7, gain: float = 1.0) -> None:
        self.freq_hz = freq_hz
        self.damping = damping
        self.gain = gain

    def simulate(
        self,
        latent: LatentState,
        patient: PatientParams,
        dt: float,
        rng: np.random.Generator,
    ) -> KinematicState:
        t = latent.t
        n = t.shape[0]
        pos = np.zeros((n, 3), dtype=float)
        vel = np.zeros((n, 3), dtype=float)
        acc = np.zeros((n, 3), dtype=float)

        freq = float(patient.periphery.get("freq_hz", self.freq_hz))
        damping = float(patient.periphery.get("damping", self.damping))
        gain = float(patient.periphery.get("gain", self.gain))
        A, B = stable_second_order_mats(freq_hz=freq, damping=max(damping, 1e-4))
        mix = np.asarray(patient.periphery.get("mix", [1.0, 0.6, 0.3]), dtype=float)
        mix = mix[:3] if mix.shape[0] >= 3 else np.pad(mix, (0, 3 - mix.shape[0]), constant_values=0.1)

        drive = latent.drive[:, 0]
        for i in range(1, n):
            forcing = gain * mix * drive[i - 1]
            acc[i - 1] = A @ pos[i - 1] + B @ vel[i - 1] + forcing
            vel[i] = vel[i - 1] + dt * acc[i - 1]
            pos[i] = pos[i - 1] + dt * vel[i]
        acc[-1] = acc[-2] if n > 1 else 0.0

        return KinematicState(t=t, pos=pos, vel=vel, acc=acc)
