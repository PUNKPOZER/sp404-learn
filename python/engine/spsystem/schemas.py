"""Canonical SP SYSTEM schemas (read-only; the source of truth is /sp-system-spec/schemas — never modified here)."""
from __future__ import annotations

import json
import os
import sys
from functools import lru_cache
from pathlib import Path

from jsonschema import Draft202012Validator
from referencing import Registry, Resource

MODULES = {
    # name: (default path, schema file, owner, version key)
    "chops": ("project/chops.json", "chops", "sp404-drop", "schemaVersion"),
    "samples": ("project/samples.json", "samples", "sp404-drop", "schemaVersion"),
    "pads": ("project/pads.json", "pads", "sp404-drop", "schemaVersion"),
    "loops": ("project/loops.json", "loops", "sp404-drop", "schemaVersion"),
    "analysis": ("analysis/track.json", "analysis", "sp404-learn", "analysisVersion"),
    "recipe": ("learn/recipe.json", "recipe", "sp404-learn", "recipeVersion"),
    "progress": ("learn/progress.json", "progress", "sp404-learn", "progressVersion"),
    "requirements": ("learn/requirements.json", "requirements", "sp404-learn", "requirementsVersion"),
}


def schema_dir() -> Path:
    env = os.environ.get("SP404LEARN_SPSPEC")
    if env:
        return Path(env) / "schemas"
    frozen = getattr(sys, "_MEIPASS", None)
    if frozen:
        return Path(frozen) / "sp-system-spec" / "schemas"
    return Path(__file__).resolve().parents[3] / "sp-system-spec" / "schemas"


@lru_cache(maxsize=1)
def _load():
    d = schema_dir()
    schemas = {p.name[: -len(".schema.json")]: json.loads(p.read_text(encoding="utf-8")) for p in d.glob("*.schema.json")}
    registry = Registry().with_resources([(s["$id"], Resource.from_contents(s)) for s in schemas.values()])
    return schemas, registry


def validate(name: str, data) -> list[dict]:
    """[] when valid, else [{path, message}] (stable order)."""
    schemas, registry = _load()
    v = Draft202012Validator(schemas[name], registry=registry, format_checker=Draft202012Validator.FORMAT_CHECKER)
    errs = sorted(v.iter_errors(data), key=lambda e: [str(x) for x in e.path])
    return [{"path": "/" + "/".join(map(str, e.path)), "message": e.message[:200]} for e in errs]
