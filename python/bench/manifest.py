"""Benchmark manifest: which local files to evaluate and what is known about them (partial ground truth allowed).

Two equivalent spellings are accepted for each entry:
  {"path": "/x/a.wav", "expected": ["jungle", "drum_and_bass"]}                 # genre-only shorthand
  {"track": "/x/a.wav", "expected": {"genre": [...], "bpm": [168, 172], "meter": "4/4", "key": "F# minor",
                                    "beats": [..sec..], "drums": [{"time": 1.2, "type": "KICK"}], "sections": [0, 24.1, 48.0]}}
Every ground-truth field is optional; a metric is only computed where its truth exists. Audio is never committed."""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path

from bench import taxonomy


@dataclass
class Truth:
    genre: list[str] = field(default_factory=list)          # taxonomy ids; any of them counts as correct
    bpm: tuple[float, float] | None = None                  # inclusive acceptable range (a single number = exact ±0)
    meter: str | None = None
    key: str | None = None                                  # e.g. "F# minor", "A major"
    beats: list[float] | None = None                        # annotated beat times (s)
    downbeats: list[float] | None = None
    drums: list[dict] | None = None                         # [{"time": s, "type": "KICK|SNARE|CLAP|CLOSED_HAT|OPEN_HAT|PERCUSSION"}]
    sections: list[float] | None = None                     # boundary times (s)
    bpm_ref: float | None = None                            # a *reference reading* (e.g. DJ software), NOT truth; reported as agreement
    key_ref: str | None = None


@dataclass
class Entry:
    path: str
    truth: Truth
    id: str = ""
    notes: str = ""

    @property
    def exists(self) -> bool:
        return os.path.isfile(self.path)


class ManifestError(ValueError):
    pass


def _genres(v) -> list[str]:
    if isinstance(v, str):
        v = [v]
    out: list[str] = []
    for item in v or []:
        ids = taxonomy.normalize(str(item))
        if not ids:
            raise ManifestError(f"unknown genre label {item!r} (known ids: {sorted(taxonomy.GENRES)})")
        out += [i for i in ids if i not in out]
    return out


def parse_entry(d: dict, base: Path | None = None) -> Entry:
    path = d.get("path") or d.get("track")
    if not path:
        raise ManifestError("entry needs 'path' (or 'track')")
    path = os.path.expanduser(path)
    if base is not None and not os.path.isabs(path):
        path = str(base / path)
    exp = d.get("expected", {})
    if isinstance(exp, (list, str)):
        exp = {"genre": exp}
    if not isinstance(exp, dict):
        raise ManifestError("'expected' must be a list of genres or an object")
    bpm = exp.get("bpm")
    if isinstance(bpm, (int, float)):
        bpm = (float(bpm), float(bpm))
    elif bpm is not None:
        if len(bpm) != 2 or bpm[0] > bpm[1]:
            raise ManifestError("'bpm' must be a number or [low, high]")
        bpm = (float(bpm[0]), float(bpm[1]))
    t = Truth(genre=_genres(exp.get("genre")), bpm=bpm, meter=exp.get("meter"), key=exp.get("key"),
              beats=exp.get("beats"), downbeats=exp.get("downbeats"), drums=exp.get("drums"), sections=exp.get("sections"),
              bpm_ref=exp.get("bpm_ref"), key_ref=exp.get("key_ref"))
    return Entry(path=path, truth=t, id=d.get("id") or os.path.basename(path), notes=d.get("notes", ""))


def load(path: str | os.PathLike) -> list[Entry]:
    p = Path(path)
    data = json.loads(p.read_text())
    items = data["tracks"] if isinstance(data, dict) else data
    if not isinstance(items, list):
        raise ManifestError("manifest must be a list or {'tracks': [...]}")
    return [parse_entry(d, p.parent) for d in items]
