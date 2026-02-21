from __future__ import annotations

from pathlib import Path
from typing import Any

from hydra import compose, initialize_config_dir
from omegaconf import DictConfig, OmegaConf


def load_config(config_name: str = "default", overrides: list[str] | None = None) -> DictConfig:
    config_dir = Path(__file__).resolve().parent
    with initialize_config_dir(version_base=None, config_dir=str(config_dir)):
        return compose(config_name=config_name, overrides=overrides or [])


def to_container(cfg: DictConfig) -> dict[str, Any]:
    return OmegaConf.to_container(cfg, resolve=True)  # type: ignore[return-value]
