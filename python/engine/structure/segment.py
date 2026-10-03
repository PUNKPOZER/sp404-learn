"""Rough section detection on bar-level features. Approximate by design."""
from __future__ import annotations

import numpy as np
from scipy.signal import find_peaks

from engine.audio import spectro
from engine.model import DrumEvent, Grid, Section

MIN_BARS = 4


def bar_features(S: np.ndarray, grid: Grid, n_bars: int, events: list[DrumEvent], sr: int = spectro.SR):
    fps = sr / spectro.HOP
    bar = grid.beat * grid.beats_per_bar
    bands = [spectro.band_slice(35, 200, sr), spectro.band_slice(200, 2000, sr), spectro.band_slice(2000, 10500, sr)]
    F = np.zeros((n_bars, 4))
    for b in range(n_bars):
        i0 = int((grid.origin + b * bar) * fps)
        i1 = int((grid.origin + (b + 1) * bar) * fps)
        i0, i1 = max(0, i0), min(len(S), i1)
        if i1 <= i0:
            continue
        for k, sl in enumerate(bands):
            F[b, k] = np.log1p(S[i0:i1, sl].mean() * 50)
    for e in events:
        if 0 <= e.bar < n_bars:
            F[e.bar, 3] += 1
    F[:, 3] = np.log1p(F[:, 3])
    # which 16th-steps each voice family hits in each bar: lets two bars with the same loudness
    # but a different drum pattern count as different sections
    fam = {"KICK": 0, "SNARE": 1, "CLAP": 1, "CLOSED_HAT": 2, "OPEN_HAT": 2}
    P = np.zeros((n_bars, 48))
    for e in events:
        if 0 <= e.bar < n_bars and e.type in fam and e.confidence >= 0.3:
            P[e.bar, fam[e.type] * 16 + (e.step * 16 // 16)] = 1.0
    return np.hstack([F, P])


def segment(S, grid: Grid, events: list[DrumEvent], duration: float, sr: int = spectro.SR) -> list[Section]:
    bar = grid.beat * grid.beats_per_bar
    n_bars = int((duration - grid.origin) / bar)
    if n_bars < MIN_BARS * 2:
        return [Section("СЕКЦИЯ A", max(0, grid.origin), duration, 0, max(1, n_bars), "A")]
    F = bar_features(S, grid, n_bars, events, sr)
    Z = (F - F.mean(0)) / (F.std(0) + 1e-6)
    Z[:, 4:] *= 0.35          # pattern columns: many dims, so keep their total weight comparable
    w = MIN_BARS
    nov = np.zeros(n_bars)
    for b in range(w, n_bars - w + 1):
        nov[b] = np.linalg.norm(Z[b - w:b].mean(0) - Z[b:b + w].mean(0))
    pk, _ = find_peaks(nov, height=max(1.0, nov.mean() + 0.5 * nov.std()), distance=MIN_BARS)
    bounds = [0] + [int(p) for p in pk] + [n_bars]
    segs = [(a, b) for a, b in zip(bounds[:-1], bounds[1:]) if b > a]
    if not segs:
        return [Section("СЕКЦИЯ A", grid.origin, duration, 0, n_bars, "A")]
    means = np.array([Z[a:b].mean(0) for a, b in segs])
    # similarity clusters (greedy, threshold on distance)
    clusters: list[int] = []
    reps: list[np.ndarray] = []
    for m in means:
        for i, r in enumerate(reps):
            if np.linalg.norm(m - r) < 0.9:
                clusters.append(i)
                break
        else:
            reps.append(m)
            clusters.append(len(reps) - 1)
    energy = np.array([F[a:b, :3].sum(1).mean() for a, b in segs])
    density = np.array([F[a:b, 3].mean() for a, b in segs])
    out: list[Section] = []
    letters = "ABCD"
    for i, ((a, b), c) in enumerate(zip(segs, clusters)):
        if i == 0 and energy[i] < np.median(energy) * 0.9 and len(segs) > 2:
            label = "ИНТРО"
        elif i == len(segs) - 1 and energy[i] < np.median(energy) * 0.9 and len(segs) > 2:
            label = "АУТРО"
        elif np.expm1(density[i]) < 0.6 * np.expm1(density).mean() and len(segs) > 2:
            label = "БРЕЙК"
        elif energy[i] >= np.percentile(energy, 75) and len(segs) > 3:
            label = "ДРОП"
        else:
            label = f"СЕКЦИЯ {letters[min(c, 3)]}"
        out.append(Section(label, grid.origin + a * bar, grid.origin + b * bar, a, b,
                           letters[min(c, 3)], float(energy[i])))
    return out
