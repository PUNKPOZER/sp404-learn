"""Monophonic bass note tracker: YIN pitch → median smoothing → note segmentation → grid."""
from __future__ import annotations

import numpy as np
from scipy.ndimage import median_filter, uniform_filter1d

from engine.model import BassNote, Grid
from translator.quantizer import quantize_time

SR = 22050
FRAME = 2048
HOP = 256
FMIN, FMAX = 28.0, 330.0
W = 1024


def _yin(y: np.ndarray, thresh: float = 0.18):
    """Returns (freq[n], clarity[n], rms[n]) per hop. freq=0 when unvoiced."""
    tau_max = int(SR / FMIN)
    tau_min = int(SR / FMAX)
    n = max(0, (len(y) - FRAME) // HOP)
    f0 = np.zeros(n); clarity = np.zeros(n); rms = np.zeros(n)
    taus = np.arange(tau_max + 1)
    for c0 in range(0, n, 1500):
        idx = np.arange(c0, min(n, c0 + 1500))
        fr = np.stack([y[i * HOP: i * HOP + FRAME] for i in idx])        # (m, FRAME)
        a = fr[:, :W]
        rms[idx] = np.sqrt((a ** 2).mean(1))
        # difference function via FFT: d(t) = sum(a^2) + sum(shifted^2) - 2*xcorr
        F = np.fft.rfft(fr, 4096, axis=1)
        A = np.fft.rfft(a, 4096, axis=1)
        xc = np.fft.irfft(np.conj(A) * F, 4096, axis=1)[:, : tau_max + 1]
        cs = np.concatenate([np.zeros((len(idx), 1)), np.cumsum(fr ** 2, axis=1)], axis=1)
        e0 = cs[:, W][:, None]
        et = cs[:, W + taus] - cs[:, taus]
        d = e0 + et - 2 * xc
        cm = np.cumsum(d[:, 1:], axis=1) / taus[1:]
        dn = np.ones_like(d); dn[:, 1:] = d[:, 1:] / (cm + 1e-12)
        for k, i in enumerate(idx):
            row = dn[k]
            cand = np.where(row[tau_min:] < thresh)[0]
            if len(cand):
                t = cand[0] + tau_min
                while t + 1 <= tau_max and row[t + 1] < row[t]:
                    t += 1
                if 1 < t < tau_max:                       # parabolic refinement
                    a0, b0, c1 = row[t - 1], row[t], row[t + 1]
                    den = a0 - 2 * b0 + c1
                    t = t + (0.5 * (a0 - c1) / den if abs(den) > 1e-12 else 0.0)
                f0[i] = SR / t; clarity[i] = 1 - min(1.0, row[int(round(t))])
    return f0, clarity, rms


def _onset(env: np.ndarray, start: int, back: int, fwd: int) -> float:
    """Amplitude onset near the voiced start: first point in the window crossing 25 % of its peak.
    (Pitch voicing lags the true attack by up to a window length.)"""
    a, b = max(0, start - back), min(len(env), start + fwd)
    seg = env[a:b]
    if len(seg) == 0:
        return start / SR
    thr = 0.25 * seg.max()
    k = int(np.argmax(seg > thr))
    if k == 0 and seg[0] > thr:           # already sounding: previous note's tail / legato
        return (start + 0.02 * SR) / SR
    return (a + k) / SR


def analyze(y: np.ndarray, grid: Grid | None = None, resolution: int = 16, conf_scale: float = 1.0) -> list[BassNote]:
    y = y.astype(np.float32)
    f0, clar, rms = _yin(y)
    if len(f0) == 0:
        return []
    gate = max(1e-4, 0.08 * np.percentile(rms, 95))
    voiced = (f0 > 0) & (rms > gate)
    midi = np.where(voiced, 69 + 12 * np.log2(np.maximum(f0, 1e-3) / 440.0), np.nan)
    m = np.nan_to_num(midi, nan=0.0)
    sm = median_filter(m, size=5, mode="nearest")
    midi = np.where(voiced, sm, np.nan)
    fps = SR / HOP
    env = uniform_filter1d(np.abs(y), int(0.005 * SR))   # 5 ms amplitude envelope for onset timing

    notes: list[BassNote] = []
    i, n = 0, len(midi)
    while i < n:
        if np.isnan(midi[i]):
            i += 1; continue
        start = i
        ref = [midi[i]]
        j = i + 1
        while j < n and not np.isnan(midi[j]):
            r = np.median(ref[-8:])
            # a jump of a semitone or more, or a fresh amplitude attack, starts a new note
            if abs(midi[j] - r) >= 0.8 or rms[j] > 1.6 * rms[j - 1] and rms[j] > 1.5 * np.median(rms[max(start, j - 6):j]):
                break
            ref.append(midi[j]); j += 1
        dur = (j - start) / fps
        if dur >= 0.05:
            note = int(round(float(np.median(ref))))
            conf = float(np.clip(clar[start:j].mean() * conf_scale, 0, 1))
            t = _onset(env, start * HOP, int(0.06 * SR), FRAME)
            bn = BassNote(time=float(t), duration=float(dur), midi=note, confidence=round(conf, 3))
            if grid is not None:
                q = quantize_time(bn.time, grid.bpm, grid.origin, resolution, grid.beats_per_bar)
                bn.bar, bn.step = q.bar, q.step
            if bn.bar >= 0:            # notes before the first bar of the grid are dropped
                notes.append(bn)
        i = max(j, i + 1)
    # merge same-pitch fragments separated by tiny gaps
    merged: list[BassNote] = []
    for b in notes:
        if merged and b.midi == merged[-1].midi and b.time - (merged[-1].time + merged[-1].duration) < 0.03:
            p = merged[-1]; p.duration = b.time + b.duration - p.time
        else:
            merged.append(b)
    return merged
