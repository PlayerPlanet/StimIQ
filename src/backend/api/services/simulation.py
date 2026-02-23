from __future__ import annotations

import math
from typing import Iterable

import numpy as np

from ..schemas.simulation import (
    SimulationChannelPoint,
    SimulationChannelTrace,
    SimulationParameterTuple,
    SimulationRequest,
    SimulationResponse,
)

try:
    from sim.api.types import PatientParams, StimParams
    from sim.cohort.sampling import sample_patient_params
    from sim.config.runtime import load_config
    from sim.factory import build_rollout_config, build_simulator

    SIM_AVAILABLE = True
except Exception:
    SIM_AVAILABLE = False


def _avg(values: Iterable[float]) -> float:
    values = list(values)
    if not values:
        return 0.0
    return sum(values) / len(values)


def _fallback_synthetic_response(request: SimulationRequest) -> SimulationResponse:
    tuples: list[SimulationParameterTuple] = request.parameter_tuples
    sampling_hz = 50
    duration_s = 10.0
    total_points = int(sampling_hz * duration_s)

    base_amplitude = _avg(t.amplitude_ma for t in tuples)
    base_frequency_hz = _avg(t.frequency_hz for t in tuples)
    base_phase_rad = math.radians(_avg(t.phase_deg for t in tuples))
    base_pulse_width_factor = _avg(t.pulse_width_us for t in tuples) / 100.0

    channels: list[SimulationChannelTrace] = []
    channel_modifiers = [0.85, 1.0, 1.15]

    for channel_id, modifier in enumerate(channel_modifiers, start=1):
        points: list[SimulationChannelPoint] = []
        for i in range(total_points):
            time_s = i / sampling_hz
            oscillation_hz = max(0.1, base_frequency_hz / 100.0) * modifier
            value = (
                base_amplitude
                * modifier
                * math.sin(2 * math.pi * oscillation_hz * time_s + base_phase_rad)
            )
            damping = math.exp(-time_s / 12.0)
            pulse_influence = 1.0 + (base_pulse_width_factor - 0.6) * 0.15
            deviation = value * damping * pulse_influence
            points.append(
                SimulationChannelPoint(time_s=round(time_s, 3), deviation=round(deviation, 4))
            )

        channels.append(
            SimulationChannelTrace(
                channel_id=channel_id,
                label=f"Channel {channel_id}",
                points=points,
            )
        )

    return SimulationResponse(
        status="ok",
        message=(
            f"Sim package unavailable, returned fallback synthetic response for "
            f"{request.tuple_count} tuples."
        ),
        sampling_hz=sampling_hz,
        duration_s=duration_s,
        channels=channels,
    )


def _build_stim_params(parameter_tuples: list[SimulationParameterTuple]) -> StimParams:
    # sim expects 4xN matrix: amp, freq, pulse_width_seconds, phase_radians
    matrix = np.asarray(
        [
            [float(t.amplitude_ma) for t in parameter_tuples],
            [float(t.frequency_hz) for t in parameter_tuples],
            [float(t.pulse_width_us) / 1_000_000.0 for t in parameter_tuples],
            [math.radians(float(t.phase_deg)) for t in parameter_tuples],
        ],
        dtype=float,
    )
    return StimParams.from_matrix(matrix)


def _build_patient(seed: int) -> PatientParams:
    rng = np.random.default_rng(seed)
    return sample_patient_params(rng, n=1)[0]


def _convert_xyz_deviation_to_channels(
    t: np.ndarray,
    pos_xyz: np.ndarray,
) -> list[SimulationChannelTrace]:
    if pos_xyz.ndim != 2 or pos_xyz.shape[1] < 3:
        raise ValueError("Simulation output position must be shaped (N, >=3)")

    # Deviation from baseline (0-reference as first observed sample).
    baseline = pos_xyz[0, :3]
    delta = pos_xyz[:, :3] - baseline[None, :]

    labels = ["Channel 1 (X)", "Channel 2 (Y)", "Channel 3 (Z)"]
    channels: list[SimulationChannelTrace] = []
    for i in range(3):
        points = [
            SimulationChannelPoint(time_s=round(float(t[j]), 3), deviation=round(float(delta[j, i]), 6))
            for j in range(t.shape[0])
        ]
        channels.append(
            SimulationChannelTrace(
                channel_id=i + 1,
                label=labels[i],
                points=points,
            )
        )
    return channels


def run_hypothetical_simulation(request: SimulationRequest) -> SimulationResponse:
    """Run real sim package rollout and return 3-channel position deviation traces."""
    if not SIM_AVAILABLE:
        return _fallback_synthetic_response(request)

    try:
        # Keep runtime deterministic for fair "game" behavior.
        seed = 42
        cfg = load_config(
            overrides=[
                "rollout.duration_s=10.0",
                "rollout.dt=0.001",
                "rollout.imu_sample_rate_hz=50.0",
                "rollout.include_noise=false",
                f"seed={seed}",
            ]
        )
        simulator = build_simulator(cfg)
        rollout = build_rollout_config(cfg)

        stim_params = _build_stim_params(request.parameter_tuples)
        patient = _build_patient(seed=seed)
        output = simulator.run(
            stim_params=stim_params,
            patient=patient,
            config=rollout,
            seed=seed,
        )

        channels = _convert_xyz_deviation_to_channels(output.t, output.pos)

        sample_rate = int(round(float(output.meta.get("sample_rate_hz", rollout.imu_sample_rate_hz))))
        duration_s = float(output.t[-1] - output.t[0]) if output.t.size > 1 else 0.0
        return SimulationResponse(
            status="ok",
            message=f"Simulated {request.tuple_count} tuples via sim package.",
            sampling_hz=max(1, sample_rate),
            duration_s=max(duration_s, 0.001),
            channels=channels,
        )
    except Exception as exc:
        fallback = _fallback_synthetic_response(request)
        return SimulationResponse(
            status="ok",
            message=f"{fallback.message} Real sim failed: {exc}",
            sampling_hz=fallback.sampling_hz,
            duration_s=fallback.duration_s,
            channels=fallback.channels,
        )
