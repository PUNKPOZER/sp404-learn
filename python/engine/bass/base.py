"""Bass analysis seam (onsets, approximate pitch, duration, confidence)."""
from __future__ import annotations

from typing import Protocol

import numpy as np

from engine.model import BassNote


class BassAnalyzer(Protocol):
    name: str

    def available(self) -> tuple[bool, str]: ...
    def analyze(self, audio: np.ndarray, sample_rate: int) -> list[BassNote]: ...


class NullBassAnalyzer:
    name = "none"

    def available(self):
        return False, "Bass note analysis is not implemented yet."

    def analyze(self, audio, sample_rate):
        return []


def default_analyzer() -> BassAnalyzer:
    return NullBassAnalyzer()
