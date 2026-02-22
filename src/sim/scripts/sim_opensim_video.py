from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np

from sim.api.types import StimParams
from sim.cohort.sampling import sample_patient_params
from sim.config.runtime import load_config
from sim.factory import build_rollout_config, build_simulator, build_stim_params
from sim.periphery.opensim_stub import OpenSimStub


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Generate OpenSim motion and ON vs OFF hand-tremor comparison GIF")
    p.add_argument("--out-dir", type=Path, default=Path("artifacts/opensim"), help="Output directory")
    p.add_argument(
        "--comparison-gif",
        type=str,
        default="tremor_3d_on_vs_off.gif",
        help="Comparison GIF output name (must end with .gif)",
    )
    p.add_argument(
        "--comparison-mode",
        type=str,
        choices=["3d", "yolo2d"],
        default="3d",
        help="Comparison renderer style",
    )
    p.add_argument("--mot-on-name", type=str, default="tremor_on.mot", help="OpenSim motion file for stim ON")
    p.add_argument("--mot-off-name", type=str, default="tremor_off.mot", help="OpenSim motion file for stim OFF")
    p.add_argument("--fps", type=int, default=30, help="Video frame rate")
    p.add_argument("--stride", type=int, default=2, help="Render every Nth sample")
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

    seed = int(cfg.seed if args.seed is None else args.seed)
    rng = np.random.default_rng(seed)
    patient = sample_patient_params(rng, n=1)[0]
    simulator = build_simulator(cfg)
    rollout = build_rollout_config(cfg)
    stim_on = build_stim_params(cfg)
    stim_off = StimParams.from_matrix(np.zeros_like(stim_on.as_matrix()))

    out_on = simulator.run(stim_params=stim_on, patient=patient, config=rollout, seed=seed)
    out_off = simulator.run(stim_params=stim_off, patient=patient, config=rollout, seed=seed + 1)

    bridge = OpenSimStub()
    motion_on = bridge.map_6dof_to_joint_angles(t=out_on.t, pos=out_on.pos, vel=out_on.vel)
    motion_off = bridge.map_6dof_to_joint_angles(t=out_off.t, pos=out_off.pos, vel=out_off.vel)

    out_dir = args.out_dir
    mot_on_path = bridge.export_mot(out_dir / args.mot_on_name, motion_on)
    mot_off_path = bridge.export_mot(out_dir / args.mot_off_name, motion_off)
    if args.comparison_mode == "3d":
        gif_path = bridge.render_3d_hand_tremor_comparison(
            out_dir / args.comparison_gif,
            pos_on=out_on.pos,
            pos_off=out_off.pos,
            fps=max(1, int(args.fps)),
            stride=max(1, int(args.stride)),
            title="StimIQ 3D Stick Figure: Tremor Hand (Stim ON vs OFF)",
        )
    else:
        gif_path = bridge.render_yolo_hand_tremor_comparison(
            out_dir / args.comparison_gif,
            pos_on=out_on.pos,
            pos_off=out_off.pos,
            fps=max(1, int(args.fps)),
            stride=max(1, int(args.stride)),
            title="StimIQ YOLO Pose: Tremor Hand (Stim ON vs OFF)",
        )

    print(f"Wrote ON motion file: {mot_on_path}")
    print(f"Wrote OFF motion file: {mot_off_path}")
    print(f"Wrote {args.comparison_mode} comparison GIF: {gif_path}")


if __name__ == "__main__":
    main()
