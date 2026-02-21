from __future__ import annotations

import numpy as np
from omegaconf import DictConfig

from sim.api.types import RolloutConfig, StimParams
from sim.brain.bgtcs_meanfield import BGTCSLite
from sim.periphery.springmass_6dof import SpringMass3D
from sim.sensor.imu import IMUModel
from sim.simulator import Simulator
from sim.stimulation.encoding import WaveformEncoder


def build_rollout_config(cfg: DictConfig) -> RolloutConfig:
    return RolloutConfig(
        dt=float(cfg.rollout.dt),
        duration_s=float(cfg.rollout.duration_s),
        imu_sample_rate_hz=float(cfg.rollout.imu_sample_rate_hz),
        include_noise=bool(cfg.rollout.include_noise),
        schema_version=str(cfg.schema_version),
    )


def build_stim_params(cfg: DictConfig) -> StimParams:
    matrix = np.asarray(cfg.stimulation.matrix, dtype=float)
    return StimParams.from_matrix(matrix)


def build_simulator(cfg: DictConfig) -> Simulator:
    brain = BGTCSLite(
        natural_freq_hz=float(cfg.brain.natural_freq_hz),
        damping=float(cfg.brain.damping),
        coupling=float(cfg.brain.coupling),
    )
    periphery = SpringMass3D(
        freq_hz=float(cfg.periphery.freq_hz),
        damping=float(cfg.periphery.damping),
        gain=float(cfg.periphery.gain),
    )
    measurement = IMUModel(
        noise_std=float(cfg.noise.noise_std),
        bias_std=float(cfg.noise.bias_std),
        drift_per_s=float(cfg.noise.drift_per_s),
    )
    encoder = WaveformEncoder(reduction=str(cfg.encoder.reduction))
    return Simulator(encoder=encoder, brain=brain, periphery=periphery, measurement=measurement)
