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


def aggregate(activations: np.ndarray, classes: list[str], pooling: str = "mean") -> dict:
    """activations [n_patches, 400] (sigmoid). Track-level pooling → label scores in [0,1], plus sub-genre hints.
    pooling: 'mean' (default; robust), 'median', or 'p75' (loud/characteristic passages count more)."""
    a = np.asarray(activations, dtype=np.float32)
    pooled = {"mean": a.mean(0), "median": np.median(a, 0), "p75": np.percentile(a, 75, axis=0)}[pooling]
    idx = {c: i for i, c in enumerate(classes)}
    labels, hints = {}, {}
    for g, spec in load_mapping().items():
        ids = [idx[c] for c in spec["classes"] if c in idx]
        labels[g] = float(pooled[ids].max()) if ids else 0.0
        for h, cl in spec.get("hints", {}).items():
            hi = [idx[c] for c in cl if c in idx]
            hints[h] = float(pooled[hi].max()) if hi else 0.0
    top = np.argsort(-pooled)[:8]
    return {"labels": labels, "hints": hints, "top_styles": [(classes[i], float(pooled[i])) for i in top], "pooled": pooled}
