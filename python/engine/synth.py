"""Tiny numpy drum synth. Used to generate synthetic test material and demo fixtures
(no copyrighted audio anywhere in the repo)."""
from __future__ import annotations

import numpy as np
from scipy.signal import butter, sosfilt

SR = 22050
_rng = np.random.default_rng(404)


def _env(n, decay):
    return np.exp(-np.arange(n) / (decay * SR))


def _noise(n):
    return _rng.standard_normal(n)


def _hp(x, fc, sr=SR):
    return sosfilt(butter(4, fc / (sr / 2), "high", output="sos"), x)


def _bp(x, lo, hi, sr=SR):
    return sosfilt(butter(2, [lo / (sr / 2), hi / (sr / 2)], "band", output="sos"), x)


def kick(sr=SR):
    n = int(0.35 * sr)
    t = np.arange(n) / sr
    f = 45 + 110 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / sr) * _env(n, 0.12) * 0.95


def snare(sr=SR):
    n = int(0.25 * sr)
    t = np.arange(n) / sr
    body = np.sin(2 * np.pi * 190 * t) * _env(n, 0.05)
    nz = _hp(_noise(n), 1500) * _env(n, 0.07)
    return (0.5 * body + 0.7 * nz) * 0.8


def clap(sr=SR):
    n = int(0.22 * sr)
    out = np.zeros(n)
    for off in (0.0, 0.011, 0.023):
        k = int(off * sr)
        seg = _bp(_noise(n - k), 900, 4500) * _env(n - k, 0.012)
        out[k:] += seg
    tail = _bp(_noise(n), 900, 4500) * _env(n, 0.07) * 0.6
    tail[: int(0.03 * sr)] = 0
    return (out + tail) * 0.9


def chat(sr=SR):
    n = int(0.06 * sr)
    return _hp(_noise(n), 7000) * _env(n, 0.012) * 0.45


def ohat(sr=SR):
    n = int(0.4 * sr)
    return _hp(_noise(n), 7000) * _env(n, 0.13) * 0.45


def perc(sr=SR):
    n = int(0.12 * sr)
    t = np.arange(n) / sr
    return np.sin(2 * np.pi * 640 * t) * _env(n, 0.03) * 0.6


VOICES = {"KICK": kick, "SNARE": snare, "CLAP": clap, "CLOSED_HAT": chat,
          "OPEN_HAT": ohat, "PERCUSSION": perc}


def render_pattern(pattern: dict[str, list[int]], bpm: float, bars: int = 4,
                   lead_in: float = 0.0, swing_ms: dict[int, float] | None = None,
                   sr=SR) -> np.ndarray:
    """pattern: voice -> 1-based steps (1..16). Returns mono float32."""
    step = 60.0 / bpm / 4
    total = int((lead_in + bars * 16 * step + 0.6) * sr)
    y = np.zeros(total)
    for voice, steps in pattern.items():
        smp = VOICES[voice](sr)
        for b in range(bars):
            for s in steps:
                t = lead_in + (b * 16 + s - 1) * step + (swing_ms or {}).get(s, 0.0) / 1000
                i = int(round(t * sr))
                seg = smp[: max(0, total - i)]
                y[i:i + len(seg)] += seg
    m = np.abs(y).max()
    return (y / m * 0.9).astype(np.float32) if m > 0 else y.astype(np.float32)


def write_wav(path: str, y: np.ndarray, sr=SR):
    from scipy.io import wavfile
    wavfile.write(path, sr, (np.clip(y, -1, 1) * 32767).astype(np.int16))


FOOTWORK_DEMO = {
    "KICK": [1, 4, 7, 11, 16], "CLAP": [5, 13], "SNARE": [8, 15],
    "CLOSED_HAT": [1, 3, 5, 7, 9, 11, 13, 15], "OPEN_HAT": [], "PERCUSSION": [2, 6, 10, 14],
}
