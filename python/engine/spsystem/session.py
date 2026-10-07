"""Application-level .spsystem session: what the UI needs to OPEN a project (read-only) and SAVE LEARN's own state back into it.

Opening never writes: revision, files and timestamps stay exactly as DROP saved them. Saving goes through the same atomic, conflict-checked path
as every other LEARN write (fsio.save_file): revision += 1 exactly once, modifiedBy = sp404-learn, DROP-owned and unknown data copied raw.
"""
from __future__ import annotations

import os

from . import adapters, fsio
from .errors import SpError
from .package import OpenResult
from .project import APP, Project


def _issues(res: OpenResult) -> list[dict]:
    return [{"severity": i.severity, "code": i.code, "message": i.message, "where": i.where} for i in res.issues]


def load(path: str, cache_dir: str, probe=None, peaks=None) -> tuple[Project | None, dict]:
    """-> (Project | None, payload). Never raises for a bad file: CORRUPTED / UNSUPPORTED_VERSION / missing come back as ok=False with a code."""
    res = fsio.open_path(path)
    if not res.usable:
        return None, {"ok": False, "level": res.level, "code": res.code, "message": res.message, "issues": _issues(res), "path": path}
    proj = Project.from_open(res, path)
    m = proj.manifest
    src = adapters.resolve_source(proj, cache_dir)
    info = {}
    pk = None
    if src["path"] and os.path.isfile(src["path"]):
        try:
            info = probe(src["path"]) if probe else {}
            pk = peaks(src["path"]) if peaks else None
        except Exception as e:                                          # an unreadable source must not stop the project from opening
            src = {**src, "state": "unreadable", "error": str(e)}
    mod = proj.module("analysis")
    doc = proj.data("analysis") if mod.status == "ok" else None
    track = adapters.track_from_analysis(doc, m, src["path"], info, pk) if src["path"] else None
    eff, raw = adapters.effective_bpm(doc, m)
    mods = proj.modules
    payload = {
        "ok": True, "level": res.level, "issues": _issues(res), "path": path,
        "project": {"id": m["id"], "revision": proj.revision, "formatVersion": m["formatVersion"], "title": m.get("title"), "createdBy": m.get("createdBy"),
                    "modifiedBy": m.get("modifiedBy"), "modifiedAt": m.get("modifiedAt"), "tempo": m.get("tempo"), "meter": m.get("meter"),
                    "sourceMode": (m.get("source") or {}).get("mode")},
        "source": {**src, "durationSeconds": info.get("duration") or (m.get("source") or {}).get("durationSeconds"), "peaks": pk or []},
        "chops": (proj.data("chops") or {}).get("chops", []), "samples": (proj.data("samples") or {}).get("samples", []),
        "pads": (proj.data("pads") or {}).get("assignments", []), "loops": (proj.data("loops") or {}).get("loops", []),
        "analysis": doc, "hasAnalysis": doc is not None, "track": track,
        "tempo": {"effective": eff, "raw": raw}, "modules": {n: x.status for n, x in mods.items()},
    }
    return proj, payload


def save(project: Project, analysis: dict | None = None, *, mode: str = "save", path: str | None = None, now: float | None = None, version: str = "") -> dict:
    """Write LEARN-owned state back into the package. `analysis` is LEARN's current TrackAnalysis (dict) — merged into analysis/track.json
    (raw replaced, userOverride/decisions/unknown fields kept). Raises Conflict when the file changed on disk since it was opened."""
    target = path or project.path
    if not target:
        raise SpError("E_NO_PATH", "the project has no file path")
    if analysis:
        adapters.apply_analysis(project, analysis, app_version=version, now=now)
        corr = (analysis.get("corrections") or {}).get("bpm")
        cur = (project.manifest.get("tempo") or {}).get("bpm")
        if corr and corr.get("user") is not None and (cur is None or abs(float(corr["user"]) - float(cur)) > 0.01):
            project.set_user_tempo(float(corr["user"]), now=now)
    out = fsio.save_file(project, target, mode, now=now, version=version)
    return {"ok": True, "revision": out["revision"], "id": out["id"], "level": out["level"], "path": target}
