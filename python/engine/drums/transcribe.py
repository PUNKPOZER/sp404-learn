"""Drum transcription: onsets → features → classifier → grid position → confidence filter."""
from __future__ import annotations

import numpy as np

from engine.audio import spectro
from engine.drums import features, onsets as onset_mod
from engine.drums.classifier import DrumClassifier, HeuristicClassifier
from engine.model import DrumEvent, Grid
from translator.quantizer import quantize_time

# Allowed to coexist at one grid slot; same-type duplicates collapse to the strongest.
COINCIDE_WINDOW = 0.03


def raw_events(S: np.ndarray, classifier: DrumClassifier | None = None,
               sr: int = spectro.SR) -> list[tuple[float, str, float, float]]:
    """(time, type, confidence, velocity) without any grid knowledge."""
    clf = classifier or HeuristicClassifier()
    ons = onset_mod.detect(S, sr)
    out = []
    for o in ons:
        f = features.extract(S, o.frame, sr)
        for typ, conf in clf.classify(o, f):
            vel = float(np.clip(0.35 + o.strength * 1.8, 0.2, 1.0))
            out.append((o.time, typ, conf, vel))
    # coincident hat under a snare/clap is usually the snare's own noise → down-weight
    pts = [(t, ty) for t, ty, *_ in out]
    fixed = []
    for t, ty, c, v in out:
        if ty in ("CLOSED_HAT", "OPEN_HAT") and any(
                abs(t - t2) < COINCIDE_WINDOW and ty2 in ("SNARE", "CLAP") for t2, ty2 in pts):
            c *= 0.55
        fixed.append((t, ty, c, v))
    return fixed


def to_events(raw, grid: Grid, resolution: int = 16, min_confidence: float = 0.25) -> list[DrumEvent]:
    ev: list[DrumEvent] = []
    seen: dict[tuple[int, int, str], DrumEvent] = {}
    for t, ty, c, v in raw:
        if c < min_confidence:
            continue
        q = quantize_time(t, grid.bpm, grid.origin, resolution, grid.beats_per_bar)
        if q.bar < 0:
            continue
        key = (q.bar, q.step, ty)
        e = DrumEvent(id="", time=t, type=ty, confidence=round(float(c), 3), velocity=round(v, 3),
                      bar=q.bar, step=q.step, quantized_time=q.quantized_time,
                      timing_offset=q.timing_offset)
        if key not in seen or c > seen[key].confidence:
            seen[key] = e
    ev = sorted(seen.values(), key=lambda e: (e.time, e.type))
    for i, e in enumerate(ev):
        e.id = f"e{i}"
    return ev


def requantize(events: list[DrumEvent], grid: Grid, resolution: int = 16) -> None:
    """Re-place existing events after BPM/grid/resolution edits, keeping original times."""
    for e in events:
        if e.manual and e.time < 0:
            continue
        q = quantize_time(e.time, grid.bpm, grid.origin, resolution, grid.beats_per_bar)
        e.bar, e.step, e.quantized_time, e.timing_offset = q.bar, q.step, q.quantized_time, q.timing_offset
