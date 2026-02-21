from __future__ import annotations

from abc import ABC, abstractmethod

import numpy as np

from .types import KinematicState, LatentState, MeasurementOutput, PatientParams, RolloutConfig, StimParams


class BrainModel(ABC):
    @abstractmethod
    def simulate(
        self,
        t: np.ndarray,
        stimulation: np.ndarray,
        patient: PatientParams,
        rng: np.random.Generator,
    ) -> LatentState:
        raise NotImplementedError


class PeripheryTransducer(ABC):
    @abstractmethod
    def simulate(
        self,
        latent: LatentState,
        patient: PatientParams,
        dt: float,
        rng: np.random.Generator,
    ) -> KinematicState:
        raise NotImplementedError


class MeasurementModel(ABC):
    @abstractmethod
    def observe(
        self,
        kin: KinematicState,
        config: RolloutConfig,
        patient: PatientParams,
        rng: np.random.Generator,
    ) -> MeasurementOutput:
        raise NotImplementedError


class StimulationEncoder(ABC):
    @abstractmethod
    def encode(self, t: np.ndarray, params: StimParams) -> np.ndarray:
        raise NotImplementedError
