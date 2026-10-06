"""Local, append-only dataset of user genre corrections (for future evaluation / fine-tuning). Never retrains anything by itself;
raw model output is stored next to the user's value and is never overwritten."""
from __future__ import annotations

import json
import os
import time
from pathlib import Path

from engine.stems.demucs_sep import models_dir


def path() -> Path:
    p = Path(os.environ.get("SP404LEARN_CORRECTIONS") or models_dir().parent / "corrections" / "genre.jsonl")
    p.parent.mkdir(parents=True, exist_ok=True)
    return p


def record(audio_hash: str, raw: dict | None, user_genre: str | None, app_version: str = "") -> dict:
    row = {"ts": int(time.time()), "audio_hash": audio_hash, "raw": raw, "user": user_genre, "app": app_version, "kind": "genre"}
    with open(path(), "a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")
    return {"ok": True, "path": str(path())}
