"""Persist separated stems as 16-bit WAV and summarise them for the UI."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from scipy.io import wavfile

from engine.model import Grid


def save(dirpath: Path, part: str, y: np.ndarray, sr: int, n_peaks: int = 1600, n_act: int = 800) -> dict:
    path = dirpath / f"{part}.wav"
    wavfile.write(str(path), sr, (np.clip(y, -1, 1) * 32767).astype(np.int16))
    edges = np.linspace(0, len(y), n_peaks + 1).astype(int)
    peaks = [[round(float(y[a:max(b, a + 1)].min()), 3), round(float(y[a:max(b, a + 1)].max()), 3)]
             for a, b in zip(edges[:-1], edges[1:])]
    e2 = np.linspace(0, len(y), n_act + 1).astype(int)
    rms = np.array([np.sqrt(np.mean(y[a:max(b, a + 1)] ** 2)) for a, b in zip(e2[:-1], e2[1:])])
    act = (rms / (np.percentile(rms, 98) + 1e-9)).clip(0, 1)
    return {"path": str(path), "peaks": peaks, "activity": [round(float(v), 3) for v in act],
            "duration": len(y) / sr, "rms": float(np.sqrt(np.mean(y ** 2)))}


def activity_fraction(y: np.ndarray, grid: Grid, n_bars: int, sr: int = 22050) -> float:
    """Fraction of bars in which the stem is clearly audible."""
    bar = int(grid.beat * grid.beats_per_bar * sr)
    if bar <= 0 or n_bars <= 0:
        return 0.0
    rms = np.array([np.sqrt(np.mean(y[max(0, int(grid.origin * sr) + b * bar): int(grid.origin * sr) + (b + 1) * bar] ** 2) + 1e-12)
                    for b in range(n_bars)])
    gate = max(0.15 * np.percentile(rms, 95), 0.01)   # absolute floor: an empty stem is not "active"
    return float((rms > gate).mean()) if rms.max() > 0.01 else 0.0


def save_mix(dirpath: Path, x: np.ndarray, sr: int = 44100) -> dict:
    """Playback copy of the whole track (stereo, 16-bit) so the UI can play it without touching the original file."""
    path = dirpath / "mix.wav"
    wavfile.write(str(path), sr, (np.clip(x.T, -1, 1) * 32767).astype(np.int16))
    return {"path": str(path), "peaks": [], "activity": [], "duration": x.shape[1] / sr, "rms": 0.0}
