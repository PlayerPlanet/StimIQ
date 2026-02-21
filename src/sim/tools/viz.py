from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Plot 3D IMU trajectory from a patient CSV file")
    parser.add_argument("csv", type=Path, help="Path to patient CSV (e.g. patient_00000.csv)")
    parser.add_argument("--save", type=Path, default=None, help="Optional output image path")
    parser.add_argument("--title", type=str, default="IMU 3D Path")
    parser.add_argument("--no-show", action="store_true", help="Do not open an interactive plot window")
    return parser.parse_args()


def load_imu_csv(path: Path) -> np.ndarray:
    return np.loadtxt(path, delimiter=",", skiprows=1)


def plot_imu_path(csv_path: Path, title: str = "IMU 3D Path"):
    try:
        import matplotlib.pyplot as plt
    except ImportError as exc:
        raise ImportError("matplotlib is required for visualization. Install with: pip install matplotlib") from exc

    arr = load_imu_csv(csv_path)
    if arr.ndim != 2 or arr.shape[1] < 4:
        raise ValueError("CSV must contain columns: t,pos_x,pos_y,pos_z,...")

    x = arr[:, 1]
    y = arr[:, 2]
    z = arr[:, 3]

    fig = plt.figure(figsize=(8, 6))
    ax = fig.add_subplot(111, projection="3d")
    ax.plot(x, y, z, linewidth=1.2)
    ax.scatter(x[0], y[0], z[0], s=30, label="start")
    ax.scatter(x[-1], y[-1], z[-1], s=30, label="end")
    ax.set_xlabel("X")
    ax.set_ylabel("Y")
    ax.set_zlabel("Z")
    ax.set_title(title)
    ax.legend(loc="best")
    return fig


def main() -> None:
    args = _parse_args()
    fig = plot_imu_path(args.csv, title=args.title)
    if args.save is not None:
        args.save.parent.mkdir(parents=True, exist_ok=True)
        fig.savefig(args.save, dpi=150, bbox_inches="tight")
    if not args.no_show:
        import matplotlib.pyplot as plt

        plt.show()


if __name__ == "__main__":
    main()
