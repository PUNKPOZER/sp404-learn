"""Tempo estimation + beat grid.

Constant-tempo model: grid = origin + k * step. That is what the SP-404 sequencer
works with, and it keeps quantizing predictable. Half/double-time ambiguity is
reported through ``candidates`` so the UI can offer ÷2 / ×2.
"""
from __future__ import annotations

import numpy as np
from scipy.ndimage import maximum_filter1d, uniform_filter1d

from engine.audio import spectro
from engine.model import Grid


def normalize_bpm(bpm: float, lo: float = 70.0, hi: float = 180.0) -> float:
    """Fold a tempo by octaves into [lo, hi). Used for candidate generation, never silently applied."""
    if bpm <= 0:
        raise ValueError("bpm must be positive")
    while bpm < lo:
        bpm *= 2
    while bpm >= hi:
        bpm /= 2
    return bpm


def onset_envelope(S: np.ndarray) -> np.ndarray:
    """Spectral-flux onset strength (SuperFlux-style max filter over frequency)."""
    L = np.log1p(100.0 * S)
    ref = maximum_filter1d(L, size=3, axis=1)
    flux = np.maximum(0.0, L[1:] - ref[:-1]).sum(axis=1)
    flux = np.concatenate([[0.0], flux])
    return flux / (flux.max() + 1e-9)


def _autocorr_scores(env: np.ndarray, fps: float, lo: float, hi: float):
    n = len(env)
    e = env - env.mean()
    f = np.fft.rfft(e, 2 * n)
    ac = np.fft.irfft(f * np.conj(f))[:n]
    ac /= ac[0] + 1e-9
    bpms = np.arange(lo, hi, 0.25)
    lags = 60.0 * fps / bpms
    idx = np.clip(lags, 1, n - 2)
    base = np.interp(idx, np.arange(n), ac)
    score = base.copy()
    for mult, w in ((2, 0.5), (4, 0.25)):   # reward bars/beats lining up
        l2 = np.clip(lags * mult, 1, n - 2)
        score += w * np.interp(l2, np.arange(n), ac)
    prior = np.exp(-0.5 * (np.log2(bpms / 125.0) / 0.9) ** 2)  # broad: footwork 160 must survive
    return bpms, score * (0.4 + 0.6 * prior)


def _fold_score(env: np.ndarray, fps: float, bpm: float, bins: int = 64):
    period = 60.0 / bpm * fps
    ph = (np.arange(len(env)) % period) / period
    h = np.bincount((ph * bins).astype(int) % bins, weights=env, minlength=bins)
    h = np.convolve(np.concatenate([h[-2:], h, h[:2]]), np.ones(3) / 3, mode="same")[2:-2]
    return float(h.var() / (h.mean() ** 2 + 1e-9)), int(h.argmax()) / bins * 60.0 / bpm


def estimate_grid(y: np.ndarray, S: np.ndarray | None = None, sr: int = spectro.SR) -> tuple[Grid, np.ndarray]:
    """Returns (grid, onset_envelope). Origin is the best-fitting beat phase; downbeat is picked later."""
    S = spectro.magnitude(y, sr) if S is None else S
    env = onset_envelope(S)
    fps = sr / spectro.HOP
    if len(env) < fps * 4:
        raise ValueError("Track too short to estimate tempo (need at least 4 s).")

    bpms, score = _autocorr_scores(env, fps, 60.0, 200.0)
    # local maxima → candidate tempi
    order = np.argsort(score)[::-1]
    peaks: list[float] = []
    for i in order:
        b = float(bpms[i])
        if all(abs(b - p) / p > 0.04 for p in peaks):
            peaks.append(b)
        if len(peaks) >= 4:
            break
    coarse = peaks[0]
    # Multi-lag scoring favours the slow reading (more lags line up). If the double
    # tempo is also clearly periodic, prefer it when the slow reading is very slow:
    # users can still flip with ÷2 / ×2 via ``candidates``.
    if coarse < 90 and coarse * 2 <= 185:
        n = len(env)
        e0 = env - env.mean()
        ac = np.fft.irfft(np.abs(np.fft.rfft(e0, 2 * n)) ** 2)[:n]
        a1 = np.interp(60 * fps / coarse, np.arange(n), ac)
        a2 = np.interp(60 * fps / (coarse * 2), np.arange(n), ac)
        if a2 >= 0.3 * a1:
            peaks.insert(0, coarse)
            coarse *= 2

    # refine on a fold of the envelope around the coarse tempo
    best = (-1.0, coarse, 0.0)
    for b in np.arange(coarse * 0.97, coarse * 1.03, 0.05):
        sc, ph = _fold_score(env, fps, float(b))
        if sc > best[0]:
            best = (sc, float(b), ph)
    _, bpm, origin = best
    conf = float(np.clip(best[0] / 1.5, 0, 1))
    cands = sorted({round(bpm / 2, 2), round(bpm * 2, 2)} | {round(p, 2) for p in peaks[1:3]})
    grid = Grid(bpm=round(bpm, 3), origin=origin, candidates=[c for c in cands if 55 <= c <= 240],
                confidence=conf)
    return grid, env


def refine_with_onsets(grid: Grid, times: np.ndarray, weights: np.ndarray | None = None,
                       steps_per_beat: int = 4, iters: int = 3) -> Grid:
    """Robust linear fit of onset times to the 16th grid; corrects small BPM/phase error."""
    if len(times) < 8:
        return grid
    bpm, origin = grid.bpm, grid.origin
    for _ in range(iters):
        sd = 60.0 / bpm / steps_per_beat
        k = np.round((times - origin) / sd)
        res = times - (origin + k * sd)
        ok = np.abs(res) < sd * 0.3
        if ok.sum() < 8:
            break
        w = np.ones(ok.sum()) if weights is None else weights[ok]
        A = np.vstack([k[ok], np.ones(ok.sum())]).T * np.sqrt(w)[:, None]
        sol, *_ = np.linalg.lstsq(A, times[ok] * np.sqrt(w), rcond=None)
        sd_new, origin = float(sol[0]), float(sol[1])
        bpm = 60.0 / (sd_new * steps_per_beat)
    return Grid(bpm=round(bpm, 3), origin=origin, beats_per_bar=grid.beats_per_bar,
                candidates=grid.candidates, confidence=grid.confidence)


def pick_downbeat(grid: Grid, S: np.ndarray, sr: int = spectro.SR) -> Grid:
    """Choose which of the 4 beats is the bar start: the one with the most low-frequency attack."""
    low = spectro.band_slice(35, 160, sr)
    L = np.log1p(100 * S[:, low]).sum(axis=1)
    flux = np.maximum(0, np.diff(L, prepend=L[0]))
    fps = sr / spectro.HOP
    t = grid.origin + np.arange(0, int((len(flux) / fps - grid.origin) / grid.beat)) * grid.beat
    idx = np.clip((t * fps).astype(int), 0, len(flux) - 1)
    # take max in a ±30 ms window around each beat
    w = int(0.03 * fps)
    vals = np.array([flux[max(0, i - w): i + w + 1].max() for i in idx])
    sums = [vals[c::4].sum() for c in range(grid.beats_per_bar)]
    shift = int(np.argmax(sums))
    return Grid(bpm=grid.bpm, origin=grid.origin + shift * grid.beat, beats_per_bar=grid.beats_per_bar,
                candidates=grid.candidates, confidence=grid.confidence)
