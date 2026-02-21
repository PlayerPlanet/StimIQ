from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np


def build_cnn_regressor_v1() -> Any:
    try:
        from torch import nn
    except ImportError as exc:
        raise ImportError("torch missing. Install with: pip install '.[ml]'") from exc

    class _CNNRegressorV1(nn.Module):
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

    return _CNNRegressorV1()


def build_cnn_regressor() -> Any:
    try:
        from torch import nn
    except ImportError as exc:
        raise ImportError("torch missing. Install with: pip install '.[ml]'") from exc

    class _ResidualBlock(nn.Module):
        def __init__(self, in_ch: int, out_ch: int, dilation: int = 1, dropout: float = 0.1) -> None:
            super().__init__()
            padding = dilation
            self.conv1 = nn.Conv1d(in_ch, out_ch, kernel_size=3, padding=padding, dilation=dilation)
            self.bn1 = nn.BatchNorm1d(out_ch)
            self.conv2 = nn.Conv1d(out_ch, out_ch, kernel_size=3, padding=padding, dilation=dilation)
            self.bn2 = nn.BatchNorm1d(out_ch)
            self.act = nn.GELU()
            self.drop = nn.Dropout(dropout)
            self.skip = nn.Identity() if in_ch == out_ch else nn.Conv1d(in_ch, out_ch, kernel_size=1)

        def forward(self, x: Any) -> Any:
            residual = self.skip(x)
            h = self.conv1(x)
            h = self.bn1(h)
            h = self.act(h)
            h = self.drop(h)
            h = self.conv2(h)
            h = self.bn2(h)
            h = self.drop(h)
            return self.act(h + residual)

    class _CNNRegressor(nn.Module):
        def __init__(self) -> None:
            super().__init__()
            self.net = nn.Sequential(
                nn.Conv1d(9, 32, kernel_size=5, padding=2),
                nn.BatchNorm1d(32),
                nn.GELU(),
                _ResidualBlock(32, 32, dilation=1, dropout=0.10),
                _ResidualBlock(32, 64, dilation=1, dropout=0.10),
                _ResidualBlock(64, 64, dilation=2, dropout=0.12),
                _ResidualBlock(64, 96, dilation=2, dropout=0.15),
                _ResidualBlock(96, 128, dilation=4, dropout=0.15),
                nn.AdaptiveAvgPool1d(1),
            )
            self.head = nn.Sequential(
                nn.Flatten(),
                nn.Linear(128, 64),
                nn.GELU(),
                nn.Dropout(0.2),
                nn.Linear(64, 32),
                nn.GELU(),
                nn.Linear(32, 1),
                nn.Tanh(),
            )

        def forward(self, x: Any) -> Any:
            return self.head(self.net(x))

    return _CNNRegressor()


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

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    use_cuda = device.type == "cuda"

    train_ds = TensorDataset(
        torch.from_numpy(np.transpose(x_train_n, (0, 2, 1))),
        torch.from_numpy(y_train.astype(np.float32).reshape(-1, 1)),
    )
    val_x = torch.from_numpy(np.transpose(x_val_n, (0, 2, 1))).to(device)
    val_y = torch.from_numpy(y_val.astype(np.float32).reshape(-1, 1)).to(device)
    loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, pin_memory=use_cuda)

    model = build_cnn_regressor().to(device)
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    try:
        from tqdm.auto import trange
    except ImportError:
        trange = range

    best_state: dict[str, Any] | None = None
    best_val = float("inf")
    patience = 6
    no_improve = 0
    epoch_iter = trange(epochs, desc="CNN train", unit="epoch")
    for _ in epoch_iter:
        model.train()
        for xb, yb in loader:
            xb = xb.to(device, non_blocking=use_cuda)
            yb = yb.to(device, non_blocking=use_cuda)
            optimizer.zero_grad(set_to_none=True)
            pred = model(xb)
            loss = criterion(pred, yb)
            loss.backward()
            optimizer.step()

        model.eval()
        with torch.no_grad():
            val_pred = model(val_x)
            val_loss = float(criterion(val_pred, val_y).item())
        if hasattr(epoch_iter, "set_postfix"):
            epoch_iter.set_postfix(val_loss=f"{val_loss:.5f}", best=f"{best_val:.5f}")
        if val_loss < best_val:
            best_val = val_loss
            best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}
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
    device = next(model.parameters()).device
    xt = torch.from_numpy(np.transpose(x_n, (0, 2, 1))).to(device)
    model.eval()
    with torch.no_grad():
        pred = model(xt).cpu().numpy().reshape(-1)
    return _metrics(y, pred)


def save_xgboost(model: Any, path: str) -> None:
    from pathlib import Path

    out = Path(path)
    out.parent.mkdir(parents=True, exist_ok=True)
    model.save_model(str(out))


def save_cnn(model: Any, norm: ChannelNorm, path: str, meta: dict[str, Any] | None = None) -> None:
    from pathlib import Path

    try:
        import torch
    except ImportError as exc:
        raise ImportError("torch missing. Install with: pip install '.[ml]'") from exc

    out = Path(path)
    out.parent.mkdir(parents=True, exist_ok=True)
    payload: dict[str, Any] = {
        "model_state_dict": model.state_dict(),
        "norm_mean": norm.mean,
        "norm_std": norm.std,
        "meta": {} if meta is None else meta,
    }
    torch.save(payload, out)
