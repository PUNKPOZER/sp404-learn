"""Bass analysis seam (onsets, approximate pitch, duration, confidence)."""
from __future__ import annotations

from typing import Protocol

import numpy as np

from engine.model import BassNote, Grid


class BassAnalyzer(Protocol):
    name: str

    def available(self) -> tuple[bool, str]: ...
    def analyze(self, audio: np.ndarray, grid: Grid, resolution: int, from_stem: bool) -> list[BassNote]: ...


class PitchBassAnalyzer:
    """YIN-based monophonic tracker (numpy only). Best on a separated bass stem."""
    name = "yin-v1"

    def available(self):
        return True, ""

    def analyze(self, audio, grid, resolution=16, from_stem=True):
        from engine.bass import pitch
        y = audio
        if not from_stem:   # no stem: low-pass the mix so we at least look at the bass register
            from scipy.signal import butter, sosfiltfilt
            y = sosfiltfilt(butter(4, 300 / (pitch.SR / 2), "low", output="sos"), audio)
        return pitch.analyze(y, grid, resolution, conf_scale=1.0 if from_stem else 0.5)


def default_analyzer() -> BassAnalyzer:
    return PitchBassAnalyzer()
