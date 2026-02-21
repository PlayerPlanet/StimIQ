from __future__ import annotations

import io
from pathlib import Path
from typing import Any

import numpy as np


def save_rollout_csv(path: str | Path, data: dict[str, Any]) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    arr = _rollout_matrix(data)
    header = ",".join(
        [
            "t",
            "pos_x",
            "pos_y",
            "pos_z",
            "vel_x",
            "vel_y",
            "vel_z",
            "acc_x",
            "acc_y",
            "acc_z",
        ]
    )
    np.savetxt(path, arr, delimiter=",", header=header, comments="")


def create_supabase_client(url: str, key: str) -> Any:
    try:
        from supabase import Client, create_client
    except ImportError as exc:
        raise ImportError("supabase is not installed. Install with: pip install supabase") from exc

    client: Client = create_client(url, key)
    return client


def save_rollout_csv_supabase(
    client: Any,
    bucket: str,
    object_path: str,
    data: dict[str, Any],
    meta: dict[str, Any],
    table: str | None = None,
    upsert: bool = True,
) -> dict[str, Any]:
    arr = _rollout_matrix(data)
    header = "t,pos_x,pos_y,pos_z,vel_x,vel_y,vel_z,acc_x,acc_y,acc_z\n"
    sio = io.StringIO()
    sio.write(header)
    np.savetxt(sio, arr, delimiter=",")
    client.storage.from_(bucket).upload(
        path=object_path,
        file=sio.getvalue().encode("utf-8"),
        file_options={"content-type": "text/csv", "upsert": upsert},
    )

    row = {
        "object_path": object_path,
        "bucket": bucket,
        "meta": _json_safe(meta),
    }
    if table:
        client.table(table).insert(row).execute()
    return row


def _rollout_matrix(data: dict[str, Any]) -> np.ndarray:
    t = np.asarray(data["t"], dtype=float).reshape(-1, 1)
    pos = np.asarray(data["pos"], dtype=float)
    vel = np.asarray(data["vel"], dtype=float)
    acc = np.asarray(data["acc"], dtype=float)
    if pos.ndim != 2 or vel.ndim != 2 or acc.ndim != 2:
        raise ValueError("pos/vel/acc must be rank-2 arrays")
    if pos.shape[1] != 3 or vel.shape[1] != 3 or acc.shape[1] != 3:
        raise ValueError("pos/vel/acc must have shape (T, 3)")
    if not (t.shape[0] == pos.shape[0] == vel.shape[0] == acc.shape[0]):
        raise ValueError("t/pos/vel/acc length mismatch")
    return np.column_stack((t, pos, vel, acc))


def _json_safe(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(k): _json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_json_safe(v) for v in value]
    if isinstance(value, tuple):
        return [_json_safe(v) for v in value]
    if isinstance(value, np.ndarray):
        return value.tolist()
    if isinstance(value, np.generic):
        return value.item()
    return value
