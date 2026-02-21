from __future__ import annotations

import numpy as np

from sim.api.base import BrainModel, MeasurementModel, PeripheryTransducer, StimulationEncoder
from sim.api.types import MeasurementOutput, PatientParams, RolloutConfig, StimParams


class Simulator:
    def __init__(
        self,
        encoder: StimulationEncoder,
        brain: BrainModel,
        periphery: PeripheryTransducer,
        measurement: MeasurementModel,
    ) -> None:
        self.encoder = encoder
        self.brain = brain
        self.periphery = periphery
        self.measurement = measurement

    def run(
        self,
        stim_params: StimParams,
        patient: PatientParams,
        config: RolloutConfig,
        seed: int | None = None,
        rng: np.random.Generator | None = None,
    ) -> MeasurementOutput:
        if rng is None:
            rng = np.random.default_rng(seed)
        t = config.t
        stimulation = self.encoder.encode(t, stim_params)
        latent = self.brain.simulate(t=t, stimulation=stimulation, patient=patient, rng=rng)
        kin = self.periphery.simulate(latent=latent, patient=patient, dt=config.dt, rng=rng)
        return self.measurement.observe(kin=kin, config=config, patient=patient, rng=rng)
