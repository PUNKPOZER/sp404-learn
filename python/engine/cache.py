"""Analysis cache keyed by audio content hash + pipeline version."""
from __future__ import annotations

import json
import shutil
from pathlib import Path

PIPELINE_VERSION = "1"


class Cache:
    def __init__(self, root: str | Path):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    def _p(self, audio_hash: str, resolution: int) -> Path:
        return self.root / f"{audio_hash}-v{PIPELINE_VERSION}-r{resolution}.json"

    def get(self, audio_hash: str, resolution: int = 16):
        p = self._p(audio_hash, resolution)
        if p.exists():
            try:
                return json.loads(p.read_text())
            except Exception:
                p.unlink(missing_ok=True)
        return None

    def put(self, audio_hash: str, data: dict, resolution: int = 16) -> None:
        self._p(audio_hash, resolution).write_text(json.dumps(data))

    def size(self) -> int:
        return sum(f.stat().st_size for f in self.root.glob("*") if f.is_file())

    def clear(self) -> None:
        shutil.rmtree(self.root, ignore_errors=True)
        self.root.mkdir(parents=True, exist_ok=True)
