from __future__ import annotations

import argparse
import json

import numpy as np

from sim.api.types import StimParams
from sim.cohort.sampling import sample_patient_params
from sim.config.runtime import load_config
from sim.factory import build_rollout_config, build_simulator, build_stim_params


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Run one stimulation rollout")
    p.add_argument("--stim-json", type=str, default="", help="Path to JSON containing 4xN stim matrix")
    p.add_argument(
        "--override",
        action="append",
        default=[],
        help="Hydra override, e.g. rollout.duration_s=5.0 (repeatable)",
    )
    p.add_argument("--seed", type=int, default=None)
    return p.parse_args()


def main() -> None:
    args = parse_args()
    cfg = load_config(overrides=list(args.override))
    stim = build_stim_params(cfg)
    if args.stim_json:
        with open(args.stim_json, "r", encoding="utf-8") as f:
            stim = StimParams.from_matrix(np.asarray(json.load(f), dtype=float))

    seed = int(cfg.seed if args.seed is None else args.seed)
    config = build_rollout_config(cfg)
    patient = sample_patient_params(np.random.default_rng(seed), n=1)[0]
    simulator = build_simulator(cfg)

    output = simulator.run(stim_params=stim, patient=patient, config=config, seed=seed)
    print(f"Generated IMU rollout with {output.t.shape[0]} samples")
    print(f"pos shape: {output.pos.shape}, vel shape: {output.vel.shape}, acc shape: {output.acc.shape}")


if __name__ == "__main__":
    main()
