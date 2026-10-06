"""Compare aggregation variants of the Genre Pack output on cached embeddings (no audio re-run after the first pass).

  .venv/bin/python -m bench.genre_variants bench/local/tracks.json bench/results/full-current-mix"""
from __future__ import annotations

import copy
import json
import sys
from pathlib import Path

import numpy as np

from bench import fit_fusion as ff, manifest, metrics
from engine.audio import decode
from engine.genre import aggregate, embed, fusion


def cached_activations(entries, cache_dir):
    out = {}
    for e in entries:
        h = decode.file_hash(e.path)
        r = embed.embed_file(e.path, h, cache_dir)
        out[e.id] = r["activations"]
    return out


def variants():
    base = aggregate.load_mapping()
    nob = copy.deepcopy(base)
    nob["uk_garage"]["classes"] = [c for c in nob["uk_garage"]["classes"] if c != "Electronic---Bassline"]
    for pool in ("mean", "p75"):
        for how in ("max", "noisy_or", "sum"):
            yield f"{pool}/{how}", dict(pooling=pool, how=how, mapping=base)
            yield f"{pool}/{how}/no-bassline", dict(pooling=pool, how=how, mapping=nob)


def main(argv=None):
    a = argv or sys.argv[1:]
    ents = [e for e in manifest.load(a[0]) if e.truth.genre]
    acts = cached_activations(ents, "bench/results/embcache")
    classes = embed.classes()
    rhythm = {r["id"]: r for r in json.loads((Path(a[1]) / "results.json").read_text())["results"] if "error" not in r}
    cfg = fusion.load_config()
    print(f"{'variant':28s} model top1/top3 | fusion top1/top3/ece | UKG BRK HIP AMB | LOO-fusion")
    for name, kw in variants():
        rows = []
        for e in ents:
            ag = aggregate.aggregate(acts[e.id], classes, **kw)
            rows.append({"id": e.id, "truth": e.truth.genre, "labels": ag["labels"], "hints": ag["hints"], "bpm": rhythm[e.id]["bpm"],
                         "cands": rhythm[e.id]["bpm_candidates"], "char": rhythm[e.id]["characteristics"]})
        m = ff.evaluate(rows, {**cfg, "w_rhythm": 0.0})
        f = ff.evaluate(rows, cfg)
        per = {}
        for r in rows:
            p = ff.predict(r, cfg)
            ok = any(g in r["truth"] for g in metrics.taxonomy.normalize(p["candidates"][0]["genre"]))
            per.setdefault(r["truth"][0], []).append(ok)
        pg = lambda k: f"{sum(per[k])}/{len(per[k])}"
        print(f"{name:28s} {m['top1']:.2f}/{m['top3']:.2f}        | {f['top1']:.2f}/{f['top3']:.2f}/{f['ece']:.2f}    | {pg('uk_garage')} {pg('breakbeat')} {pg('hip_hop')} {pg('ambient')} | {ff.loo(rows)['top1']:.2f}")


if __name__ == "__main__":
    main()
