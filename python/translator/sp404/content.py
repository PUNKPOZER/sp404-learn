"""Reader for the shared learning content (/content/**/*.json) — the same data the UI loads (Learning Library 2.0).

Used by the course builder once genre courses move to data (Phase 6). In a packaged app the folder must be shipped with the
sidecar (PyInstaller `datas`); until then `content_dir()` finds it only in a source checkout (or via SP404LEARN_CONTENT)."""
from __future__ import annotations

import json
import os
from functools import lru_cache
import sys
from pathlib import Path

from translator.sp404.i18n import get_lang


def content_dir() -> Path:
    env = os.environ.get("SP404LEARN_CONTENT")
    if env:
        return Path(env)
    frozen = getattr(sys, "_MEIPASS", None)                      # PyInstaller one-dir bundle: content/ is added as data
    if frozen:
        return Path(frozen) / "content"
    return Path(__file__).resolve().parents[3] / "content"


@lru_cache(maxsize=1)
def load_all(root: str | None = None) -> list[dict]:
    base = Path(root) if root else content_dir()
    items = []
    for p in sorted(base.rglob("*.json")):
        if p.name.startswith("_") or p.name == "planned.json":
            continue
        items.append(json.loads(p.read_text(encoding="utf-8")))
    return items


def loc(v, lang: str | None = None) -> str:
    """{'ru','en'} → string in the current language (Russian fallback), plain strings pass through."""
    if isinstance(v, dict) and "ru" in v:
        return v.get(lang or get_lang()) or v["ru"]
    return v if isinstance(v, str) else ""


def get(item_id: str) -> dict | None:
    return next((i for i in load_all() if i["id"] == item_id), None)


def publishable(item: dict) -> bool:
    return item.get("verification", {}).get("status") == "verified"
