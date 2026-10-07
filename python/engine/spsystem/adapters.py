"""Adapters between LEARN's own data and the canonical SP SYSTEM modules. LEARN's internal models stay as they are; only the serialisation
follows the canonical schemas. No analysis engine code is touched here.

Raw vs override (spec §9/§12): `raw` is what the engine said and is replaced only by a NEW engine run; a person's correction lives in
`userOverride` and is never touched by re-analysis. Effective value = userOverride ?? raw.
"""
from __future__ import annotations

import copy
import hashlib
import os
from typing import Any

from .errors import SpError
from .project import APP, Project, iso

ANALYSIS_VERSION = 1


# ---------------------------------------------------------------------------------------------- helpers
def effective(prop: dict | None) -> dict | None:
    """userOverride ?? raw for one TrackUnderstanding property."""
    if not isinstance(prop, dict):
        return None
    return prop.get("userOverride") or prop.get("raw")


def _num(x, nd=4):
    return round(float(x), nd) if isinstance(x, (int, float)) and not isinstance(x, bool) else None


# ---------------------------------------------------------------------------------------------- analysis/track.json
def analysis_from_track(a: dict, *, app_version: str = "", now: float | None = None, imported_tempo: dict | None = None) -> dict:
    """LEARN TrackAnalysis (dict as from `to_dict()` / the UI) -> canonical TrackUnderstanding. Only supported fields are written:
    tempo, meter, genre, groove, drums, bass, structure (+ vocals when measured). LEARN has no key detector, so `key` is omitted.
    `imported_tempo` (from DROP) is recorded as evidence beside the engine's own reading — it is not the engine's `raw`."""
    g = a.get("grid") or {}
    corr = (a.get("corrections") or {}).get("bpm") or {}
    engine_bpm = corr.get("raw", g.get("bpm"))                 # corrections.bpm.raw = the engine's first reading, never the user's value
    tempo: dict[str, Any] = {"raw": {"bpm": _num(engine_bpm, 3), "confidence": _num(g.get("confidence")), "beatOffsetSeconds": _num(g.get("origin")),
                                      "alternatives": [_num(x, 3) for x in (g.get("candidates") or [])]}}
    # LEARN's grid.origin is the start of bar 1 (a downbeat) — see schema issue S11
    tempo["raw"]["beatOffsetMeaning"] = "downbeat"
    if imported_tempo:
        tempo["raw"]["evidence"] = [{"source": imported_tempo.get("setBy") or "sp404-drop", "bpm": imported_tempo.get("bpm"),
                                      "origin": imported_tempo.get("origin"), "confidence": imported_tempo.get("confidence")}]
    if corr.get("user") is not None:
        tempo["userOverride"] = {"bpm": _num(corr["user"], 3)}
    out: dict[str, Any] = {
        "analysisVersion": ANALYSIS_VERSION,
        "producedBy": {"app": APP, "version": app_version or "0"},
        "producedAt": iso(now),
        "audioSha256": a.get("audio_hash"),
        "tempo": tempo,
        "meter": {"raw": {"beatsPerBar": g.get("beats_per_bar", 4), "confidence": _num(g.get("confidence"))}},
    }
    gp = a.get("genre")
    gu = a.get("genre_user")
    if isinstance(gp, dict) and gp.get("available") and not gp.get("error") and gp.get("candidates"):
        out["genre"] = {"raw": {"status": gp.get("status"), "primary": gp.get("primaryGenre"), "subgenre": gp.get("subgenre"),
                                "candidates": [{"genre": c["genre"], "confidence": _num(c.get("confidence"))} for c in gp["candidates"]],
                                "model": gp.get("model")}}
        if gu:
            out["genre"]["userOverride"] = {"genre": gu}
    elif gu:
        out["genre"] = {"raw": None, "userOverride": {"genre": gu}}
    ch = a.get("characteristics") or {}
    if ch or a.get("likely_styles"):
        out["groove"] = {"raw": {"experimental": True, "characteristics": ch, "likelyStyles": a.get("likely_styles") or []}}
    if a.get("events"):
        out["drums"] = {"raw": {"events": [{"id": e["id"], "time": _num(e["time"], 5), "type": e["type"], "confidence": _num(e["confidence"], 3),
                                            "velocity": _num(e["velocity"], 3), "bar": e.get("bar"), "step": e.get("step"),
                                            "quantizedTime": _num(e.get("quantized_time"), 5), "timingOffset": _num(e.get("timing_offset"), 5),
                                            "manual": bool(e.get("manual"))} for e in a["events"]]}}
    if a.get("bass"):
        out["bass"] = {"raw": {"notes": [{"time": _num(b["time"], 5), "duration": _num(b["duration"], 5), "midi": b["midi"], "confidence": _num(b["confidence"], 3),
                                          "bar": b.get("bar"), "step": b.get("step")} for b in a["bass"]]}}
    if a.get("sections"):
        out["structure"] = {"raw": {"sections": [{"label": s["label"], "startSeconds": _num(s["start"]), "endSeconds": _num(s["end"]), "startBar": s.get("start_bar"),
                                                   "endBar": s.get("end_bar"), "cluster": s.get("cluster"), "energy": _num(s.get("energy"), 3)} for s in a["sections"]]}}
    if isinstance(ch.get("vocal_activity"), (int, float)):
        out["vocals"] = {"raw": {"activity": _num(ch["vocal_activity"], 3), "experimental": True}}
    return out


_PROPS = ("tempo", "meter", "key", "genre", "groove", "drums", "bass", "structure", "phrases", "vocals")


def merge_analysis(existing: dict | None, produced: dict) -> dict:
    """Update an existing analysis/track.json with a fresh engine run WITHOUT losing anything LEARN does not own:
    - `raw` of each property is replaced by the new engine output; `userOverride` is kept untouched;
    - properties the new run did not produce are kept as they were;
    - unknown top-level fields and unknown fields inside kept properties survive (e.g. an `x-…` bag);
    - chop/loop candidates: states a person set (accepted / dismissed, acceptedChopId) are kept; still-`suggested` ones are replaced by the new batch
      (candidates are matched by id)."""
    if not existing:
        return produced
    out = copy.deepcopy(existing)
    for k, v in produced.items():
        if k in _PROPS and isinstance(v, dict):
            cur = out.get(k) if isinstance(out.get(k), dict) else {}
            merged = {**cur, **{kk: vv for kk, vv in v.items() if kk != "userOverride"}}
            if "userOverride" in v and v["userOverride"] is not None:
                merged["userOverride"] = v["userOverride"]          # a correction recorded by LEARN itself in this run
            elif "userOverride" in cur:
                merged["userOverride"] = cur["userOverride"]
            out[k] = merged
        elif k in ("chopCandidates", "loopCandidates"):
            out[k] = merge_candidates(existing.get(k) or [], v)
        else:
            out[k] = v
    for k in ("chopCandidates", "loopCandidates"):
        if k in existing and k not in produced:
            out[k] = existing[k]
    return out


def merge_candidates(old: list[dict], new: list[dict]) -> list[dict]:
    decided = {c["id"]: c for c in old if c.get("state") in ("accepted", "dismissed")}
    result = [copy.deepcopy(decided[c["id"]]) if c["id"] in decided else c for c in new]
    ids = {c["id"] for c in result}
    result += [copy.deepcopy(c) for c in old if c["id"] in decided and c["id"] not in ids]     # a decision is never dropped
    return result


def candidates_from_regions(regions: list[dict], kind: str, *, prefix: str = "cand", start_index: int = 1, reason: str | None = None) -> list[dict]:
    """Suggestions only. LEARN never writes them to project/chops.json — a person accepts them in DROP."""
    out = []
    for i, r in enumerate(regions, start_index):
        c = {"id": f"{prefix}-{i:02d}", "kind": kind, "startSeconds": _num(r["start"] if "start" in r else r["startSeconds"]),
             "endSeconds": _num(r["end"] if "end" in r else r["endSeconds"]), "confidence": _num(r.get("confidence")) if r.get("confidence") is not None else None,
             "state": "suggested"}
        if r.get("label"):
            c["label"] = r["label"]
        if reason or r.get("reason"):
            c["reason"] = reason or r["reason"]
        out.append(c)
    return out


# ---------------------------------------------------------------------------------------------- learn/recipe.json
_ITEM_TYPES = {"lesson", "trick", "fx", "exercise", "reference"}


def recipe_from_plan(plan: dict, *, app_version: str = "", analysis_version: int | None = ANALYSIS_VERSION, title: str | None = None, library_version: str | None = None) -> dict:
    """LEARN's lesson plan ("Learn this track", built in the UI from the analysis + library) -> canonical recipe.
    Library items are referenced by id only. The internal pseudo item `track` (open the step-by-step recipe on this track's patterns) is app
    navigation, not library content, and is not exported."""
    steps = []
    for st in plan.get("steps") or []:
        sid = str(st.get("id") or f"step-{st.get('n', len(steps) + 1)}").lower()
        s: dict[str, Any] = {"id": sid, "title": st.get("title") or sid}
        if st.get("why"):
            s["why"] = st["why"]
        items = [{"type": it["type"], "id": it["id"]} for it in (st.get("items") or []) if it.get("type") in _ITEM_TYPES and it.get("id")]
        if items:
            s["items"] = items
        extra = {k: st[k] for k in ("level", "caution", "fromTrack") if st.get(k)}
        if extra:
            s["x-sp404-learn"] = extra
        steps.append(s)
    r: dict[str, Any] = {"recipeVersion": 1, "kind": "track", "title": title or plan.get("title") or "Learn this track", "genre": plan.get("genre"),
                         "generatedFrom": {"analysisVersion": analysis_version}, "steps": steps}
    if library_version:
        r["generatedFrom"]["libraryVersion"] = library_version
    meta = {k: plan[k] for k in ("genreStatus", "genreSource", "bpm", "tempoLevel", "altBpm", "needs", "notes") if plan.get(k) is not None}
    if meta:
        r["x-sp404-learn"] = {"plan": meta, "app": app_version}
    return r


# ---------------------------------------------------------------------------------------------- learn/progress.json, learn/requirements.json
def progress_doc(lessons_done: dict[str, float] | None, practice: dict[str, dict] | None = None, existing: dict | None = None) -> dict:
    """Project-specific progress. `lessonsDone` maps lesson id -> completion time (epoch ms, canonical). LEARN's GLOBAL course progress
    (localStorage) is a different thing and is not copied here unless the caller passes the lessons done *for this project*."""
    base = copy.deepcopy(existing) if existing else {}
    done = dict(base.get("lessonsDone") or {})
    done.update({k: v for k, v in (lessons_done or {}).items()})
    base.update({"progressVersion": 1, "lessonsDone": done})
    if practice:
        base["practice"] = {**(base.get("practice") or {}), **practice}
    return base


def requirements_doc(lesson: str, needs: list[dict], title: str | None = None) -> dict:
    d: dict[str, Any] = {"requirementsVersion": 1, "lesson": lesson, "needs": [{k: n[k] for k in ("type", "count", "note") if k in n} for n in needs]}
    if title:
        d["title"] = title
    return d


# ---------------------------------------------------------------------------------------------- DROP -> LEARN import
def import_from_drop(project: Project) -> dict:
    """What LEARN can reuse from a package DROP made (read-only view; nothing is recomputed or written)."""
    m = project.manifest
    src = m.get("source") or {}
    tempo = m.get("tempo")
    chops = (project.data("chops") or {}).get("chops", [])
    out: dict[str, Any] = {
        "projectId": m["id"], "title": m.get("title"), "createdBy": m.get("createdBy"), "revision": project.revision,
        "source": {"mode": src.get("mode"), "audio": src.get("audio"), "sha256": src.get("sha256"), "durationSeconds": src.get("durationSeconds"),
                   "sampleRate": src.get("sampleRate"), "channels": src.get("channels"), "originalFilename": src.get("originalFilename"),
                   "externalSource": src.get("externalSource")},
        "tempo": tempo, "meter": m.get("meter"),
        "chops": chops, "samples": (project.data("samples") or {}).get("samples", []),
        "pads": (project.data("pads") or {}).get("assignments", []), "loops": (project.data("loops") or {}).get("loops", []),
    }
    out["hints"] = analysis_hints(tempo)
    return out


def analysis_hints(tempo: dict | None) -> dict:
    """How much LEARN should trust DROP's tempo. The analysis engine is unchanged; this only tells the caller what it may skip.
    trust: "user" (a person set it — use it as the working tempo), "high" (detected, confidence >= 0.7 — imported evidence), "low", or "none"."""
    if not tempo or not tempo.get("bpm"):
        return {"tempoTrust": "none"}
    if tempo.get("origin") in ("user", "imported"):
        return {"tempoTrust": "user", "bpm": tempo["bpm"], "beatOffsetSeconds": tempo.get("beatOffsetSeconds")}
    conf = tempo.get("confidence")
    return {"tempoTrust": "high" if isinstance(conf, (int, float)) and conf >= 0.7 else "low", "bpm": tempo["bpm"], "beatOffsetSeconds": tempo.get("beatOffsetSeconds")}


def resolve_source(project: Project, cache_dir: str) -> dict:
    """Locate the source audio: portable -> extracted to cache_dir by content hash; lightweight -> externalSource.path verified by size + hash.
    Returns {state: embedded|external-ok|external-moved|external-changed|none, path}. Never raises for a missing file (spec §16)."""
    from .fsio import extract_entry
    src = project.manifest.get("source") or {}
    mode = src.get("mode")
    if mode == "portable" and src.get("audio") and project.pkg is not None and project.pkg.has(src["audio"]):
        return {"state": "embedded", "path": extract_entry(project, src["audio"], cache_dir)}
    ext = src.get("externalSource") or {}
    p = ext.get("path")
    if mode == "lightweight" and p:
        if not os.path.isfile(p):
            return {"state": "external-moved", "path": p}
        if ext.get("sizeBytes") is not None and os.path.getsize(p) != ext["sizeBytes"]:
            return {"state": "external-changed", "path": p}
        h = hashlib.sha256()
        with open(p, "rb") as f:
            for chunk in iter(lambda: f.read(1 << 20), b""):
                h.update(chunk)
        want = ext.get("hash") or ""
        n = min(len(want), 64)
        return {"state": "external-ok" if h.hexdigest()[:n] == want[:n] else "external-changed", "path": p}
    return {"state": "none", "path": None}


def apply_analysis(project: Project, a: dict, *, app_version: str = "", now: float | None = None) -> dict:
    """Serialise a LEARN analysis into the project's analysis/track.json (merging with what is there) and return the written document."""
    imported = project.manifest.get("tempo") if (project.manifest.get("tempo") or {}).get("setBy") != APP else None
    produced = analysis_from_track(a, app_version=app_version, now=now, imported_tempo=imported)
    mod = project.module("analysis")
    existing = mod.data if mod.status == "ok" else None
    if mod.status in ("newer", "invalid"):
        raise SpError("E_MODULE_READONLY", f"{mod.path} is {mod.status} and kept read-only")
    merged = merge_analysis(existing, produced)
    project.set_module("analysis", merged)
    return merged


# ---------------------------------------------------------------------------------------------- analysis/track.json -> LEARN TrackAnalysis
def effective_bpm(doc: dict | None, manifest: dict) -> tuple[float | None, float | None]:
    """(effective bpm, engine's raw bpm). Effective = userOverride ?? raw; per spec §12 a newer user tempo in the manifest (set in another app) counts as the
    user's override too — in memory only, nothing is written on open."""
    tempo = (doc or {}).get("tempo") or {}
    raw = (tempo.get("raw") or {}).get("bpm")
    eff = (tempo.get("userOverride") or {}).get("bpm", raw)
    mt = manifest.get("tempo") or {}
    if mt.get("origin") == "user" and mt.get("bpm") and mt.get("setBy") != APP:
        produced = (doc or {}).get("producedAt") or ""
        if (mt.get("setAt") or "") > produced and (eff is None or abs(mt["bpm"] - eff) > 0.01):
            eff = mt["bpm"]
    if raw is None:
        raw = mt.get("bpm")
        eff = eff if eff is not None else raw
    return eff, raw


def track_from_analysis(doc: dict | None, manifest: dict, source_path: str, info: dict, peaks: list | None = None) -> dict | None:
    """Rebuild LEARN's TrackAnalysis (as a dict) from the package's analysis/track.json — or None when the file is not a complete LEARN analysis
    (e.g. only a tempo and some candidates), in which case the caller shows the project and offers to analyse. No engine code runs here."""
    if not isinstance(doc, dict):
        return None
    tempo = doc.get("tempo") or {}
    raw = tempo.get("raw") or {}
    drums = ((doc.get("drums") or {}).get("raw") or {}).get("events")
    secs = ((doc.get("structure") or {}).get("raw") or {}).get("sections")
    eff, engine_bpm = effective_bpm(doc, manifest)
    if not eff or not (drums or secs):
        return None
    mt = manifest.get("tempo") or {}
    grid = {"bpm": float(eff), "origin": float(raw.get("beatOffsetSeconds") if raw.get("beatOffsetSeconds") is not None else (mt.get("beatOffsetSeconds") or 0.0)),
            "beats_per_bar": int(((doc.get("meter") or {}).get("raw") or {}).get("beatsPerBar") or (manifest.get("meter") or {}).get("beatsPerBar") or 4),
            "candidates": [x for x in (raw.get("alternatives") or []) if isinstance(x, (int, float))], "confidence": float(raw.get("confidence") or 0.0)}
    a: dict[str, Any] = {
        "path": source_path, "filename": (manifest.get("source") or {}).get("originalFilename") or os.path.basename(source_path),
        "duration": float(info.get("duration") or (manifest.get("source") or {}).get("durationSeconds") or 0.0),
        "sample_rate": int(info.get("sample_rate") or (manifest.get("source") or {}).get("sampleRate") or 44100),
        "channels": int(info.get("channels") or (manifest.get("source") or {}).get("channels") or 2),
        "audio_hash": doc.get("audioSha256") or ((manifest.get("source") or {}).get("sha256") or "")[:32], "grid": grid,
        "events": [{"id": e["id"], "time": e["time"], "type": e["type"], "confidence": e.get("confidence") or 0.0, "velocity": e.get("velocity") or 0.0,
                    "bar": e.get("bar") or 0, "step": e.get("step") or 0, "quantized_time": e.get("quantizedTime") or 0.0,
                    "timing_offset": e.get("timingOffset") or 0.0, "manual": bool(e.get("manual"))} for e in (drums or [])],
        "sections": [{"label": s["label"], "start": s["startSeconds"], "end": s["endSeconds"], "start_bar": s.get("startBar") or 0, "end_bar": s.get("endBar") or 0,
                      "cluster": s.get("cluster") or "A", "energy": s.get("energy") or 0.0} for s in (secs or [])],
        "bass": [{"time": b["time"], "duration": b["duration"], "midi": b["midi"], "confidence": b.get("confidence") or 0.0, "bar": b.get("bar") or 0, "step": b.get("step") or 0}
                 for b in (((doc.get("bass") or {}).get("raw") or {}).get("notes") or [])],
        "characteristics": ((doc.get("groove") or {}).get("raw") or {}).get("characteristics") or {},
        "likely_styles": ((doc.get("groove") or {}).get("raw") or {}).get("likelyStyles") or [],
        # playback of the project's own source (the engine's stems are not part of the package)
        "stems": {"mix": {"path": source_path, "peaks": peaks or [], "activity": [], "duration": float(info.get("duration") or 0.0), "rms": 0.0}},
        "stems_model": "",
    }
    g = (doc.get("genre") or {})
    gr = g.get("raw")
    if isinstance(gr, dict) and gr.get("candidates"):
        a["genre"] = {"available": True, "status": gr.get("status"), "primaryGenre": gr.get("primary"), "subgenre": gr.get("subgenre"), "model": gr.get("model"),
                      "candidates": [{"genre": c["genre"], "confidence": c.get("confidence") or 0.0} for c in gr["candidates"]], "evidence": []}
    if (g.get("userOverride") or {}).get("genre"):
        a["genre_user"] = g["userOverride"]["genre"]
    if engine_bpm is not None and abs(float(eff) - float(engine_bpm)) > 1e-6:
        a["corrections"] = {"bpm": {"raw": float(engine_bpm), "user": float(eff)}}
    from engine.model import TrackAnalysis                     # normalise: every field LEARN's UI expects exists (stages, warnings, ...)
    return TrackAnalysis.from_dict(a).to_dict()
