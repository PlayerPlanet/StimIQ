from __future__ import annotations

import argparse
import csv
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np

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


def compute_motor_raw_from_movement(movement: np.ndarray) -> float:
    """Compute a simple IMU-derived motor severity raw signal from movement tensor."""
    if movement.ndim != 2:
        raise ValueError(f"Expected movement matrix (C, T), got {movement.shape}")
    return float(np.sqrt(np.mean(np.square(movement), dtype=np.float64)))


def compute_severity_components(
    movement: np.ndarray,
    questionnaire: np.ndarray,
    age: float | None,
    age_at_diagnosis: float | None,
    motor_mu: float,
    motor_sigma: float,
    duration_mu: float,
    duration_sigma: float,
    non_motor_diary_ratio: float,
) -> dict[str, float]:
    """Compute individual severity components without weighting.
    
    Returns:
        dict with keys 'motor', 'non_motor', 'duration' each approximately in [-1, 1]
    """
    # Motor component from IMU-derived movement severity.
    motor_raw = compute_motor_raw_from_movement(movement)
    if motor_sigma > 1e-6:
        motor = (motor_raw - motor_mu) / motor_sigma
    else:
        motor = motor_raw - motor_mu
    motor = float(np.tanh(motor))

    # Non-motor component from diary + standard-tests split on questionnaire halves.
    q = np.asarray(questionnaire, dtype=np.float32).reshape(-1)
    split_idx = max(1, q.shape[0] // 2)
    diary_q = q[:split_idx]
    tests_q = q[split_idx:]
    diary_burden = float(np.mean(diary_q > 0.5)) if diary_q.size > 0 else 0.5
    tests_burden = float(np.mean(tests_q > 0.5)) if tests_q.size > 0 else diary_burden
    r = float(np.clip(non_motor_diary_ratio, 0.0, 1.0))
    non_motor_burden = r * diary_burden + (1.0 - r) * tests_burden
    non_motor = float(2.0 * non_motor_burden - 1.0)
    
    # Disease duration component.
    duration = 0.0
    if age is not None and age_at_diagnosis is not None:
        raw = max(0.0, age - age_at_diagnosis)
        if duration_sigma > 1e-6:
            duration = (raw - duration_mu) / duration_sigma
    duration = float(np.tanh(duration))
    
    return {"motor": motor, "non_motor": non_motor, "duration": duration}


def build_severity_proxy(
    movement: np.ndarray,
    questionnaire: np.ndarray,
    age: float | None,
    age_at_diagnosis: float | None,
    motor_mu: float,
    motor_sigma: float,
    duration_mu: float,
    duration_sigma: float,
    w_motor: float,
    w_non_motor: float,
    w_duration: float,
    non_motor_diary_ratio: float,
) -> float:
    """Build weighted severity proxy from components."""
    components = compute_severity_components(
        movement=movement,
        questionnaire=questionnaire,
        age=age,
        age_at_diagnosis=age_at_diagnosis,
        motor_mu=motor_mu,
        motor_sigma=motor_sigma,
        duration_mu=duration_mu,
        duration_sigma=duration_sigma,
        non_motor_diary_ratio=non_motor_diary_ratio,
    )
    
    total_w = max(1e-6, w_motor + w_non_motor + w_duration)
    z = (w_motor * components["motor"] + 
         w_non_motor * components["non_motor"] + 
         w_duration * components["duration"]) / total_w
    
    return float(np.clip(z, -1.0, 1.0))


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
    p.add_argument("--w-motor", type=float, default=0.55)
    p.add_argument("--w-non-motor", type=float, default=0.35)
    p.add_argument("--w-duration", type=float, default=0.10)
    p.add_argument("--non-motor-diary-ratio", type=float, default=0.5)
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

    # Fit duration normalization from available values.
    durations = []
    motor_raw_values = []
    for s in subjects:
        mov_path = movement_dir / f"{s.subject_id}_ml.bin"
        if mov_path.exists():
            try:
                movement = load_movement(mov_path)
                motor_raw_values.append(compute_motor_raw_from_movement(movement))
            except Exception:
                pass
        if s.age is not None and s.age_at_diagnosis is not None:
            durations.append(max(0.0, s.age - s.age_at_diagnosis))

    if motor_raw_values:
        m = np.asarray(motor_raw_values, dtype=np.float32)
        motor_mu = float(np.mean(m))
        motor_sigma = float(np.std(m))
    else:
        motor_mu = 0.0
        motor_sigma = 1.0

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
        z = build_severity_proxy(
            movement=movement,
            questionnaire=questionnaire,
            age=s.age,
            age_at_diagnosis=s.age_at_diagnosis,
            motor_mu=motor_mu,
            motor_sigma=motor_sigma,
            duration_mu=duration_mu,
            duration_sigma=duration_sigma,
            w_motor=args.w_motor,
            w_non_motor=args.w_non_motor,
            w_duration=args.w_duration,
            non_motor_diary_ratio=args.non_motor_diary_ratio,
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
