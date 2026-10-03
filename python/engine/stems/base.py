"""Stem separation seam. ``separate`` takes stereo float32 at 44.1 kHz, shape (2, n)."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Protocol

import numpy as np

# Part names shown to the user ("other" is the lead/harmony part)
PARTS = ["drums", "bass", "lead", "vocals"]
Progress = Callable[[float], None]


@dataclass
class StemResult:
    stems: dict[str, np.ndarray]   # part → mono float32 at ``sample_rate``
    sample_rate: int


class StemSeparator(Protocol):
    name: str

    def available(self) -> tuple[bool, str]: ...
    def separate(self, audio: np.ndarray, sample_rate: int, progress: Progress | None = None) -> StemResult: ...


class NullSeparator:
    name = "none"

    def available(self) -> tuple[bool, str]:
        return False, "Модель стемов не установлена — анализирую полный микс (хэты под снейром/бочкой и ноты баса менее надёжны)."

    def separate(self, audio, sample_rate, progress=None):
        raise RuntimeError("no separator available")


def default_separator() -> StemSeparator:
    try:
        from engine.stems.demucs_sep import DemucsSeparator
        return DemucsSeparator()
    except Exception:
        return NullSeparator()
