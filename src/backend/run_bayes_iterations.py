from __future__ import annotations

import argparse
from io import BytesIO
from numbers import Integral
from pathlib import Path
from typing import Any

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from Bayes import model
from config import get_settings
from database import get_supabase, initialize_supabase
from loss import calculate_loss


def _canonical_param_columns(n_electrodes: int) -> list[str]:
    bases = ["amp", "freq_hz", "pulse_width_s", "phase_rad"]
    cols: list[str] = []
    for i in range(n_electrodes):
        for base in bases:
            cols.append(f"{base}_{i}")
    return cols


def _normalize_csv_bytes(content: bytes) -> pd.DataFrame:
    df = pd.read_csv(BytesIO(content))
    if df.empty:
        df = pd.read_csv(BytesIO(content), sep=";", header=None)

    if all(isinstance(c, Integral) for c in df.columns):
        has_severity_tail = (df.shape[1] % 4 == 1)
        n_param_cols = df.shape[1] - 1 if has_severity_tail else df.shape[1]
        if n_param_cols % 4 == 0:
            cols = _canonical_param_columns(n_param_cols // 4)
            if has_severity_tail:
                df = df.iloc[:, : n_param_cols + 1]
                df.columns = cols + ["severity"]
            else:
                df = df.iloc[:, : n_param_cols]
                df.columns = cols

    if "severity" not in df.columns:
        df["severity"] = 0.0

    return df


def _download_current_df(bucket: str, object_path: str) -> pd.DataFrame:
    supabase = get_supabase()
    content = supabase.storage.from_(bucket).download(object_path)
    if isinstance(content, str):
        content = content.encode("utf-8")
    return _normalize_csv_bytes(content)


def _upload_df(bucket: str, object_path: str, df: pd.DataFrame) -> None:
    supabase = get_supabase()
    payload = df.to_csv(index=False).encode("utf-8")
    supabase.storage.from_(bucket).upload(
        path=object_path,
        file=payload,
        file_options={"content-type": "text/csv", "upsert": "true"},
    )


def _params_to_matrix(next_params: dict[str, Any]) -> np.ndarray:
    canonical_order = [k for k in next_params if k.startswith(("amp_", "freq_hz_", "pulse_width_s_", "phase_rad_"))]
    if not canonical_order:
        raise ValueError("No stimulation parameters returned by Bayes")

    # Determine number of electrodes from suffixes.
    indices = sorted({int(k.rsplit("_", 1)[1]) for k in canonical_order})
    n_electrodes = (max(indices) + 1) if indices else 0
    cols = _canonical_param_columns(n_electrodes)

    matrix = np.zeros((4, n_electrodes), dtype=np.float64)
    for i in range(n_electrodes):
        matrix[0, i] = float(next_params[f"amp_{i}"])
        matrix[1, i] = float(next_params[f"freq_hz_{i}"])
        matrix[2, i] = float(next_params[f"pulse_width_s_{i}"])
        matrix[3, i] = float(next_params[f"phase_rad_{i}"])

    # Keep order stable with expected CSV schema.
    _ = cols
    return matrix


def run(
    iterations: int = 10,
    batch_size: int = 3,
    exploration_weight: float = 0.2,
    min_distance_frac: float = 0.05,
) -> list[float]:
    settings = get_settings()
    if not settings.bayes_patient_id:
        raise ValueError("BAYES_PATIENT_ID must be set in .env")

    bucket = settings.supabase_datapoints_bucket
    object_path = settings.bayes_datapoints_object_path or f"{settings.bayes_patient_id}.csv"

    initialize_supabase()

    losses: list[float] = []
    for i in range(iterations):
        result = model(
            batch_size=batch_size,
            exploration_weight=exploration_weight,
            min_distance_frac=min_distance_frac,
        )
        batch = result.get("next_params_batch") or [result["next_params"]]
        current_df = _download_current_df(bucket=bucket, object_path=object_path)

        for j, next_params in enumerate(batch, start=1):
            params_matrix = _params_to_matrix(next_params)
            severity = float(calculate_loss(params_matrix, patient_id=settings.bayes_patient_id))
            losses.append(severity)

            row = {k: float(v) for k, v in next_params.items()}
            row["severity"] = severity
            current_df = pd.concat([current_df, pd.DataFrame([row])], ignore_index=True)
            print(
                f"iteration={i + 1}/{iterations} candidate={j}/{len(batch)} "
                f"severity={severity:.6f} rows={len(current_df)}"
            )

        _upload_df(bucket=bucket, object_path=object_path, df=current_df)
    return losses


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run Bayes iterations and persist to Supabase CSV")
    parser.add_argument("--iterations", type=int, default=10, help="Number of Bayes/loss iterations")
    parser.add_argument(
        "--plot-path",
        type=str,
        default="artifacts/loss_over_steps.png",
        help="Where to save line plot for the current run losses",
    )
    parser.add_argument("--batch-size", type=int, default=3, help="Candidates evaluated per Bayes iteration")
    parser.add_argument("--exploration-weight", type=float, default=0.2, help="Acquisition exploration weight")
    parser.add_argument("--min-distance-frac", type=float, default=0.05, help="Min normalized distance between suggestions")
    return parser.parse_args()


if __name__ == "__main__":
    args = _parse_args()
    losses = run(
        iterations=args.iterations,
        batch_size=args.batch_size,
        exploration_weight=args.exploration_weight,
        min_distance_frac=args.min_distance_frac,
    )
    x = np.arange(1, len(losses) + 1)
    plt.figure(figsize=(8, 4))
    plt.plot(x, losses, marker="o")
    plt.title(f"Loss Over {len(losses)} Steps")
    plt.xlabel("Step")
    plt.ylabel("Severity / Loss")
    plt.grid(True, alpha=0.3)
    out_path = args.plot_path
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    plt.tight_layout()
    plt.savefig(out_path, dpi=150)
    print(f"saved_plot={out_path}")
