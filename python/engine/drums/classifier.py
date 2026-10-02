"""Drum classifier interface + first (heuristic) implementation.

``DrumClassifier`` is the replaceable seam: a learned model can implement the same
``classify`` contract later without touching the rest of the pipeline.
"""
from __future__ import annotations

from typing import Protocol

from engine.drums.onsets import Onset


class DrumClassifier(Protocol):
    name: str

    def classify(self, onset: Onset, feats: dict[str, float]) -> list[tuple[str, float]]:
        """Return [(drum_type, confidence)] for one hit (0..n entries; kick+hat can coexist)."""
        ...


def _clip(x, lo=0.0, hi=1.0):
    return max(lo, min(hi, x))


class HeuristicClassifier:
    """DSP rules over the *new* energy at each onset. Confidence expresses how cleanly the
    features match one role (and how strong the attack was), not a calibrated probability."""

    name = "heuristic-v1"

    def classify(self, onset: Onset, f: dict[str, float]) -> list[tuple[str, float]]:
        s = _clip(0.5 + onset.strength * 1.2)
        out: list[tuple[str, float]] = []
        low = f["sub"] + f["low"]
        rest_total = max(1e-9, 1.0 - low)
        if low >= 0.30:
            out.append(("KICK", _clip(s * (0.55 + 0.5 * low))))
            # a hat under a kick is swamped in the energy share, so trust the high-band onset itself
            if "high" in onset.band.split("+") and (f["high"] + f["air"]) >= 0.01 and f["air"] >= f["high"] * 0.8:
                kind = "OPEN_HAT" if f["decay_high"] >= 0.085 else "CLOSED_HAT"
                out.append((kind, _clip(s * 0.55)))
            if rest_total < 0.25:
                return out
        # renormalise what is left after the kick part
        body = (f["lowmid"] + f["mid"]) / rest_total          # 200-800 Hz
        nz = f["himid"] + f["upper"]                           # 800-3200 Hz (as share of all)
        nz /= rest_total
        top = (f["high"] + f["air"]) / rest_total              # 3200-10500 Hz
        air = f["air"] / rest_total                            # 6000+
        w = 0.6 if low >= 0.30 else 1.0                        # a hit under a kick is less certain

        if body >= 0.6:
            out.append(("PERCUSSION", _clip(s * 0.6 * w)))
        elif nz >= 0.40 and body < 0.10:
            out.append(("CLAP", _clip(s * (0.75 if f["bumps"] >= 2 else 0.65) * w)))
        elif top >= 0.5 and body + nz < 0.12 and air >= 0.55:
            if f["decay_high"] >= 0.085:
                out.append(("OPEN_HAT", _clip(s * 0.9 * w)))
            else:
                out.append(("CLOSED_HAT", _clip(s * 0.95 * w)))
        elif body + nz >= 0.15 and top >= 0.2:
            out.append(("SNARE", _clip(s * (0.7 + 0.3 * min(1.0, body * 4)) * w)))
        elif body + nz + top >= 0.5 and low < 0.30:
            out.append(("UNKNOWN", _clip(s * 0.3)))
        return out
