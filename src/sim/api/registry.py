from __future__ import annotations

from collections.abc import Callable
from typing import Any


class Registry:
    def __init__(self) -> None:
        self._items: dict[str, Callable[..., Any]] = {}

    def register(self, name: str, factory: Callable[..., Any]) -> None:
        if name in self._items:
            raise ValueError(f"Factory already registered: {name}")
        self._items[name] = factory

    def create(self, name: str, **kwargs: Any) -> Any:
        if name not in self._items:
            raise KeyError(f"Unknown registry key: {name}")
        return self._items[name](**kwargs)

    def keys(self) -> list[str]:
        return sorted(self._items.keys())


registry = Registry()
