# Loss Model (XGBoost vs Conv1D)

This module compares two regressors for your severity proxy `z_true in [-1, 1]`:

- XGBoost on flattened windows `(T x 9) -> (T*9,)`
- Conv1D model:
  - input `(T x 9)`
  - Conv1D stack
  - global average pooling
  - dense head
  - `tanh` output
  - loss: MSE(`z_pred`, `z_true`)

## Expected dataset format

Use a `.npz` file with:

- `X`: shape `(N, T, 9)` (IMU windows)
- `y`: shape `(N,)` (severity proxy label in `[-1, 1]`)

Example:

```python
import numpy as np

X = np.random.randn(2000, 256, 9).astype(np.float32)
y = np.random.uniform(-1, 1, size=(2000,)).astype(np.float32)
np.savez("artifacts/loss_model/windows.npz", X=X, y=y)
```

## Install optional ML dependencies

```bash
pip install -e ".[ml]"
```

## Train and compare

```bash
python -m sim.loss_model.train_compare ^
  --dataset artifacts/loss_model/windows.npz ^
  --out-json artifacts/loss_model/metrics.json
```

Output includes train/val/test split sizes and test metrics (`mse`, `mae`, `r2`) for both models.

## Build dataset from PADS

If you already have `src/sim/PADS/preprocessed` generated, create windows directly:

```bash
python -m sim.loss_model.preprocessing ^
  --pads-preprocessed-dir src/sim/PADS/preprocessed ^
  --out src/sim/artifacts/loss_model/pads_windows.npz ^
  --window 256 ^
  --stride 128 ^
  --save-subject-id
```

Then train:

```bash
python -m sim.loss_model.train_compare ^
  --dataset src/sim/artifacts/loss_model/pads_windows.npz ^
  --out-json src/sim/artifacts/loss_model/metrics.json
```
