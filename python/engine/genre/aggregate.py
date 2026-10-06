"""Discogs 400 style activations -> our label scores (data-driven via mapping.json)."""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

import numpy as np

MAPPING = Path(__file__).with_name("mapping.json")


@lru_cache(maxsize=1)
def load_mapping() -> dict:
    return json.loads(MAPPING.read_text())["labels"]


def _combine(vals: np.ndarray, how: str) -> float:
    if how == "max":
        return float(vals.max())
    if how == "noisy_or":                       # P(at least one of the label's styles applies), styles treated as independent
        return float(1.0 - np.prod(1.0 - np.clip(vals, 0, 1)))
    if how == "sum":
        return float(min(1.0, vals.sum()))
    raise ValueError(how)


def aggregate(activations: np.ndarray, classes: list[str], pooling: str = "p75", how: str = "max", mapping: dict | None = None) -> dict:
    """activations [n_patches, 400] (sigmoid). Track-level pooling → label scores in [0,1], plus sub-genre hints.
    pooling: 'p75' (default — the passages that are most characteristic of a style count more than the average over intros/breaks), 'mean' or 'median'."""
    a = np.asarray(activations, dtype=np.float32)
    pooled = {"mean": a.mean(0), "median": np.median(a, 0), "p75": np.percentile(a, 75, axis=0)}[pooling]
    idx = {c: i for i, c in enumerate(classes)}
    labels, hints = {}, {}
    for g, spec in (mapping or load_mapping()).items():
        ids = [idx[c] for c in spec["classes"] if c in idx]
        labels[g] = _combine(pooled[ids], how) if ids else 0.0
        for h, cl in spec.get("hints", {}).items():
            hi = [idx[c] for c in cl if c in idx]
            hints[h] = float(pooled[hi].max()) if hi else 0.0
    top = np.argsort(-pooled)[:8]
    return {"labels": labels, "hints": hints, "top_styles": [(classes[i], float(pooled[i])) for i in top], "pooled": pooled}
