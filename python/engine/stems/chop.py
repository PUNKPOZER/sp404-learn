"""Chop a separated stem into SP-404-ready samples.

``plan_*`` return regions [(start_s, end_s)] on the stem's own timeline; ``export_regions``
writes them as 16-bit / 48 kHz mono PCM WAV (what the SP-404 loads without conversion)."""
from __future__ import annotations

import re
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.ndimage import uniform_filter1d
from scipy.signal import find_peaks, resample_poly

OUT_SR = 48000
PRE_ROLL = 0.006      # keep the transient: start a few ms before the detected onset


def load(path: str) -> tuple[np.ndarray, int]:
    sr, y = wavfile.read(path)
    y = y.astype(np.float32) / (32768.0 if y.dtype == np.int16 else 1.0)
    return (y.mean(axis=1) if y.ndim == 2 else y), sr


def _env(y: np.ndarray, sr: int, win: float = 0.01) -> np.ndarray:
    return np.sqrt(np.maximum(uniform_filter1d(y.astype(np.float64) ** 2, max(1, int(win * sr))), 0.0))


def _gate(env: np.ndarray) -> float:
    return max(0.12 * float(np.percentile(env, 95)), 0.004)       # absolute floor: silence is not material


def plan_bars(y, sr, bpm: float, origin: float, n_bars: int = 2, beats_per_bar: int = 4) -> list[tuple[float, float]]:
    n_bars = max(1, int(n_bars))
    span = 60.0 / bpm * beats_per_bar * n_bars
    env = _env(y, sr)
    gate = _gate(env)
    out, t = [], origin - np.floor(origin / span) * span if origin > 0 else origin % span
    dur = len(y) / sr
    while t + span * 0.5 <= dur:
        a, b = t, min(dur, t + span)
        seg = env[int(a * sr): int(b * sr)]
        if len(seg) and seg.mean() > gate * 0.5:
            out.append((round(a, 4), round(b, 4)))
        t += span
    return out


def plan_phrases(y, sr, gap: float = 0.35, min_len: float = 0.25, max_len: float = 12.0) -> list[tuple[float, float]]:
    """Regions where the stem is sounding, split on silences longer than ``gap`` (vocal phrases)."""
    env = _env(y, sr, 0.02)
    on = env > _gate(env)
    idx = np.flatnonzero(np.diff(np.concatenate([[0], on.astype(np.int8), [0]])))
    segs = [(idx[i] / sr, idx[i + 1] / sr) for i in range(0, len(idx), 2)]
    merged: list[list[float]] = []
    for a, b in segs:
        if merged and a - merged[-1][1] < gap:
            merged[-1][1] = b
        else:
            merged.append([a, b])
    out = []
    for a, b in merged:
        a = max(0.0, a - 0.03); b = min(len(y) / sr, b + 0.08)    # tails sound natural with a little room
        if b - a < min_len:
            continue
        while b - a > max_len:                                    # split very long phrases at the quietest point near max_len
            lo, hi = int((a + max_len * 0.6) * sr), int((a + max_len) * sr)
            cut = (lo + int(np.argmin(env[lo:hi]))) / sr
            out.append((round(a, 4), round(cut, 4))); a = cut
        out.append((round(a, 4), round(b, 4)))
    return out


def plan_hits(y, sr, min_len: float = 0.12, max_len: float = 4.0, sensitivity: float = 1.0) -> list[tuple[float, float]]:
    """Onset to next onset: one sample per note/stab (lead, plucks)."""
    env = _env(y, sr, 0.008)
    flux = np.maximum(0, np.diff(np.log1p(60 * env), prepend=0))
    flux = uniform_filter1d(flux, max(1, int(0.004 * sr)))
    pos = flux[flux > 0]
    thr = max(0.12 * (np.percentile(pos, 99) if len(pos) else 0.0) / sensitivity, 1e-3)
    pk, _ = find_peaks(flux, height=thr, distance=max(1, int(min_len * sr)))
    gate = _gate(env)
    pk = [p for p in pk if env[min(len(env) - 1, p + int(0.03 * sr))] > gate]
    out = []
    for i, p in enumerate(pk):
        a = max(0.0, p / sr - PRE_ROLL)
        nxt = pk[i + 1] / sr - PRE_ROLL if i + 1 < len(pk) else len(y) / sr
        b = min(nxt, a + max_len)
        # trim trailing silence
        seg = env[int(a * sr): int(b * sr)]
        live = np.flatnonzero(seg > gate * 0.6)
        if len(live):
            b = a + (live[-1] + int(0.02 * sr)) / sr
        if b - a >= min_len:
            out.append((round(a, 4), round(b, 4)))
    return out


def plan(y, sr, mode: str, bpm: float, origin: float, **kw) -> list[tuple[float, float]]:
    if mode == "whole":
        return [(0.0, round(len(y) / sr, 4))]
    if mode == "bars":
        return plan_bars(y, sr, bpm, origin, kw.get("bars", 2))
    if mode == "phrases":
        return plan_phrases(y, sr, kw.get("gap", 0.35))
    if mode == "hits":
        return plan_hits(y, sr, sensitivity=kw.get("sensitivity", 1.0))
    raise ValueError(f"unknown chop mode {mode!r}")


def _safe(name: str) -> str:
    return re.sub(r"[^\w\-. ]+", "_", name).strip(" .") or "track"


def export_regions(y, sr, regions, outdir: str, basename: str, normalize: bool = False) -> list[str]:
    """Write each region as 16-bit/48 kHz mono WAV: <basename>_01.wav, _02.wav, …"""
    d = Path(outdir)
    d.mkdir(parents=True, exist_ok=True)
    files = []
    pad = max(2, len(str(len(regions))))
    for i, (a, b) in enumerate(regions, 1):
        seg = y[max(0, int(a * sr)): min(len(y), int(b * sr))].astype(np.float32)
        if len(seg) < 8:
            continue
        if sr != OUT_SR:
            seg = resample_poly(seg, OUT_SR, sr).astype(np.float32)
        n_in, n_out = min(len(seg) // 2, int(0.003 * OUT_SR)), min(len(seg) // 2, int(0.01 * OUT_SR))
        if n_in:
            seg[:n_in] *= np.linspace(0, 1, n_in)
        if n_out:
            seg[-n_out:] *= np.linspace(1, 0, n_out)
        if normalize and np.abs(seg).max() > 1e-6:
            seg *= 0.891 / np.abs(seg).max()           # peak -1 dBFS
        name = f"{_safe(basename)}.wav" if len(regions) == 1 else f"{_safe(basename)}_{i:0{pad}d}.wav"
        p = d / name
        wavfile.write(str(p), OUT_SR, (np.clip(seg, -1, 1) * 32767).astype(np.int16))
        files.append(str(p))
    return files
