"""Analysis cache keyed by audio content hash + pipeline version."""
from __future__ import annotations

import json
import shutil
from pathlib import Path

PIPELINE_VERSION = "3"


class Cache:
    def __init__(self, root: str | Path):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    def _p(self, audio_hash: str, resolution: int, tag: str = "mix") -> Path:
        return self.root / f"{audio_hash}-v{PIPELINE_VERSION}-r{resolution}-{tag}.json"

    def get(self, audio_hash: str, resolution: int = 16, tag: str = "mix"):
        p = self._p(audio_hash, resolution, tag)
        if p.exists():
            try:
                return json.loads(p.read_text())
            except Exception:
                p.unlink(missing_ok=True)
        return None

    def put(self, audio_hash: str, data: dict, resolution: int = 16, tag: str = "mix") -> None:
        self._p(audio_hash, resolution, tag).write_text(json.dumps(data))

    def stems_dir(self, audio_hash: str) -> Path:
        d = self.root / "stems" / audio_hash
        d.mkdir(parents=True, exist_ok=True)
        return d

    def size(self) -> int:
        return sum(f.stat().st_size for f in self.root.rglob("*") if f.is_file())

    def clear(self) -> None:
        shutil.rmtree(self.root, ignore_errors=True)
        self.root.mkdir(parents=True, exist_ok=True)
