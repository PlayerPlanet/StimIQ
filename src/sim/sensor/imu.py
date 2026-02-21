from __future__ import annotations

import numpy as np

from sim.api.base import MeasurementModel
from sim.api.types import KinematicState, MeasurementOutput, PatientParams, RolloutConfig
from sim.sensor.noise import GaussianNoiseModel


class IMUModel(MeasurementModel):
    def __init__(self, noise_std: float = 0.02, bias_std: float = 0.01, drift_per_s: float = 0.001) -> None:
        self.noise = GaussianNoiseModel(noise_std)
        self.bias_std = bias_std
        self.drift_per_s = drift_per_s

    def observe(
        self,
        kin: KinematicState,
        config: RolloutConfig,
        patient: PatientParams,
        rng: np.random.Generator,
    ) -> MeasurementOutput:
        t = kin.t
        target_dt = 1.0 / config.imu_sample_rate_hz
        idx = np.arange(0, t.shape[0], max(1, int(round(target_dt / config.dt))))

        pos = kin.pos[idx].copy()
        vel = kin.vel[idx].copy()
        acc = kin.acc[idx].copy()
        out_t = t[idx]

        if config.include_noise:
            noise_std = float(patient.sensor.get("noise_std", self.noise.std))
            bias_std = float(patient.sensor.get("bias_std", self.bias_std))
            drift = float(patient.sensor.get("drift_per_s", self.drift_per_s))

            bias = rng.normal(0.0, bias_std, size=(1, 3))
            drift_trace = (out_t[:, None] - out_t[0]) * drift

            pos += self.noise.sample(pos.shape, rng, noise_std) + bias + drift_trace
            vel += self.noise.sample(vel.shape, rng, noise_std)
            acc += self.noise.sample(acc.shape, rng, noise_std)

        return MeasurementOutput(
            t=out_t,
            pos=pos,
            vel=vel,
            acc=acc,
            meta={
                "schema_version": config.schema_version,
                "sample_rate_hz": config.imu_sample_rate_hz,
                "n_samples": int(out_t.shape[0]),
            },
        )
