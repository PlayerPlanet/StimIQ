from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from omegaconf import OmegaConf

from sim.api.types import StimParams
from sim.cohort.sampling import sample_patient_params
from sim.config.runtime import load_config
from sim.datasets.generate import generate_and_save
from sim.factory import build_rollout_config, build_simulator


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate multiple synthetic rollouts")
    parser.add_argument(
        "--override",
        action="append",
        default=[],
        help="Hydra override, e.g. sweep.samples=64 (repeatable)",
    )
    args = parser.parse_args()

    cfg = load_config(overrides=list(args.override))
    seed = int(cfg.seed)
    rng = np.random.default_rng(seed)
    n = int(cfg.sweep.samples)
    stimuli = []
    for _ in range(n):
        mat = np.array(
            [
                rng.uniform(float(cfg.sweep.amp.low), float(cfg.sweep.amp.high), size=4),
                rng.uniform(float(cfg.sweep.freq_hz.low), float(cfg.sweep.freq_hz.high), size=4),
                rng.uniform(float(cfg.sweep.pw_s.low), float(cfg.sweep.pw_s.high), size=4),
                rng.uniform(float(cfg.sweep.phase_rad.low), float(cfg.sweep.phase_rad.high), size=4),
            ]
        )
        stimuli.append(StimParams.from_matrix(mat))

    n_patients = int(cfg.cohort.patients)
    if n_patients != n:
        raise ValueError("v1 requires cohort.patients == sweep.samples for per-patient CSV output.")
    patients = sample_patient_params(rng, n=n_patients)
    config = build_rollout_config(cfg)
    simulator = build_simulator(cfg)
    supabase_cfg = OmegaConf.to_container(cfg.output.supabase, resolve=True)

    output_dir = Path(str(cfg.output.local_dir))
    paths = generate_and_save(
        simulator,
        stimuli,
        patients,
        config,
        out_dir=output_dir,
        supabase=supabase_cfg,
        seed=seed,
    )
    print(f"Saved {len(paths)} files to {output_dir}")


if __name__ == "__main__":
    main()
