"""Monte Carlo exploration of the calculate_loss response range.

Randomly samples stimulation parameter matrices from the valid bounds defined
in configs/bayes.yaml and calls calculate_loss() for each sample. Reports
summary statistics and an ASCII histogram of the resulting distribution.

Usage (from src/backend/):
    python monte_carlo_loss.py [--n N] [--channels C] [--seed S] [--backend BACKEND]

Options:
    --n         Number of MC samples  (default: 30)
    --channels  Number of stim channels (default: 4)
    --seed      Base RNG seed          (default: 42)
    --backend   loss backend: cnn | xgboost (default: auto)
    --vary-patient  Re-seed the patient RNG for each sample (default: False)
"""
from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

import numpy as np

# ── make sure backend and sim packages are importable ─────────────────────────
_backend = Path(__file__).resolve().parent
_sim = _backend.parent / "sim"
for _p in [str(_backend), str(_sim)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

# ── parameter bounds (mirrors configs/bayes.yaml) ─────────────────────────────
BOUNDS = {
    "amp":            (0.0,   5.0),
    "freq_hz":        (20.0,  200.0),
    "pulse_width_s":  (1e-5,  2e-4),
    "phase_rad":      (0.0,   2 * np.pi),
}


def sample_params(rng: np.random.Generator, n_channels: int) -> np.ndarray:
    """Return a (4, n_channels) parameter matrix drawn uniformly within bounds."""
    rows = []
    for key in ("amp", "freq_hz", "pulse_width_s", "phase_rad"):
        lo, hi = BOUNDS[key]
        rows.append(rng.uniform(lo, hi, size=n_channels))
    return np.array(rows, dtype=np.float64)


def ascii_histogram(values: np.ndarray, n_bins: int = 16, width: int = 50) -> str:
    counts, edges = np.histogram(values, bins=n_bins)
    max_count = max(counts)
    lines = []
    for i, c in enumerate(counts):
        bar = "#" * int(width * c / max_count) if max_count > 0 else ""
        lines.append(f"  [{edges[i]:+.4f}, {edges[i+1]:+.4f})  {bar:<{width}}  {c}")
    return "\n".join(lines)


def run_mc(
    n: int = 30,
    n_channels: int = 4,
    seed: int = 42,
    backend: str | None = None,
    vary_patient: bool = False,
) -> np.ndarray:
    from loss.loss import calculate_loss

    rng = np.random.default_rng(seed)
    results: list[float] = []
    errors: list[str] = []

    print(f"\nRunning {n} Monte Carlo samples  "
          f"(channels={n_channels}, backend={'auto' if backend is None else backend}, "
          f"vary_patient={vary_patient})\n")

    for i in range(n):
        params = sample_params(rng, n_channels)

        # Optionally override the sim config seed so each call sees a different patient.
        extra: dict = {}
        if vary_patient:
            extra["seed_override"] = int(rng.integers(0, 2**31))

        t0 = time.perf_counter()
        try:
            loss_val = _call_loss(calculate_loss, params, backend, vary_patient, i, seed)
            elapsed = time.perf_counter() - t0
            results.append(loss_val)
            print(f"  [{i+1:3d}/{n}]  loss={loss_val:+.6f}  ({elapsed:.1f}s)")
        except Exception as exc:  # noqa: BLE001
            elapsed = time.perf_counter() - t0
            errors.append(str(exc))
            print(f"  [{i+1:3d}/{n}]  ERROR: {exc}  ({elapsed:.1f}s)")

    arr = np.array(results, dtype=np.float64)

    if arr.size == 0:
        print("\nNo successful samples – check errors above.")
        return arr

    print("\n" + "=" * 70)
    print("  Monte Carlo response range summary")
    print("=" * 70)
    print(f"  Samples (successful) : {arr.size} / {n}")
    print(f"  Min                  : {arr.min():+.6f}")
    print(f"  Max                  : {arr.max():+.6f}")
    print(f"  Range                : {arr.max() - arr.min():.6f}")
    print(f"  Mean                 : {arr.mean():+.6f}")
    print(f"  Std                  : {arr.std():+.6f}")
    print(f"  Median               : {np.median(arr):+.6f}")
    print(f"  p5  / p95            : {np.percentile(arr, 5):+.6f}  /  {np.percentile(arr, 95):+.6f}")
    print(f"  p25 / p75            : {np.percentile(arr, 25):+.6f}  /  {np.percentile(arr, 75):+.6f}")
    print()
    print("  Histogram:")
    print(ascii_histogram(arr))
    print("=" * 70)

    if errors:
        print(f"\n  {len(errors)} sample(s) failed.  First error: {errors[0]}")

    return arr


def _call_loss(
    calculate_loss,
    params: np.ndarray,
    backend: str | None,
    vary_patient: bool,
    sample_idx: int,
    base_seed: int,
) -> float:
    """Thin wrapper – optionally patches the config seed for patient variation."""
    if not vary_patient:
        return calculate_loss(params, backend)

    # Monkey-patch the sim config seed so the patient sampler is different.
    # We do this by temporarily overriding the load_config call via OmegaConf.
    # Simpler: just call calculate_loss_with_seed if we exposed one.
    # For now re-use a deterministic per-sample seed derived from base_seed + idx.
    from sim.config.runtime import load_config as _lc
    import omegaconf

    patient_seed = (base_seed * 1000 + sample_idx) % (2**31)
    original_lc = _lc

    # Patch at the module level temporarily
    import loss.loss as _ll
    _orig = _ll.calculate_loss  # reference kept alive

    # The cleanest approach: directly set the seed override in the sim config
    # by using the overrides mechanism in load_config.
    old_calculate_loss = calculate_loss  # identical object

    # Simplest: just let calculate_loss run as-is but pass seed as config override.
    # We reach inside the function by replacing the module-level load_config temporarily.
    import sim.config.runtime as _rt
    original = _rt.load_config

    def patched_load_config(overrides=None, **kw):
        overrides = list(overrides or [])
        overrides.append(f"seed={patient_seed}")
        return original(overrides=overrides, **kw)

    _rt.load_config = patched_load_config
    try:
        result = calculate_loss(params, backend)
    finally:
        _rt.load_config = original

    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Monte Carlo loss response range")
    parser.add_argument("--n", type=int, default=30, help="Number of MC samples")
    parser.add_argument("--channels", type=int, default=4, help="Stim channels")
    parser.add_argument("--seed", type=int, default=42, help="RNG seed")
    parser.add_argument("--backend", type=str, default=None, help="cnn | xgboost")
    parser.add_argument(
        "--vary-patient", action="store_true",
        help="Use a different patient for each sample (explores patient × stim variability)"
    )
    args = parser.parse_args()

    run_mc(
        n=args.n,
        n_channels=args.channels,
        seed=args.seed,
        backend=args.backend,
        vary_patient=args.vary_patient,
    )
