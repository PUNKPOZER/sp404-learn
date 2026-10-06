"""Local, append-only dataset of user genre corrections (for future evaluation / fine-tuning). Never retrains anything by itself;
raw model output is stored next to the user's value and is never overwritten."""
from __future__ import annotations

import json
import os
import time
from pathlib import Path

from engine.stems.demucs_sep import models_dir


def path(kind: str = "genre") -> Path:
    base = Path(os.environ.get("SP404LEARN_CORRECTIONS") or models_dir().parent / "corrections" / "genre.jsonl")
    p = base if kind == "genre" else base.with_name(f"{kind}.jsonl")
    p.parent.mkdir(parents=True, exist_ok=True)
    return p


def record(audio_hash: str, raw: object, user: object, app_version: str = "", kind: str = "genre") -> dict:
    """Append one correction. `raw` is what the engine said, `user` what the person set; they are never merged.
    kind "genre" -> genre.jsonl, "bpm" -> bpm.jsonl (same folder)."""
    row = {"ts": int(time.time()), "audio_hash": audio_hash, "raw": raw, "user": user, "app": app_version, "kind": kind}
    with open(path(kind), "a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")
    return {"ok": True, "path": str(path(kind))}
