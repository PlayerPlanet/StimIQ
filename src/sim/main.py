from __future__ import annotations

import sys

import numpy as np

from sim.cohort.sampling import sample_patient_params
from sim.config.runtime import load_config
from sim.factory import build_rollout_config, build_simulator, build_stim_params


def main() -> None:
    cfg = load_config(overrides=sys.argv[1:])
    stim = build_stim_params(cfg)
    rollout = build_rollout_config(cfg)
    simulator = build_simulator(cfg)
    seed = int(cfg.seed)
    patient = sample_patient_params(np.random.default_rng(seed), n=1)[0]

    output = simulator.run(stim_params=stim, patient=patient, config=rollout, seed=seed)
    print(f"Generated {output.meta['n_samples']} IMU samples.")


if __name__ == "__main__":
    main()
