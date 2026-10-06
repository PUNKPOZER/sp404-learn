"""Adapters: run an analysis system on one file and return a normalised result dict for scoring.

Result shape (all optional except `system`):
  {"system", "seconds", "bpm", "bpm_candidates", "beats": [s], "downbeat_origin": s, "genre": {"candidates": [{"genre","confidence"}]},
   "key": "F# minor"|None, "drums": [{"time","type","confidence"}], "sections": [boundary seconds], "warnings": [..]}
Genre Engine 2.0 / Analysis 2.0 will register further adapters here, so every system is scored by the same code."""
from __future__ import annotations

import time

import numpy as np

SYSTEMS: dict[str, callable] = {}


def register(name):
    def deco(fn):
        SYSTEMS[name] = fn
        return fn
    return deco


def _grid_beats(grid, duration: float) -> list[float]:
    t = grid.origin % grid.beat if grid.origin < 0 else grid.origin
    return [float(x) for x in np.arange(t, duration, grid.beat)]


def _run_current(path: str, stems: bool) -> dict:
    """The app's current pipeline (engine.pipeline.Analyzer), no cache. `stems=False` forces the mix-only path."""
    from engine import pipeline
    from engine.stems import base as stems_base
    orig = stems_base.default_separator
    if not stems:
        stems_base.default_separator = lambda: stems_base.NullSeparator()
    try:
        t0 = time.time()
        a = pipeline.Analyzer(cache=None).run(path, use_cache=False)
        dt = time.time() - t0
    finally:
        stems_base.default_separator = orig
    styles = a.likely_styles
    # the heuristic scores are not probabilities; keep them as-is (the report says so) and let metrics rank by them
    return {
        "seconds": round(dt, 1), "bpm": a.grid.bpm, "bpm_candidates": list(a.grid.candidates), "bpm_confidence": a.grid.confidence,
        "beats": _grid_beats(a.grid, a.duration), "downbeat_origin": a.grid.origin,
        "genre": {"candidates": [{"genre": s["style"], "confidence": s["score"]} for s in styles], "raw": styles},
        "key": None,
        "drums": [{"time": e.time, "type": e.type, "confidence": e.confidence} for e in a.events],
        "sections": [s.start for s in a.sections[1:]], "n_sections": len(a.sections),
        "warnings": list(a.warnings), "characteristics": a.characteristics, "stems_model": a.stems_model,
    }


@register("current-mix")
def current_mix(path: str) -> dict:
    return {"system": "current-mix", **_run_current(path, stems=False)}


@register("current-stems")
def current_stems(path: str) -> dict:
    return {"system": "current-stems", **_run_current(path, stems=True)}


# ---------------------------------------------------------------------------------------------------- Genre Engine 2.0
def _model_candidates(labels: dict[str, float]) -> list[dict]:
    """Model-only: label score share (not calibrated). Fusion calibrates later."""
    tot = sum(labels.values()) or 1.0
    return sorted(({"genre": g, "confidence": round(v / tot, 4)} for g, v in labels.items()), key=lambda c: -c["confidence"])


@register("genre-model")
def genre_model(path: str, pooling: str = "mean") -> dict:
    """Discogs-EffNet (Genre Pack) only — no rhythm analysis. Needs the pack installed."""
    from engine.audio import decode
    from engine.genre import aggregate, embed
    t0 = time.time()
    r = embed.embed_file(path)
    ag = aggregate.aggregate(r["activations"], embed.classes(), pooling)
    return {"system": "genre-model", "seconds": round(time.time() - t0, 2), "embed_seconds": round(r["seconds"], 2),
            "genre": {"candidates": _model_candidates(ag["labels"]), "hints": ag["hints"], "top_styles": ag["top_styles"][:5]}}


@register("genre-fusion")
def genre_fusion(path: str) -> dict:
    """Current analysis (mix-only; stems do not change the genre outcome — GENRE_BASELINE) + Genre Pack, fused."""
    from engine.genre import aggregate, embed, fusion
    base = _run_current(path, stems=False)
    r = embed.embed_file(path)
    ag = aggregate.aggregate(r["activations"], embed.classes())
    pred = fusion.fuse(ag["labels"], base["bpm"], base["bpm_candidates"], base["characteristics"], ag["hints"])
    base.update({"system": "genre-fusion", "embed_seconds": round(r["seconds"], 2), "genre_model": {"labels": ag["labels"], "hints": ag["hints"]},
                 "genre": {**pred, "raw": pred["candidates"]}})
    return base
