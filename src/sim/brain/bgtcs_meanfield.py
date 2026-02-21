from __future__ import annotations

import numpy as np

from sim.api.base import BrainModel
from sim.api.types import LatentState, PatientParams
from sim.brain.utils import moving_rms


class BGTCSLite(BrainModel):
    """Minimal mean-field inspired oscillator used as a stable backbone.

    With damping < 1 the system is underdamped and oscillates at ~natural_freq_hz
    (simulating pathological tremor/beta-band activity).  High-frequency
    stimulation suppresses the oscillation via an additional velocity-damping
    term proportional to the running RMS of the stimulation waveform, mimicking
    the depolarisation-block / information-lesion hypothesis of DBS.

    Effective damping coefficient:  2*zeta*omega  +  inhibition * stim_rms(t)
    """

    def __init__(
        self,
        natural_freq_hz: float = 5.0,
        damping: float = 0.15,
        coupling: float = 0.8,
        inhibition: float = 80.0,
        drive_noise_std: float = 10.0,
        dt_hint: float = 1e-3,
    ) -> None:
        self.natural_freq_hz = natural_freq_hz
        self.damping = damping
        self.coupling = coupling
        self.inhibition = inhibition
        self.drive_noise_std = drive_noise_std
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
        inhibition = float(patient.brain.get("inhibition", self.inhibition))
        drive_noise_std = float(patient.brain.get("drive_noise_std", self.drive_noise_std))

        dt = float(np.mean(np.diff(t))) if n > 1 else self.dt_hint

        # Pre-generate spontaneous drive noise (Euler-Maruyama: injected into
        # velocity, not acceleration, so scaling is sigma*sqrt(dt)).  This gives
        # stationary variance E[z²] = sigma² / (2 * eff_damp * omega²), which is
        # independent of dt and allows drive_noise_std to be a meaningful physical
        # parameter (units: position · rad/s^(1/2)).
        noise_drive = rng.standard_normal(n) * (drive_noise_std * np.sqrt(dt))

        # Exponential smoothing of stim power (τ = 20 ms).  Tracks burst energy
        # of high-frequency pulse trains so all of amp, freq and pulse_width
        # contribute to the running RMS that drives suppression.
        tau_rms = 0.020
        alpha = 1.0 - np.exp(-dt / tau_rms)
        rms_sq = 0.0  # E[u²] running estimate

        base_damp = 2.0 * damping * omega  # unmodulated damping coefficient

        for i in range(1, n):
            rms_sq = alpha * drive_in[i - 1] ** 2 + (1.0 - alpha) * rms_sq
            stim_rms = np.sqrt(rms_sq)
            # HFS suppression: extra velocity-damping ∝ stim RMS
            eff_damp = base_damp + inhibition * stim_rms
            a = (-eff_damp * v[i - 1]
                 - (omega ** 2) * z[i - 1]
                 + coupling * drive_in[i - 1])
            v[i] = v[i - 1] + dt * a + noise_drive[i - 1]   # Euler-Maruyama
            z[i] = z[i - 1] + dt * v[i]

        latent = z[:, None]
        features = {
            "bandpower_proxy": moving_rms(z, max(2, int(0.25 / max(dt, 1e-6)))),
            "drive_in": drive_in,
        }
        return LatentState(t=t, drive=latent, features=features)
