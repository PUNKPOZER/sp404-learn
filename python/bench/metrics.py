"""Pure metric functions (no audio, no engine): fed by predictions and manifest truth."""
from __future__ import annotations

import math
from collections import Counter, defaultdict

import numpy as np

from bench import taxonomy

# ------------------------------------------------------------------------------------------------- genre

def genre_ranking(pred: dict) -> list[str]:
    """Ranked taxonomy ids from a prediction {"candidates": [{"genre": id|label, "confidence": x}, ...]}.
    A candidate whose label maps to several ids (e.g. "Jungle / DnB") contributes all of them at that rank."""
    out: list[str] = []
    for c in sorted(pred.get("candidates", []), key=lambda c: -c.get("confidence", 0)):
        for g in taxonomy.normalize(str(c["genre"])) or [taxonomy.UNKNOWN]:
            if g not in out:
                out.append(g)
    return out


def _rank_slots(pred: dict) -> list[list[str]]:
    slots = []
    for c in sorted(pred.get("candidates", []), key=lambda c: -c.get("confidence", 0)):
        slots.append(taxonomy.normalize(str(c["genre"])) or [taxonomy.UNKNOWN])
    return slots


def genre_scores(preds: list[dict], truths: list[list[str]], low_conf: float = 0.5) -> dict:
    """Top-1 / Top-3 / family accuracy, per-genre accuracy, confusion (truth[0] x top-1 slot), low-confidence cases.
    A prediction slot is a hit if any id in it is acceptable. Top-3 = hit within the first three candidate slots."""
    n = top1 = top3 = fam = 0
    per: dict[str, list[int]] = defaultdict(lambda: [0, 0])
    conf: dict[str, Counter] = defaultdict(Counter)
    low: list[dict] = []
    for i, (p, truth) in enumerate(zip(preds, truths)):
        if not truth:
            continue
        slots = _rank_slots(p)
        n += 1
        ok1 = bool(slots) and any(g in truth for g in slots[0])
        ok3 = any(g in truth for s in slots[:3] for g in s)
        okf = bool(slots) and bool(set(map(taxonomy.family, slots[0])) & taxonomy.families(truth))
        top1 += ok1; top3 += ok3; fam += okf
        per[truth[0]][0] += ok1; per[truth[0]][1] += 1
        conf[truth[0]][slots[0][0] if slots else taxonomy.UNKNOWN] += 1
        c = max((c.get("confidence", 0) for c in p.get("candidates", [])), default=0)
        if c < low_conf or not ok1:
            low.append({"index": i, "expected": truth, "predicted": [s[0] for s in slots[:3]], "confidence": round(c, 3), "top1": ok1})
    return {"n": n, "top1": top1 / n if n else None, "top3": top3 / n if n else None, "family": fam / n if n else None,
            "per_genre": {g: {"correct": c, "total": t, "accuracy": c / t} for g, (c, t) in sorted(per.items())},
            "confusion": {g: dict(c) for g, c in sorted(conf.items())}, "low_confidence": low}

# ------------------------------------------------------------------------------------------------- tempo

def bpm_scores(pred_bpm: float, rng: tuple[float, float], tol: float = 0.04) -> dict:
    """Acc1: within ±tol of the accepted range. Acc2: also accepts half/double/⅔/1.5× readings (octave-tolerant).
    `octave_error` names the confusion when Acc1 fails but Acc2 holds."""
    lo, hi = rng
    ok1 = lo * (1 - tol) <= pred_bpm <= hi * (1 + tol)
    kind = None
    ok2 = ok1
    for name, f in (("double", 2.0), ("half", 0.5), ("triple", 3.0), ("third", 1 / 3), ("x1.5", 1.5), ("x0.67", 2 / 3)):
        if lo * (1 - tol) <= pred_bpm * f <= hi * (1 + tol):
            ok2 = True
            kind = kind or name
    return {"acc1": ok1, "acc2": ok2, "octave_error": None if ok1 or not ok2 else kind}


def beat_fmeasure(pred: list[float], truth: list[float], window: float = 0.07) -> dict:
    """Standard beat F-measure (greedy one-to-one match within ±window)."""
    pred, truth = sorted(pred), sorted(truth)
    used = set()
    tp = 0
    for p in pred:
        j = min(((abs(p - t), k) for k, t in enumerate(truth) if k not in used), default=None)
        if j and j[0] <= window:
            used.add(j[1]); tp += 1
    prec = tp / len(pred) if pred else 0.0
    rec = tp / len(truth) if truth else 0.0
    return {"f": 2 * prec * rec / (prec + rec) if prec + rec else 0.0, "precision": prec, "recall": rec}

# ------------------------------------------------------------------------------------------------- key

_PC = {"C": 0, "C#": 1, "DB": 1, "D": 2, "D#": 3, "EB": 3, "E": 4, "F": 5, "F#": 6, "GB": 6, "G": 7, "G#": 8, "AB": 8, "A": 9, "A#": 10, "BB": 10, "B": 11}


def parse_key(s: str) -> tuple[int, str] | None:
    parts = s.replace("♯", "#").replace("♭", "b").split()
    if len(parts) != 2 or parts[0].upper() not in _PC or parts[1].lower() not in ("major", "minor"):
        return None
    return _PC[parts[0].upper()], parts[1].lower()


def key_score(pred: str, truth: str) -> dict:
    """MIREX-style: 1 exact, 0.5 perfect fifth, 0.3 relative, 0.2 parallel, else 0."""
    a, b = parse_key(pred), parse_key(truth)
    if a is None or b is None:
        return {"score": 0.0, "kind": "unparsed"}
    (pa, ma), (pb, mb) = a, b
    if (pa, ma) == (pb, mb):
        return {"score": 1.0, "kind": "exact"}
    if ma == mb and (pa - pb) % 12 in (5, 7):
        return {"score": 0.5, "kind": "fifth"}
    if ma != mb and ((ma == "major" and (pa - 3) % 12 == pb) or (ma == "minor" and (pa + 3) % 12 == pb)):
        return {"score": 0.3, "kind": "relative"}
    if pa == pb and ma != mb:
        return {"score": 0.2, "kind": "parallel"}
    return {"score": 0.0, "kind": "wrong"}

# ------------------------------------------------------------------------------------------------- drums / sections

def drum_prf(pred: list[dict], truth: list[dict], window: float = 0.05) -> dict:
    """Per-class precision/recall/F1: an event matches a truth event of the same type within ±window (one-to-one)."""
    out: dict[str, dict] = {}
    types = sorted({e["type"] for e in truth} | {e["type"] for e in pred})
    for ty in types:
        P = sorted(e["time"] for e in pred if e["type"] == ty)
        T = sorted(e["time"] for e in truth if e["type"] == ty)
        used = set(); tp = 0
        for p in P:
            j = min(((abs(p - t), k) for k, t in enumerate(T) if k not in used), default=None)
            if j and j[0] <= window:
                used.add(j[1]); tp += 1
        pr = tp / len(P) if P else 0.0
        rc = tp / len(T) if T else 0.0
        out[ty] = {"precision": pr, "recall": rc, "f1": 2 * pr * rc / (pr + rc) if pr + rc else 0.0, "pred": len(P), "truth": len(T)}
    return out


def boundary_errors(pred: list[float], truth: list[float], hit: float = 3.0) -> dict:
    """For each true boundary: distance to the nearest predicted one. Reports median error and the hit-rate within `hit` s."""
    if not truth:
        return {}
    if not pred:
        return {"median_error": math.inf, "hit_rate": 0.0, "n_truth": len(truth), "n_pred": 0}
    P = np.array(sorted(pred))
    errs = [float(np.min(np.abs(P - t))) for t in truth]
    return {"median_error": float(np.median(errs)), "hit_rate": float(np.mean([e <= hit for e in errs])), "n_truth": len(truth), "n_pred": len(pred)}
