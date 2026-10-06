"""GenrePrediction for an analysed track: Genre Pack embedding (cached) + the existing analysis, fused."""
from __future__ import annotations

import time

from engine.genre import aggregate, embed, fusion, pack
from translator.sp404.i18n import L


def available() -> bool:
    return pack.status()["installed"]


def predict(analysis: dict, cache_root: str) -> dict:
    """analysis: TrackAnalysis dict (grid, characteristics, path, audio_hash). Never raises for 'pack missing' — returns {"available": False}."""
    if not available():
        return {"available": False, "reason": "pack_missing"}
    path, h = analysis.get("path", ""), analysis.get("audio_hash")
    t0 = time.time()
    try:
        r = embed.embed_file(path, h, cache_root)       # served from the embedding cache if the audio has moved
    except Exception as e:
        return {"available": True, "error": str(e)}
    ag = aggregate.aggregate(r["activations"], embed.classes())
    g = analysis.get("grid", {})
    pred = fusion.fuse(ag["labels"], g.get("bpm"), g.get("candidates", []), analysis.get("characteristics", {}), ag["hints"])
    pred["evidence"] = _evidence(ag, g, analysis.get("characteristics", {}), pred)
    pred.update({"available": True, "model": pack.PACK_ID, "seconds": round(time.time() - t0, 2), "cached": bool(r.get("cached"))})
    return pred


def _evidence(ag: dict, grid: dict, c: dict, pred: dict) -> list[dict]:
    out = []
    top = [(s.split("---")[-1], v) for s, v in ag["top_styles"][:3]]
    out.append({"source": "model", "text": ", ".join(f"{n} {v:.2f}" for n, v in top)})
    if grid.get("bpm"):
        out.append({"source": "tempo", "text": L(f"{grid['bpm']:.0f} BPM (возможны {', '.join(f'{x:g}' for x in grid.get('candidates', [])[:3])})",
                                                 f"{grid['bpm']:.0f} BPM (alternatives {', '.join(f'{x:g}' for x in grid.get('candidates', [])[:3])})")})
    if "four_on_floor" in c:
        out.append({"source": "rhythm", "text": L(f"четыре в пол {c['four_on_floor']:.0%}, синкопа {c.get('syncopation', 0):.0%}",
                                                  f"four on the floor {c['four_on_floor']:.0%}, syncopation {c.get('syncopation', 0):.0%}")})
    return out
