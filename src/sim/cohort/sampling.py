from __future__ import annotations

import numpy as np

from sim.api.types import PatientParams
from sim.cohort.transforms import clamp, positive, stable_damping


def sample_patient_params(rng: np.random.Generator, n: int = 1) -> list[PatientParams]:
    patients: list[PatientParams] = []
    for _ in range(n):
        brain = {
            "natural_freq_hz": clamp(rng.normal(5.0, 1.0), 2.5, 9.0),
            "damping": stable_damping(rng.lognormal(mean=-0.2, sigma=0.4)),
            "coupling": positive(rng.normal(0.8, 0.2), minimum=0.1),
        }
        periphery = {
            "freq_hz": clamp(rng.normal(4.5, 0.8), 2.0, 8.0),
            "damping": stable_damping(rng.lognormal(mean=-0.3, sigma=0.4)),
            "gain": positive(rng.normal(1.0, 0.2), minimum=0.2),
            "mix": rng.normal(loc=[1.0, 0.6, 0.3], scale=[0.2, 0.2, 0.2]).tolist(),
        }
        sensor = {
            "noise_std": positive(rng.lognormal(mean=-3.8, sigma=0.3), minimum=0.001),
            "bias_std": positive(rng.lognormal(mean=-4.2, sigma=0.3), minimum=0.0005),
            "drift_per_s": positive(rng.lognormal(mean=-6.0, sigma=0.5), minimum=1e-5),
        }
        patients.append(PatientParams(brain=brain, periphery=periphery, sensor=sensor))
    return patients
