from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from omegaconf import OmegaConf

from sim.api.types import StimParams
from sim.cohort.sampling import sample_patient_params
from sim.config.runtime import load_config
from sim.datasets.generate import generate_and_save
from sim.factory import build_rollout_config, build_simulator, build_stim_params


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate test patient CSVs using generate_and_save")
    parser.add_argument("--n", type=int, default=4, help="Number of test patients/CSV files")
    parser.add_argument(
        "--override",
        action="append",
        default=[],
        help="Hydra override, e.g. rollout.duration_s=3 (repeatable)",
    )
    return parser.parse_args()


def build_test_stimuli(base: StimParams, n: int) -> list[StimParams]:
    base_mat = base.as_matrix()
    stimuli: list[StimParams] = []
    for i in range(n):
        scale = 1.0 + 0.03 * i
        mat = base_mat.copy()
        mat[0] = mat[0] * scale
        mat[3] = (mat[3] + 0.05 * i) % (2.0 * np.pi)
        stimuli.append(StimParams.from_matrix(mat))
    return stimuli


def main() -> None:
    args = parse_args()
    cfg = load_config(overrides=list(args.override))
    seed = int(cfg.seed)
    n = int(args.n)
    if n < 1:
        raise ValueError("--n must be >= 1")

    rng = np.random.default_rng(seed)
    base_stim = build_stim_params(cfg)
    stimuli = build_test_stimuli(base_stim, n=n)
    patients = sample_patient_params(rng, n=n)

    rollout_cfg = build_rollout_config(cfg)
    simulator = build_simulator(cfg)
    supabase_cfg = OmegaConf.to_container(cfg.output.supabase, resolve=True)

    out_dir = Path(str(cfg.output.local_dir)) / "test_csv"
        paths = generate_and_save(
            simulator=simulator,
            stimuli=stimuli,
            patients=patients,
            config=rollout_cfg,
            out_dir=out_dir,
            supabase=supabase_cfg,
            seed=seed,
    )
    print(f"Saved {len(paths)} test CSV files to {out_dir}")


if __name__ == "__main__":
    main()
