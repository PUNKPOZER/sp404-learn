"""Evaluate / fit the fusion on cached benchmark results (no re-analysis): model labels from a `genre-model` run, rhythm
features from a `current-mix` run. Reports leave-one-out cross-validated accuracy, so parameters are never scored on the
track they were chosen with.

  .venv/bin/python -m bench.fit_fusion bench/local/tracks.json bench/results/full-genre-model bench/results/full-current-mix"""
from __future__ import annotations

import itertools
import json
import sys
from pathlib import Path

from bench import manifest, metrics
from engine.genre import fusion


def load(manifest_path, model_dir, rhythm_dir):
    ents = manifest.load(manifest_path)
    mm = {r["id"]: r for r in json.loads((Path(model_dir) / "results.json").read_text())["results"] if "error" not in r}
    rr = {r["id"]: r for r in json.loads((Path(rhythm_dir) / "results.json").read_text())["results"] if "error" not in r}
    rows = []
    for e in ents:
        if e.id in mm and e.id in rr and e.truth.genre:
            labels = {c["genre"]: c["confidence"] for c in mm[e.id]["genre"]["candidates"]}
            rows.append({"id": e.id, "truth": e.truth.genre, "labels": labels, "hints": mm[e.id]["genre"].get("hints", {}),
                         "bpm": rr[e.id]["bpm"], "cands": rr[e.id]["bpm_candidates"], "char": rr[e.id]["characteristics"]})
    return rows


def predict(row, cfg, model=True):
    return fusion.fuse(row["labels"] if model else None, row["bpm"], row["cands"], row["char"], row["hints"], cfg)


def evaluate(rows, cfg, model=True):
    preds = [{"candidates": predict(r, cfg, model)["candidates"]} for r in rows]
    s = metrics.genre_scores(preds, [r["truth"] for r in rows])
    full = [predict(r, cfg, model) for r in rows]
    hit = [any(g in r["truth"] for g in metrics.taxonomy.normalize(f["candidates"][0]["genre"])) for r, f in zip(rows, full)]
    conf = [f["candidates"][0]["confidence"] for f in full]
    # expected calibration error over 5 equal-width bins of top-1 confidence
    ece, n = 0.0, len(rows)
    for lo in (0.0, 0.2, 0.4, 0.6, 0.8):
        idx = [i for i, c in enumerate(conf) if lo <= c < lo + 0.2 + (1e-9 if lo == 0.8 else 0)]
        if idx:
            ece += len(idx) / n * abs(sum(hit[i] for i in idx) / len(idx) - sum(conf[i] for i in idx) / len(idx))
    sel = [h for h, f in zip(hit, full) if f["status"] == "confident"]
    return {"top1": s["top1"], "top3": s["top3"], "family": s["family"], "ece": ece, "confident_share": len(sel) / n,
            "confident_acc": (sum(sel) / len(sel)) if sel else None, "statuses": {k: sum(f["status"] == k for f in full) for k in ("confident", "hybrid", "unknown")}}


GRID = {"w_rhythm": [0.0, 0.25, 0.5, 0.75, 1.0, 1.5, 2.0], "temperature": [0.4, 0.5, 0.6, 0.8, 1.0, 1.4], "use_pattern": [True, False]}


def configs():
    base = fusion.load_config()
    for w, t, p in itertools.product(GRID["w_rhythm"], GRID["temperature"], GRID["use_pattern"]):
        yield {**base, "w_rhythm": w, "temperature": t, "use_pattern": p}


def loo(rows):
    """Leave-one-out: pick the best config (top-1 then top-3) on the other tracks, score it on the held-out one."""
    hits1 = hits3 = 0
    chosen = []
    held = []
    for i in range(len(rows)):
        train = rows[:i] + rows[i + 1:]
        best = max(configs(), key=lambda c: (round(evaluate(train, c)["top1"], 6), round(evaluate(train, c)["top3"], 6), -c["w_rhythm"]))
        chosen.append((best["w_rhythm"], best["temperature"], best["use_pattern"]))
        r = evaluate([rows[i]], best)
        hits1 += r["top1"]
        hits3 += r["top3"]
        f = predict(rows[i], best)
        held.append((f["candidates"][0]["confidence"], any(g in rows[i]["truth"] for g in metrics.taxonomy.normalize(f["candidates"][0]["genre"])), f["status"]))
    ece = 0.0
    for lo in (0.0, 0.2, 0.4, 0.6, 0.8):
        idx = [h for h in held if lo <= h[0] < lo + 0.2 + (1e-9 if lo == 0.8 else 0)]
        if idx:
            ece += len(idx) / len(held) * abs(sum(h[1] for h in idx) / len(idx) - sum(h[0] for h in idx) / len(idx))
    conf = [h for h in held if h[2] == "confident"]
    return {"top1": hits1 / len(rows), "top3": hits3 / len(rows), "ece_cv": round(ece, 3), "confident_share": round(len(conf) / len(held), 2),
            "confident_acc": round(sum(h[1] for h in conf) / len(conf), 3) if conf else None, "chosen": {str(k): chosen.count(k) for k in set(chosen)}}


def main(argv=None):
    a = argv or sys.argv[1:]
    rows = load(*a[:3])
    print(f"{len(rows)} tracks")
    base = fusion.load_config()
    print("model only          ", {k: (round(v, 3) if isinstance(v, float) else v) for k, v in evaluate(rows, {**base, "w_rhythm": 0.0}).items()})
    print("rhythm only         ", {k: (round(v, 3) if isinstance(v, float) else v) for k, v in evaluate(rows, base, model=False).items()})
    print("default fusion      ", {k: (round(v, 3) if isinstance(v, float) else v) for k, v in evaluate(rows, base).items()})
    print("LOO-CV (honest)     ", loo(rows))
    for c in sorted(configs(), key=lambda c: -evaluate(rows, c)["top1"])[:5]:
        e = evaluate(rows, c)
        print("in-sample best      ", c["w_rhythm"], c["temperature"], c["use_pattern"], round(e["top1"], 3), round(e["top3"], 3), "ece", round(e["ece"], 3))


if __name__ == "__main__":
    main()
