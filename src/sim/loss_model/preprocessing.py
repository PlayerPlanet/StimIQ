from __future__ import annotations

import argparse
import csv
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

import numpy as np

from ..api.treatment_goals import TreatmentGoals

# Task order in PADS preprocessed movement binaries. This follows
# src/sim/PADS/scripts/run_preprocessing*.py after channel pruning.
TASKS = (
    "Relaxed1",
    "Relaxed2",
    "RelaxedTask1",
    "RelaxedTask2",
    "StretchHold",
    "HoldWeight",
    "DrinkGlas",
    "CrossArms",
    "TouchNose",
    "Entrainment1",
    "Entrainment2",
)

CHANNELS_PER_TASK = 12
TOTAL_CHANNELS = len(TASKS) * CHANNELS_PER_TASK  # 132
TIME_LEN = 976
QUESTIONNAIRE_LEN = 30


@dataclass(frozen=True)
class SubjectMeta:
    subject_id: str
    label: int
    age: float | None
    age_at_diagnosis: float | None


def _parse_float(value: str) -> float | None:
    txt = value.strip()
    if not txt:
        return None
    try:
        return float(txt)
    except ValueError:
        return None


def load_file_list(path: Path) -> list[SubjectMeta]:
    if not path.exists():
        raise FileNotFoundError(f"Missing file list: {path}")

    out: list[SubjectMeta] = []
    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            sid = row.get("id", "").strip()
            if not sid:
                continue
            label_raw = row.get("label", "").strip()
            if not label_raw:
                continue
            out.append(
                SubjectMeta(
                    subject_id=f"{int(sid):03d}",
                    label=int(label_raw),
                    age=_parse_float(row.get("age", "")),
                    age_at_diagnosis=_parse_float(row.get("age_at_diagnosis", "")),
                )
            )
    return out


def load_movement(path: Path) -> np.ndarray:
    x = np.fromfile(path, dtype=np.float32)
    expected = TOTAL_CHANNELS * TIME_LEN
    if x.size != expected:
        raise ValueError(f"Unexpected movement size for {path.name}: {x.size}, expected {expected}")
    return x.reshape(TOTAL_CHANNELS, TIME_LEN)


def load_questionnaire(path: Path) -> np.ndarray:
    q = np.fromfile(path, dtype=np.float32)
    if q.size != QUESTIONNAIRE_LEN:
        raise ValueError(f"Unexpected questionnaire size for {path.name}: {q.size}, expected {QUESTIONNAIRE_LEN}")
    return q


def make_9ch_task_matrix(movement: np.ndarray, task: str) -> np.ndarray:
    if task not in TASKS:
        raise KeyError(f"Unknown task '{task}'")
    base = TASKS.index(task) * CHANNELS_PER_TASK
    left_acc = movement[base + 0 : base + 3, :]
    left_gyro = movement[base + 3 : base + 6, :]
    right_acc = movement[base + 6 : base + 9, :]
    right_gyro = movement[base + 9 : base + 12, :]

    left_gyro_mag = np.sqrt(np.sum(left_gyro**2, axis=0, keepdims=True))
    right_gyro_mag = np.sqrt(np.sum(right_gyro**2, axis=0, keepdims=True))
    left_acc_mag = np.sqrt(np.sum(left_acc**2, axis=0, keepdims=True))
    right_acc_mag = np.sqrt(np.sum(right_acc**2, axis=0, keepdims=True))
    acc_mag_diff = left_acc_mag - right_acc_mag

    feat = np.concatenate(
        [left_acc, right_acc, left_gyro_mag, right_gyro_mag, acc_mag_diff],
        axis=0,
    )  # (9, T)
    return feat.T.astype(np.float32)  # (T, 9)


def make_windows(x: np.ndarray, window: int, stride: int) -> np.ndarray:
    if x.ndim != 2 or x.shape[1] != 9:
        raise ValueError(f"Expected matrix (T, 9), got {x.shape}")
    if window <= 0 or stride <= 0:
        raise ValueError("window and stride must be positive")
    if x.shape[0] < window:
        return np.empty((0, window, 9), dtype=np.float32)

    chunks: list[np.ndarray] = []
    for start in range(0, x.shape[0] - window + 1, stride):
        chunks.append(x[start : start + window])
    return np.stack(chunks, axis=0).astype(np.float32)


def build_severity_proxy(
    label: int,
    questionnaire: np.ndarray,
    age: float | None,
    age_at_diagnosis: float | None,
    duration_mu: float,
    duration_sigma: float,
    treatment_goals: Optional[TreatmentGoals] = None,
) -> float:
    if treatment_goals is None:
        treatment_goals = TreatmentGoals.default()
    
    diag = {-1: -1.0, 0: -1.0, 1: 1.0, 2: 0.0}.get(label, 0.0)
    nms_burden = float(np.mean(questionnaire > 0.5))  # [0,1]
    nms = 2.0 * nms_burden - 1.0  # [-1,1]

    dur = 0.0
    if age is not None and age_at_diagnosis is not None:
        raw = max(0.0, age - age_at_diagnosis)
        if duration_sigma > 1e-6:
            dur = (raw - duration_mu) / duration_sigma
    # squash duration to [-1,1]
    dur = float(np.tanh(dur))

    total_w = max(1e-6, treatment_goals.total_weight)
    z = (treatment_goals.w_diag * diag + treatment_goals.w_nms * nms + treatment_goals.w_dur * dur) / total_w
    return float(np.clip(z, -1.0, 1.0))


def load_patient_goals(path: Path) -> dict[str, TreatmentGoals]:
    """Load patient-specific treatment goals from CSV."""
    result = {}
    if not path.exists():
        raise FileNotFoundError(f"Patient goals file not found: {path}")
    
    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            sid = row.get("subject_id", "").strip()
            if not sid:
                continue
            try:
                goals = TreatmentGoals(
                    w_diag=float(row.get("w_diag", 0.55)),
                    w_nms=float(row.get("w_nms", 0.35)),
                    w_dur=float(row.get("w_dur", 0.10)),
                    patient_id=sid,
                    notes=row.get("notes"),
                )
                result[sid] = goals
            except (ValueError, TypeError) as e:
                raise ValueError(f"Failed to parse goals for subject {sid}: {e}") from e
    return result


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Convert PADS preprocessed binaries into IMU windows (N,T,9) and severity proxy labels."
    )
    p.add_argument("--pads-preprocessed-dir", type=str, default="src/sim/PADS/preprocessed")
    p.add_argument("--out", type=str, default="src/sim/artifacts/loss_model/pads_windows.npz")
    p.add_argument("--window", type=int, default=256)
    p.add_argument("--stride", type=int, default=128)
    p.add_argument(
        "--tasks",
        type=str,
        default=",".join(TASKS),
        help="Comma-separated subset of tasks",
    )
    p.add_argument("--w-diag", type=float, default=0.55, help="Default weight for diagnosis (deprecated, use --patient-goals-file)")
    p.add_argument("--w-nms", type=float, default=0.35, help="Default weight for NMS (deprecated, use --patient-goals-file)")
    p.add_argument("--w-dur", type=float, default=0.10, help="Default weight for duration (deprecated, use --patient-goals-file)")
    p.add_argument("--patient-goals-file", type=str, default=None, help="Path to CSV with per-patient treatment goals")
    p.add_argument("--save-subject-id", action="store_true", help="Also store subject_ids for each window in NPZ.")
    return p.parse_args()


def main() -> None:
    args = parse_args()
    pre_dir = Path(args.pads_preprocessed_dir)
    file_list_path = pre_dir / "file_list.csv"
    movement_dir = pre_dir / "movement"
    questionnaire_dir = pre_dir / "questionnaire"

    task_list = tuple(t.strip() for t in args.tasks.split(",") if t.strip())
    for t in task_list:
        if t not in TASKS:
            raise ValueError(f"Unknown task '{t}'. Available: {', '.join(TASKS)}")

    subjects = load_file_list(file_list_path)
    if not subjects:
        raise RuntimeError("No subjects found in file_list.csv")
    
    # Load patient-specific treatment goals if provided
    patient_goals_map: dict[str, TreatmentGoals] = {}
    if args.patient_goals_file:
        patient_goals_map = load_patient_goals(Path(args.patient_goals_file))
    
    # Create default goals for CLI args (backward compatibility)
    default_goals = TreatmentGoals(
        w_diag=args.w_diag,
        w_nms=args.w_nms,
        w_dur=args.w_dur,
    )

    # Fit duration normalization from available values.
    durations = []
    for s in subjects:
        if s.age is not None and s.age_at_diagnosis is not None:
            durations.append(max(0.0, s.age - s.age_at_diagnosis))
    if durations:
        d = np.asarray(durations, dtype=np.float32)
        duration_mu = float(np.mean(d))
        duration_sigma = float(np.std(d))
    else:
        duration_mu = 0.0
        duration_sigma = 1.0

    x_all: list[np.ndarray] = []
    y_all: list[np.ndarray] = []
    sid_all: list[np.ndarray] = []
    dropped = 0

    for s in subjects:
        mov_path = movement_dir / f"{s.subject_id}_ml.bin"
        q_path = questionnaire_dir / f"{s.subject_id}_ml.bin"
        if not mov_path.exists() or not q_path.exists():
            dropped += 1
            continue

        movement = load_movement(mov_path)
        questionnaire = load_questionnaire(q_path)
        
        # Use patient-specific goals if available, otherwise use defaults
        goals = patient_goals_map.get(s.subject_id, default_goals)
        
        z = build_severity_proxy(
            label=s.label,
            questionnaire=questionnaire,
            age=s.age,
            age_at_diagnosis=s.age_at_diagnosis,
            duration_mu=duration_mu,
            duration_sigma=duration_sigma,
            treatment_goals=goals,
        )

        for task in task_list:
            task_matrix = make_9ch_task_matrix(movement, task=task)
            windows = make_windows(task_matrix, window=args.window, stride=args.stride)
            if windows.size == 0:
                continue
            x_all.append(windows)
            y_all.append(np.full((windows.shape[0],), z, dtype=np.float32))
            if args.save_subject_id:
                sid_all.append(np.full((windows.shape[0],), int(s.subject_id), dtype=np.int32))

    if not x_all:
        raise RuntimeError("No windows were produced. Check --pads-preprocessed-dir and window/stride values.")

    x = np.concatenate(x_all, axis=0).astype(np.float32)
    y = np.concatenate(y_all, axis=0).astype(np.float32)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    payload: dict[str, Any] = {"X": x, "y": y}
    if args.save_subject_id and sid_all:
        payload["subject_id"] = np.concatenate(sid_all, axis=0)
    np.savez(out_path, **payload)

    print(f"Saved dataset: {out_path}")
    print(f"X shape: {x.shape}, y shape: {y.shape}, dropped_subjects: {dropped}")
    print(f"y min/max: {float(np.min(y)):.3f}/{float(np.max(y)):.3f}")


if __name__ == "__main__":
    main()
