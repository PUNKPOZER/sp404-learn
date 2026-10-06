"""Rhythm evidence from the EXISTING analysis (tempo + drum characteristics) as soft, wide, overlapping likelihoods.

Not rules: every label keeps a floor likelihood, tempo modes are wide Gaussians in log2-BPM space (so ½/× 2 readings of the
same pulse are scored separately and the best-fitting reading wins), and nothing here can by itself decide a genre — the model
carries the main weight in fusion. Centres/widths are conventions from the literature of each genre, listed in the open
(TEMPO_MODES) so they can be reviewed, tested and replaced by fitted values once the benchmark is large enough."""
from __future__ import annotations

import math

# label -> list of (centre BPM, sigma in log2 units). sigma .05 ≈ ±3.5 %.
TEMPO_MODES: dict[str, list[tuple[float, float]]] = {
    "footwork":      [(160, 0.06)],
    "jungle":        [(165, 0.06)],
    "drum_and_bass": [(174, 0.045)],
    "breakbeat":     [(125, 0.12)],
    "uk_garage":     [(133, 0.05)],
    "house":         [(124, 0.05)],
    "techno":        [(135, 0.09)],
    "hip_hop":       [(90, 0.11), (140, 0.04)],     # boom-bap pocket and the 140 half-time pocket
    "ambient":       [(100, 0.7)],                    # essentially tempo-agnostic
    "idm":           [(120, 0.5)],
    "dub":           [(70, 0.09), (140, 0.05)],
    "dubstep":       [(140, 0.04), (70, 0.04)],
    "trip_hop":      [(85, 0.12)],
}
FLOOR = 0.12


def _bump(x: float, mu: float, sigma: float) -> float:
    return math.exp(-0.5 * ((x - mu) / sigma) ** 2)


def tempo_likelihood(label: str, readings: list[tuple[float, float]]) -> float:
    """readings: [(bpm, weight)] — the engine's main reading plus its ½ / × 2 / other candidates at lower weight."""
    best = 0.0
    for bpm, w in readings:
        if bpm <= 0:
            continue
        x = math.log2(bpm)
        for c, s in TEMPO_MODES[label]:
            best = max(best, w * _bump(x, math.log2(c), s))
    return FLOOR + (1 - FLOOR) * best


def readings(bpm: float, candidates: list[float], alt_weight: float = 0.45) -> list[tuple[float, float]]:
    out = [(bpm, 1.0)]
    for c in candidates:
        if abs(c - bpm) / bpm > 0.04:
            out.append((c, alt_weight))
    return out


def _sig(x: float, mid: float, k: float) -> float:
    return 1 / (1 + math.exp(-(x - mid) * k))


def pattern_likelihood(label: str, c: dict) -> float:
    """Soft likelihood from drum-pattern characteristics (all in [0,1] or per-bar counts) — deliberately mild."""
    ff = c.get("four_on_floor", 0.0)
    sync = c.get("syncopation", 0.0)
    hats = c.get("hat_density", 0.0)
    if label in ("house", "techno"):
        v = 0.35 + 0.65 * _sig(ff, 0.45, 8)
    elif label in ("footwork", "uk_garage", "breakbeat", "jungle", "drum_and_bass", "idm", "dub"):
        v = 0.45 + 0.55 * (1 - _sig(ff, 0.55, 8)) * (0.6 + 0.4 * _sig(sync, 0.35, 6))
    elif label in ("hip_hop", "trip_hop"):
        v = 0.5 + 0.5 * (1 - _sig(ff, 0.5, 8))
    else:   # ambient: few hits is expected
        v = 0.5 + 0.5 * (1 - _sig(hats, 6.0, 0.6))
    return max(0.05, min(1.0, v))


def rhythm_loglik(labels: list[str], bpm: float, bpm_candidates: list[float], characteristics: dict, *, use_tempo=True, use_pattern=True) -> dict[str, float]:
    rd = readings(bpm, bpm_candidates)
    out = {}
    for g in labels:
        ll = 0.0
        if use_tempo:
            ll += math.log(tempo_likelihood(g, rd))
        if use_pattern:
            ll += math.log(pattern_likelihood(g, characteristics))
        out[g] = ll
    return out
