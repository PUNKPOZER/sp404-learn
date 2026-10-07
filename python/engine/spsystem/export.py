"""LEARN -> DROP: write (or update) a .spsystem package for a track LEARN has analysed ("PREPARE IN DROP").

New file  : manifest + source audio (embedded when small enough, otherwise referenced) + analysis/track.json.
Existing  : the package is opened and only LEARN's own files are updated — DROP's chops/samples/pads/loops and anything unknown are kept
            (the same atomic, conflict-checked save as every other LEARN write).
Suggestions are written as analysis candidates only, never as confirmed chops: a person accepts them in DROP.
"""
from __future__ import annotations

import hashlib
import os
from pathlib import Path

from . import adapters, fsio
from .errors import SpError
from .project import APP, Project

EMBED_EXT = {"wav", "flac", "aif", "aiff", "mp3", "m4a", "ogg"}
EMBED_MAX_BYTES = 200 * 1024 * 1024


def section_candidates(a: dict) -> list[dict]:
    """One suggested region per structure section the engine found (the blocks shown on the Track screen)."""
    out = []
    for i, s in enumerate(a.get("sections") or [], 1):
        if not s.get("end", 0) > s.get("start", 0):
            continue
        sb, eb = s.get("start_bar"), s.get("end_bar")
        label = f'{s.get("label", "")} · {"bars " + str(sb + 1) + "–" + str(eb) if isinstance(sb, int) and isinstance(eb, int) else "section"}'
        out.append({"id": f"cand-{i:02d}", "kind": "other", "label": label, "startSeconds": round(float(s["start"]), 4), "endSeconds": round(float(s["end"]), 4),
                    "confidence": None, "reason": "from LEARN's structure analysis (a section of the track)", "state": "suggested"})
    return out


def _sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def export_for_drop(a: dict, path: str, *, app_version: str = "", now: float | None = None, embed: bool = True) -> dict:
    """a: TrackAnalysis dict (as the UI holds it). Returns {path, id, revision, embedded, candidates, updated, level}."""
    src_path = a.get("path") or ""
    if os.path.exists(path):
        res, proj = fsio.open_project(path)
        if proj is None:
            raise SpError("E_NOT_USABLE", f"{os.path.basename(path)} exists but is not a usable SP SYSTEM project ({res.code}: {res.message}); choose another name")
        updated = True
    else:
        proj, updated = None, False
    embedded = False
    if proj is None:
        ext = Path(src_path).suffix.lower().lstrip(".")
        size = os.path.getsize(src_path) if os.path.isfile(src_path) else None
        can_embed = embed and size is not None and size <= EMBED_MAX_BYTES and ext in EMBED_EXT
        digest = _sha256(src_path) if size is not None else (a.get("audio_hash") or "")
        source: dict = {"title": Path(a.get("filename") or src_path).stem, "originalFilename": a.get("filename") or os.path.basename(src_path),
                        "durationSeconds": round(float(a.get("duration") or 0), 3), "sampleRate": int(a.get("sample_rate") or 44100), "channels": int(a.get("channels") or 2),
                        "mode": "portable" if can_embed else "lightweight", "sha256": digest}
        if can_embed:
            source["audio"] = f"audio/source.{ext}"
        else:
            source["externalSource"] = {"path": src_path, "hash": digest, "sizeBytes": size or 0}
        proj = Project.new(source["title"], app_version=app_version, now=now, source=source)
        if can_embed:
            proj.add_file(source["audio"], Path(src_path).read_bytes())
            embedded = True
        g = a.get("grid") or {}
        corr = (a.get("corrections") or {}).get("bpm")
        proj.manifest["tempo"] = {"bpm": g.get("bpm"), "confidence": g.get("confidence"), "beatOffsetSeconds": g.get("origin"),
                                  "origin": "user" if corr else "detected", "setBy": APP, "setAt": adapters.iso(now)}
        proj.manifest["tempo"] = {k: v for k, v in proj.manifest["tempo"].items() if v is not None}
        proj.manifest["meter"] = {"beatsPerBar": g.get("beats_per_bar", 4)}
    else:
        embedded = (proj.manifest.get("source") or {}).get("mode") == "portable"
    produced = adapters.analysis_from_track(a, app_version=app_version, now=now, imported_tempo=(proj.manifest.get("tempo") if updated and (proj.manifest.get("tempo") or {}).get("setBy") != APP else None))
    produced["chopCandidates"] = section_candidates(a)
    mod = proj.module("analysis")
    if mod.status in ("newer", "invalid"):
        raise SpError("E_MODULE_READONLY", f"{mod.path} is {mod.status} and kept read-only")
    proj.set_module("analysis", adapters.merge_analysis(mod.data if mod.status == "ok" else None, produced))
    out = fsio.save_file(proj, path, "save" if updated else "saveAs", now=now, version=app_version)
    n = len(proj.data("analysis").get("chopCandidates") or [])
    return {"path": path, "id": proj.id, "revision": out["revision"], "embedded": embedded, "candidates": n, "updated": updated, "level": out["level"]}
