from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np

from sim.api.types import MeasurementOutput, PatientParams, RolloutConfig, StimParams
from sim.datasets.io import create_supabase_client, save_rollout_csv, save_rollout_csv_supabase
from sim.simulator import Simulator


def generate_rollouts(
    simulator: Simulator,
    stimuli: list[StimParams],
    patients: list[PatientParams],
    config: RolloutConfig,
    seed: int = 0,
) -> list[MeasurementOutput]:
    if len(stimuli) != len(patients):
        raise ValueError("v1 requires one stimulation parameter set per patient.")
    rng = np.random.default_rng(seed)
    outputs: list[MeasurementOutput] = []
    for stim, patient in zip(stimuli, patients, strict=True):
        outputs.append(simulator.run(stim_params=stim, patient=patient, config=config, rng=rng))
    return outputs


def generate_and_save(
    simulator: Simulator,
    stimuli: list[StimParams],
    patients: list[PatientParams],
    config: RolloutConfig,
    out_dir: str | Path,
    supabase: dict[str, Any] | None = None,
    seed: int = 0,
) -> list[Path]:
    out_dir = Path(out_dir)
    outputs = generate_rollouts(simulator, stimuli, patients, config, seed=seed)
    paths: list[Path] = []
    sb_client = None
    sb_bucket = ""
    sb_table = None
    sb_prefix = "rollouts"
    sb_upsert = True
    if supabase and bool(supabase.get("enabled", False)):
        sb_url = str(supabase.get("url", "")).strip()
        sb_key = str(supabase.get("key", "")).strip()
        if not sb_url or not sb_key:
            raise ValueError("Supabase is enabled but url/key are missing.")
        sb_client = create_supabase_client(url=sb_url, key=sb_key)
        sb_bucket = str(supabase.get("bucket", "sim-rollouts"))
        sb_table = str(supabase["table"]) if supabase.get("table") else None
        sb_prefix = str(supabase.get("prefix", "rollouts"))
        sb_upsert = bool(supabase.get("upsert", True))

    for i, out in enumerate(outputs):
        patient_id = i
        path = out_dir / f"patient_{patient_id:05d}.csv"
        data = {"t": out.t, "pos": out.pos, "vel": out.vel, "acc": out.acc}
        save_rollout_csv(
            path,
            data=data,
        )
        if sb_client is not None:
            object_path = f"{sb_prefix.rstrip('/')}/patient_{patient_id:05d}.csv"
            save_rollout_csv_supabase(
                client=sb_client,
                bucket=sb_bucket,
                object_path=object_path,
                data=data,
                meta=out.meta,
                table=sb_table,
                upsert=sb_upsert,
            )
        paths.append(path)
    return paths
