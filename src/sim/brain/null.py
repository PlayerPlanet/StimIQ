from __future__ import annotations

import numpy as np

from sim.api.base import BrainModel
from sim.api.types import LatentState, PatientParams


class NullBrain(BrainModel):
    def simulate(
        self,
        t: np.ndarray,
        stimulation: np.ndarray,
        patient: PatientParams,
        rng: np.random.Generator,
    ) -> LatentState:
        drive = np.asarray(stimulation, dtype=float)
        if drive.ndim == 2 and drive.shape[1] > 1:
            drive = np.mean(drive, axis=1, keepdims=True)
        elif drive.ndim == 1:
            drive = drive[:, None]
        return LatentState(t=t, drive=drive, features={"source": drive[:, 0]})
