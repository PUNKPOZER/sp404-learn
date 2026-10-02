"""Band-wise onset detection on the (drum) signal.

Each *band* is detected separately so a kick and a hat landing on the same step are
two events, not one. Which instrument a band maps to is decided by the classifier.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy.ndimage import maximum_filter1d, median_filter
from scipy.signal import find_peaks

from engine.audio import spectro

BANDS = {            # Hz
    "low": (35, 160),
    "mid": (160, 1400),
    "upper": (1400, 6000),
    "high": (6000, 10500),
}


@dataclass
class Onset:
    time: float
    band: str
    strength: float      # prominence of the flux peak relative to its band's noise floor
    frame: int


def band_flux(S: np.ndarray, band: str, sr: int = spectro.SR) -> np.ndarray:
    lo, hi = BANDS[band]
    sl = spectro.band_slice(lo, hi, sr)
    L = np.log1p(200.0 * S[:, sl])
    ref = maximum_filter1d(L, size=3, axis=1)
    f = np.maximum(0.0, L[1:] - ref[:-1]).mean(axis=1)
    return np.concatenate([[0.0], f])


def detect(S: np.ndarray, sr: int = spectro.SR, min_gap: float = 0.035,
           sensitivity: float = 1.0, cluster_window: float = 0.03) -> list[Onset]:
    fps = sr / spectro.HOP
    out: list[Onset] = []
    for band in BANDS:
        f = band_flux(S, band, sr)
        if f.max() <= 0:
            continue
        floor = median_filter(f, size=int(fps * 0.5) | 1, mode="nearest")
        mad = np.median(np.abs(f - np.median(f))) + 1e-6
        thresh = floor + (4.0 / sensitivity) * mad + 0.04 * f.max()
        pk, props = find_peaks(f, height=thresh, distance=max(1, int(min_gap * fps)))
        for p, h in zip(pk, props["peak_heights"]):
            out.append(Onset(time=float(p / fps), band=band,
                             strength=float((h - floor[p]) / (f.max() + 1e-9)), frame=int(p)))
    out.sort(key=lambda o: o.time)
    return _cluster(out, cluster_window)


def _cluster(ons: list[Onset], window: float) -> list[Onset]:
    """Merge band onsets that land together into one hit; the classifier then decides
    which instruments (possibly several: kick + hat) that hit contains."""
    merged: list[Onset] = []
    for o in ons:
        if merged and o.time - merged[-1].time <= window:
            m = merged[-1]
            bands = m.band if o.band in m.band.split("+") else f"{m.band}+{o.band}"
            merged[-1] = Onset(time=m.time, band=bands, strength=max(m.strength, o.strength),
                               frame=m.frame)
        else:
            merged.append(o)
    return merged
