from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np


def _metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, float]:
    yt = y_true.astype(np.float64)
    yp = y_pred.astype(np.float64)
    err = yp - yt
    mse = float(np.mean(err**2))
    mae = float(np.mean(np.abs(err)))
    var = float(np.var(yt))
    r2 = 0.0 if var <= 1e-12 else float(1.0 - mse / var)
    return {"mse": mse, "mae": mae, "r2": r2}


def _flatten_windows(x: np.ndarray) -> np.ndarray:
    return x.reshape(x.shape[0], -1)


def train_xgboost_regressor(
    x_train: np.ndarray,
    y_train: np.ndarray,
    x_val: np.ndarray,
    y_val: np.ndarray,
    seed: int = 7,
) -> Any:
    try:
        import xgboost as xgb
    except ImportError as exc:
        raise ImportError("xgboost missing. Install with: pip install '.[ml]'") from exc

    model = xgb.XGBRegressor(
        objective="reg:squarederror",
        n_estimators=500,
        learning_rate=0.03,
        max_depth=6,
        subsample=0.9,
        colsample_bytree=0.9,
        reg_lambda=2.0,
        tree_method="hist",
        random_state=seed,
    )
    model.fit(
        _flatten_windows(x_train),
        y_train,
        eval_set=[(_flatten_windows(x_val), y_val)],
        verbose=False,
    )
    return model


def eval_xgboost(model: Any, x: np.ndarray, y: np.ndarray) -> dict[str, float]:
    pred = np.asarray(model.predict(_flatten_windows(x)), dtype=np.float32)
    pred = np.tanh(pred)
    return _metrics(y, pred)


@dataclass(frozen=True)
class ChannelNorm:
    mean: np.ndarray
    std: np.ndarray

    def apply(self, x: np.ndarray) -> np.ndarray:
        return (x - self.mean) / self.std


def fit_channel_norm(x_train: np.ndarray) -> ChannelNorm:
    mean = np.mean(x_train, axis=(0, 1), keepdims=True)
    std = np.std(x_train, axis=(0, 1), keepdims=True)
    std = np.where(std < 1e-6, 1.0, std)
    return ChannelNorm(mean=mean.astype(np.float32), std=std.astype(np.float32))


def train_cnn_regressor(
    x_train: np.ndarray,
    y_train: np.ndarray,
    x_val: np.ndarray,
    y_val: np.ndarray,
    seed: int = 7,
    epochs: int = 30,
    batch_size: int = 64,
    lr: float = 1e-3,
) -> tuple[Any, ChannelNorm]:
    try:
        import torch
        from torch import nn
        from torch.utils.data import DataLoader, TensorDataset
    except ImportError as exc:
        raise ImportError("torch missing. Install with: pip install '.[ml]'") from exc

    torch.manual_seed(seed)
    np.random.seed(seed)

    norm = fit_channel_norm(x_train)
    x_train_n = norm.apply(x_train).astype(np.float32)
    x_val_n = norm.apply(x_val).astype(np.float32)

    train_ds = TensorDataset(
        torch.from_numpy(np.transpose(x_train_n, (0, 2, 1))),
        torch.from_numpy(y_train.astype(np.float32).reshape(-1, 1)),
    )
    val_x = torch.from_numpy(np.transpose(x_val_n, (0, 2, 1)))
    val_y = torch.from_numpy(y_val.astype(np.float32).reshape(-1, 1))
    loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)

    class CNNRegressor(nn.Module):
        def __init__(self) -> None:
            super().__init__()
            self.net = nn.Sequential(
                nn.Conv1d(9, 32, kernel_size=5, padding=2),
                nn.ReLU(),
                nn.Conv1d(32, 64, kernel_size=5, padding=2),
                nn.ReLU(),
                nn.Conv1d(64, 64, kernel_size=3, padding=1),
                nn.ReLU(),
                nn.AdaptiveAvgPool1d(1),
            )
            self.head = nn.Sequential(nn.Flatten(), nn.Linear(64, 32), nn.ReLU(), nn.Linear(32, 1), nn.Tanh())

        def forward(self, x: Any) -> Any:
            return self.head(self.net(x))

    model = CNNRegressor()
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)

    best_state: dict[str, Any] | None = None
    best_val = float("inf")
    patience = 6
    no_improve = 0
    for _ in range(epochs):
        model.train()
        for xb, yb in loader:
            optimizer.zero_grad(set_to_none=True)
            pred = model(xb)
            loss = criterion(pred, yb)
            loss.backward()
            optimizer.step()

        model.eval()
        with torch.no_grad():
            val_pred = model(val_x)
            val_loss = float(criterion(val_pred, val_y).item())
        if val_loss < best_val:
            best_val = val_loss
            best_state = {k: v.detach().clone() for k, v in model.state_dict().items()}
            no_improve = 0
        else:
            no_improve += 1
            if no_improve >= patience:
                break

    if best_state is not None:
        model.load_state_dict(best_state)
    return model, norm


def eval_cnn(model: Any, norm: ChannelNorm, x: np.ndarray, y: np.ndarray) -> dict[str, float]:
    try:
        import torch
    except ImportError as exc:
        raise ImportError("torch missing. Install with: pip install '.[ml]'") from exc

    x_n = norm.apply(x).astype(np.float32)
    xt = torch.from_numpy(np.transpose(x_n, (0, 2, 1)))
    model.eval()
    with torch.no_grad():
        pred = model(xt).cpu().numpy().reshape(-1)
    return _metrics(y, pred)
