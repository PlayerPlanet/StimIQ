from __future__ import annotations

import numpy as np

from sim.loss_model.data import load_window_dataset, split_dataset


def test_split_dataset_shapes() -> None:
    x = np.zeros((100, 128, 9), dtype=np.float32)
    y = np.linspace(-1.0, 1.0, num=100, dtype=np.float32)
    split = split_dataset(x, y, train_ratio=0.7, val_ratio=0.15, seed=1)
    assert split.x_train.shape[0] == 70
    assert split.x_val.shape[0] == 15
    assert split.x_test.shape[0] == 15
    assert split.x_train.shape[1:] == (128, 9)


def test_load_window_dataset_npz(tmp_path) -> None:
    x = np.random.randn(12, 64, 9).astype(np.float32)
    y = np.random.uniform(-1.0, 1.0, size=(12,)).astype(np.float32)
    path = tmp_path / "dataset.npz"
    np.savez(path, X=x, y=y)
    x2, y2 = load_window_dataset(path)
    assert x2.shape == (12, 64, 9)
    assert y2.shape == (12,)
