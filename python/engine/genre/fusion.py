"""Hybrid fusion: model label scores (Discogs-EffNet) × soft rhythm evidence from the existing analysis → calibrated ranking.

score_g = w_model · log(p_model,g + ε) + w_rhythm · log L_rhythm,g        p = softmax(score / T)
The ML prediction carries the main weight (w_rhythm < w_model); all weights/thresholds live in fusion.default.json so they are
configurable and testable. Output is a GenrePrediction dict (see TRACK_ANALYSIS_V2_PLAN §4)."""
from __future__ import annotations

import json
import math
from pathlib import Path

from engine.genre import evidence

CONFIG = Path(__file__).with_name("fusion.default.json")
FAMILY = {"footwork": "footwork", "jungle": "uk_breaks", "drum_and_bass": "uk_breaks", "breakbeat": "uk_breaks", "uk_garage": "uk_breaks",
          "house": "house", "techno": "techno", "hip_hop": "hip_hop", "trip_hop": "hip_hop", "ambient": "ambient", "idm": "electronic_other", "dub": "electronic_other", "dubstep": "uk_breaks"}


def load_config(path: str | Path | None = None) -> dict:
    return json.loads(Path(path or CONFIG).read_text())


def _softmax(xs: dict[str, float], temp: float) -> dict[str, float]:
    m = max(xs.values())
    e = {k: math.exp((v - m) / temp) for k, v in xs.items()}
    z = sum(e.values())
    return {k: v / z for k, v in e.items()}


def fuse(model_labels: dict[str, float] | None, bpm: float | None, bpm_candidates: list[float] | None, characteristics: dict | None,
         hints: dict[str, float] | None = None, cfg: dict | None = None) -> dict:
    cfg = cfg or load_config()
    labels = sorted(evidence.TEMPO_MODES)
    have_model = bool(model_labels)
    have_rhythm = bool(bpm)
    characteristics = characteristics or {}
    score: dict[str, float] = {g: 0.0 for g in labels}
    if have_model:
        tot = sum(model_labels.values()) or 1.0
        for g in labels:
            score[g] += cfg["w_model"] * math.log(model_labels.get(g, 0.0) / tot + cfg["eps"])
    if have_rhythm:
        ll = evidence.rhythm_loglik(labels, bpm, bpm_candidates or [], characteristics, use_tempo=cfg["use_tempo"], use_pattern=cfg["use_pattern"])
        for g in labels:
            score[g] += cfg["w_rhythm"] * ll[g]
    temp = cfg["temperature"] if have_model else cfg["temperature_rhythm_only"]
    p = _softmax(score, temp)
    cap = None if have_model else cfg["rhythm_only_confidence_cap"]      # without the model, never sound sure
    if cap is not None:
        p = {g: min(v, cap) for g, v in p.items()}
    ranked = sorted(p.items(), key=lambda kv: -kv[1])
    top, second = ranked[0], ranked[1]
    margin = top[1] - second[1]
    if top[1] < cfg["unknown_below"]:
        status = "unknown"
    elif top[1] < cfg["confident_at"] or margin < cfg["hybrid_margin"]:
        status = "hybrid"
    else:
        status = "confident"
    cands = [{"genre": g, "confidence": round(v, 4), "family": FAMILY.get(g)} for g, v in ranked[:5]]
    hint = None
    if hints:
        by_label = {"footwork": ("juke",), "uk_garage": ("bassline",), "house": ("deep_house", "acid_house"), "techno": ("acid_techno",), "hip_hop": ("boom_bap", "instrumental_hip_hop")}
        opts = [(h, hints.get(h, 0.0)) for h in by_label.get(top[0], ())]
        if opts:
            h, v = max(opts, key=lambda kv: kv[1])
            hint = h if v > cfg["hint_min"] else None
    if top[0] == "uk_garage" and characteristics and characteristics.get("four_on_floor", 1) < 0.3 and characteristics.get("syncopation", 0) > 0.3:
        hint = "two_step"
    return {"primaryGenre": top[0] if status != "unknown" else "unknown", "primaryConfidence": round(top[1], 4), "status": status, "family": FAMILY.get(top[0]),
            "subgenre": hint, "candidates": cands, "sources": {"model": have_model, "rhythm": have_rhythm}, "fusionConfig": {k: cfg[k] for k in ("w_model", "w_rhythm", "temperature")}}
