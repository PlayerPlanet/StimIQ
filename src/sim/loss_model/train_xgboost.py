from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import numpy as np

from sim.loss_model.data import load_window_dataset, split_dataset
from sim.loss_model.models import eval_xgboost, save_xgboost, train_xgboost_regressor


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Train XGBoost regressor on IMU windows.")
    p.add_argument("--dataset", type=str, required=True, help="Path to .npz with X:(N,T,9), y:(N,)")
    p.add_argument("--x-key", type=str, default="X")
    p.add_argument("--y-key", type=str, default="y")
    p.add_argument("--seed", type=int, default=7)
    p.add_argument("--train-ratio", type=float, default=0.7)
    p.add_argument("--val-ratio", type=float, default=0.15)
    p.add_argument(
        "--max-samples",
        type=int,
        default=0,
        help="Optional cap on dataset size after loading (0 means no cap).",
    )
    p.add_argument(
        "--save-model",
        type=str,
        default="",
        help="Optional output path for XGBoost model JSON.",
    )
    p.add_argument(
        "--out-json",
        type=str,
        default="",
        help="Optional output path for metrics JSON.",
    )
    return p.parse_args()


def _print_report(results: dict[str, Any]) -> None:
    print("Split:")
    print(f"  train={results['split']['train']} val={results['split']['val']} test={results['split']['test']}")
    print("XGBoost metrics:")
    for split_name in ("val", "test"):
        m = results[split_name]
        print(f"  {split_name:4s} mse={m['mse']:.6f} mae={m['mae']:.6f} r2={m['r2']:.6f}")


def main() -> None:
    args = parse_args()
    x, y = load_window_dataset(args.dataset, x_key=args.x_key, y_key=args.y_key)

    if args.max_samples and args.max_samples > 0 and x.shape[0] > args.max_samples:
        rng = np.random.default_rng(args.seed)
        idx = rng.choice(x.shape[0], size=args.max_samples, replace=False)
        x = x[idx]
        y = y[idx]

    split = split_dataset(x, y, train_ratio=args.train_ratio, val_ratio=args.val_ratio, seed=args.seed)
    model = train_xgboost_regressor(
        split.x_train,
        split.y_train,
        split.x_val,
        split.y_val,
        seed=args.seed,
    )

    results: dict[str, Any] = {
        "split": {
            "train": int(split.x_train.shape[0]),
            "val": int(split.x_val.shape[0]),
            "test": int(split.x_test.shape[0]),
        },
        "val": eval_xgboost(model, split.x_val, split.y_val),
        "test": eval_xgboost(model, split.x_test, split.y_test),
    }
    _print_report(results)

    if args.save_model:
        save_path = Path(args.save_model)
        save_path.parent.mkdir(parents=True, exist_ok=True)
        save_xgboost(model, str(save_path))
        print(f"Saved model: {save_path}")

    if args.out_json:
        out_path = Path(args.out_json)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(results, indent=2), encoding="utf-8")
        print(f"Saved metrics: {out_path}")


if __name__ == "__main__":
    main()
