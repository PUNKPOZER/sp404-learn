"""Run a benchmark:  .venv/bin/python -m bench.run MANIFEST.json --system current-mix --out bench/results/NAME

Writes <out>/results.json (raw per-track results + scores) and <out>/report.md. Existing per-track results are reused
(`--resume`) so a long run can be restarted; add `--limit N` to try a few files first."""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import traceback
from pathlib import Path

from bench import manifest, metrics, systems


def score(entry: manifest.Entry, res: dict) -> dict:
    t = entry.truth
    s: dict = {}
    if t.bpm and res.get("bpm"):
        s["bpm"] = {"pred": res["bpm"], **metrics.bpm_scores(res["bpm"], t.bpm)}
    if t.beats and res.get("beats"):
        s["beats"] = metrics.beat_fmeasure(res["beats"], t.beats)
    if t.key and res.get("key"):
        s["key"] = metrics.key_score(res["key"], t.key)
    if t.drums and res.get("drums") is not None:
        s["drums"] = metrics.drum_prf(res["drums"], t.drums)
    if t.sections and res.get("sections") is not None:
        s["sections"] = metrics.boundary_errors(res["sections"], t.sections)
    return s


def summarize(entries, results) -> dict:
    ok = [(e, r) for e, r in zip(entries, results) if r and "error" not in r]
    g_preds = [r["genre"] for e, r in ok if e.truth.genre and r.get("genre")]
    g_truth = [e.truth.genre for e, r in ok if e.truth.genre and r.get("genre")]
    out: dict = {"tracks": len(entries), "analysed": len(ok), "genre": metrics.genre_scores(g_preds, g_truth) if g_truth else None}
    bp = [r["scores"]["bpm"] for e, r in ok if "bpm" in r.get("scores", {})]
    if bp:
        out["bpm"] = {"n": len(bp), "acc1": sum(b["acc1"] for b in bp) / len(bp), "acc2": sum(b["acc2"] for b in bp) / len(bp),
                      "octave_errors": [b["octave_error"] for b in bp if b["octave_error"]]}
    for key in ("beats", "key", "sections"):
        v = [r["scores"][key] for e, r in ok if key in r.get("scores", {})]
        if v:
            out[key] = {"n": len(v), **{k: sum(x[k] for x in v) / len(v) for k in v[0] if isinstance(v[0][k], (int, float)) and k not in ("n_truth", "n_pred")}}
    secs = [r["seconds"] for e, r in ok if "seconds" in r]
    if secs:
        out["seconds"] = {"mean": sum(secs) / len(secs), "max": max(secs)}
    return out


def pct(x):
    return "n/a" if x is None else f"{x * 100:.0f}%"


def report_md(system: str, entries, results, summ: dict) -> str:
    L = [f"# Benchmark report — `{system}`", "", f"Tracks in manifest: {summ['tracks']} · analysed: {summ['analysed']}", ""]
    g = summ.get("genre")
    if g:
        L += ["## Genre", "", f"Top-1 **{pct(g['top1'])}** · Top-3 **{pct(g['top3'])}** · family **{pct(g['family'])}** (n={g['n']})", "",
              "| Genre | Correct | Total | Accuracy |", "|---|---|---|---|"]
        L += [f"| {k} | {v['correct']} | {v['total']} | {pct(v['accuracy'])} |" for k, v in g["per_genre"].items()]
        preds = sorted({p for row in g["confusion"].values() for p in row})
        L += ["", "Confusion matrix (rows = expected, columns = predicted top-1):", "", "| expected \\ predicted | " + " | ".join(preds) + " |",
              "|---|" + "---|" * len(preds)]
        L += [f"| {k} | " + " | ".join(str(row.get(p, 0)) for p in preds) + " |" for k, row in g["confusion"].items()]
        if g["low_confidence"]:
            L += ["", "Low-confidence or wrong cases:", "", "| # | expected | predicted (top 3) | confidence | top-1 ok |", "|---|---|---|---|---|"]
            L += [f"| {c['index']} | {', '.join(c['expected'])} | {', '.join(c['predicted'])} | {c['confidence']} | {c['top1']} |" for c in g["low_confidence"]]
        L.append("")
    if "bpm" in summ:
        b = summ["bpm"]
        L += ["## Tempo", "", f"Acc1 **{pct(b['acc1'])}** · Acc2 (octave-tolerant) **{pct(b['acc2'])}** (n={b['n']}); octave errors: {b['octave_errors'] or 'none'}", ""]
    for key, title in (("beats", "Beat F-measure"), ("key", "Key (MIREX score)"), ("sections", "Section boundaries")):
        if key in summ:
            L += [f"## {title}", "", ", ".join(f"{k}={v:.3f}" for k, v in summ[key].items() if k != "n") + f" (n={summ[key]['n']})", ""]
    if "seconds" in summ:
        L += ["## Speed", "", f"mean {summ['seconds']['mean']:.1f} s · max {summ['seconds']['max']:.1f} s per track", ""]
    L += ["## Per track", "", "| track | expected | BPM | top candidates | s |", "|---|---|---|---|---|"]
    for e, r in zip(entries, results):
        if not r or "error" in r:
            L.append(f"| {e.id} | {', '.join(e.truth.genre)} | — | ERROR {(r or {}).get('error', 'missing')} | |")
            continue
        cand = ", ".join(f"{c['genre']} {c['confidence']}" for c in r.get("genre", {}).get("candidates", []))
        L.append(f"| {e.id} | {', '.join(e.truth.genre) or '—'} | {r.get('bpm', 0):.1f} (alt {', '.join(map(str, r.get('bpm_candidates', [])))}) | {cand} | {r.get('seconds', '')} |")
    return "\n".join(L) + "\n"


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("manifest")
    ap.add_argument("--system", default="current-mix", choices=sorted(systems.SYSTEMS))
    ap.add_argument("--out", default=None)
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--resume", action="store_true")
    a = ap.parse_args(argv)
    entries = manifest.load(a.manifest)
    if a.limit:
        entries = entries[: a.limit]
    out = Path(a.out or f"bench/results/{a.system}")
    out.mkdir(parents=True, exist_ok=True)
    prev = {}
    if a.resume and (out / "results.json").exists():
        prev = {r["id"]: r for r in json.loads((out / "results.json").read_text()).get("results", []) if "error" not in r}
    fn = systems.SYSTEMS[a.system]
    results = []
    for i, e in enumerate(entries, 1):
        if e.id in prev:
            results.append(prev[e.id]); continue
        if not e.exists:
            results.append({"id": e.id, "error": "file not found"}); print(f"[{i}/{len(entries)}] MISSING {e.path}"); continue
        print(f"[{i}/{len(entries)}] {e.id} …", flush=True)
        try:
            r = fn(e.path)
            r["id"] = e.id
            r["scores"] = score(e, r)
        except Exception as ex:  # one bad file must not kill a long run
            traceback.print_exc()
            r = {"id": e.id, "error": f"{type(ex).__name__}: {ex}"}
        results.append(r)
        (out / "results.json").write_text(json.dumps({"system": a.system, "results": results}, ensure_ascii=False, indent=1))
    summ = summarize(entries, results)
    (out / "results.json").write_text(json.dumps({"system": a.system, "summary": summ, "results": results}, ensure_ascii=False, indent=1))
    (out / "report.md").write_text(report_md(a.system, entries, results, summ))
    print("wrote", out / "report.md")
    return 0


if __name__ == "__main__":
    sys.exit(main())
