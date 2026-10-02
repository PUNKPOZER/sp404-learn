"""Stem separation seam. No ML model is bundled yet: ``NullSeparator`` reports itself
unavailable so the pipeline falls back to analysing the full mix."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

import numpy as np


@dataclass
class StemResult:
    drums: np.ndarray | None
    bass: np.ndarray | None
    vocals: np.ndarray | None
    other: np.ndarray | None
    sample_rate: int


class StemSeparator(Protocol):
    name: str

    def available(self) -> tuple[bool, str]: ...
    def separate(self, audio: np.ndarray, sample_rate: int) -> StemResult: ...


class NullSeparator:
    name = "none"

    def available(self) -> tuple[bool, str]:
        return False, "No stem-separation model installed — analysing the full mix (hats under snares/kicks are less reliable)."

    def separate(self, audio, sample_rate):
        raise RuntimeError("no separator available")


def default_separator() -> StemSeparator:
    return NullSeparator()
