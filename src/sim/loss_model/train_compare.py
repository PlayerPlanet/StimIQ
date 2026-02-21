from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from sim.loss_model.data import load_window_dataset, split_dataset
from sim.loss_model.models import (
    eval_cnn,
    eval_xgboost,
    train_cnn_regressor,
    train_xgboost_regressor,
)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Train and compare XGBoost vs Conv1D regression on IMU windows.")
    p.add_argument("--dataset", type=str, required=True, help="Path to .npz with X:(N,T,9), y:(N,)")
    p.add_argument("--x-key", type=str, default="X")
    p.add_argument("--y-key", type=str, default="y")
    p.add_argument("--seed", type=int, default=7)
    p.add_argument("--train-ratio", type=float, default=0.7)
    p.add_argument("--val-ratio", type=float, default=0.15)
    p.add_argument("--cnn-epochs", type=int, default=30)
    p.add_argument("--cnn-batch-size", type=int, default=64)
    p.add_argument("--cnn-lr", type=float, default=1e-3)
    p.add_argument(
        "--out-json",
        type=str,
        default="",
        help="Optional metrics output path. If omitted, results are printed only.",
    )
    return p.parse_args()


def _print_report(results: dict[str, Any]) -> None:
    print("Split:")
    print(f"  train={results['split']['train']} val={results['split']['val']} test={results['split']['test']}")
    print("Metrics (test):")
    for model_name in ("xgboost", "cnn"):
        m = results[model_name]["test"]
        print(f"  {model_name:8s} mse={m['mse']:.6f} mae={m['mae']:.6f} r2={m['r2']:.6f}")


def main() -> None:
    args = parse_args()
    x, y = load_window_dataset(args.dataset, x_key=args.x_key, y_key=args.y_key)
    split = split_dataset(x, y, train_ratio=args.train_ratio, val_ratio=args.val_ratio, seed=args.seed)

    xgb_model = train_xgboost_regressor(
        split.x_train,
        split.y_train,
        split.x_val,
        split.y_val,
        seed=args.seed,
    )
    cnn_model, cnn_norm = train_cnn_regressor(
        split.x_train,
        split.y_train,
        split.x_val,
        split.y_val,
        seed=args.seed,
        epochs=args.cnn_epochs,
        batch_size=args.cnn_batch_size,
        lr=args.cnn_lr,
    )

    results: dict[str, Any] = {
        "split": {
            "train": int(split.x_train.shape[0]),
            "val": int(split.x_val.shape[0]),
            "test": int(split.x_test.shape[0]),
        },
        "xgboost": {
            "val": eval_xgboost(xgb_model, split.x_val, split.y_val),
            "test": eval_xgboost(xgb_model, split.x_test, split.y_test),
        },
        "cnn": {
            "val": eval_cnn(cnn_model, cnn_norm, split.x_val, split.y_val),
            "test": eval_cnn(cnn_model, cnn_norm, split.x_test, split.y_test),
        },
    }
    _print_report(results)

    if args.out_json:
        out_path = Path(args.out_json)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(results, indent=2), encoding="utf-8")
        print(f"Saved metrics: {out_path}")


if __name__ == "__main__":
    main()
