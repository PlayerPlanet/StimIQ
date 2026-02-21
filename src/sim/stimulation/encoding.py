from __future__ import annotations

import numpy as np

from sim.api.base import StimulationEncoder
from sim.api.types import StimParams
from sim.stimulation.waveforms import smooth_rectified_sinusoid


class WaveformEncoder(StimulationEncoder):
    def __init__(self, reduction: str = "sum") -> None:
        if reduction not in {"sum", "mean", "none"}:
            raise ValueError("reduction must be one of: sum, mean, none")
        self.reduction = reduction

    def encode(self, t: np.ndarray, params: StimParams) -> np.ndarray:
        channels = []
        for i in range(params.n_channels):
            channels.append(
                smooth_rectified_sinusoid(
                    t=t,
                    amp=float(params.amp[i]),
                    freq_hz=float(params.freq[i]),
                    phase=float(params.phase[i]),
                )
            )
        u = np.stack(channels, axis=1)
        if self.reduction == "sum":
            return np.sum(u, axis=1, keepdims=True)
        if self.reduction == "mean":
            return np.mean(u, axis=1, keepdims=True)
        return u
