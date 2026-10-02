"""TrackAnalysis → SP404Recipe: a kit, 1-bar patterns, an arrangement and the tutorial."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.model import TrackAnalysis, SCHEMA_VERSION
from translator.sp404 import pads, patterns, tutorial


@dataclass
class SP404Recipe:
    bpm: float
    kit: dict[int, dict[str, str]]
    patterns: list[dict[str, Any]]
    arrangement: list[dict[str, Any]] = field(default_factory=list)
    tutorial_steps: list[dict[str, Any]] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)
    title: str = ""
    schema: int = SCHEMA_VERSION

    def to_dict(self) -> dict[str, Any]:
        return {"schema": self.schema, "title": self.title, "bpm": self.bpm,
                "kit": {str(k): v for k, v in self.kit.items()},
                "patterns": self.patterns, "arrangement": self.arrangement,
                "tutorialSteps": self.tutorial_steps, "notes": self.notes}

    @staticmethod
    def from_dict(d: dict[str, Any]) -> "SP404Recipe":
        return SP404Recipe(bpm=d["bpm"], kit={int(k): v for k, v in d["kit"].items()},
                           patterns=d["patterns"], arrangement=d.get("arrangement", []),
                           tutorial_steps=d.get("tutorialSteps", []), notes=d.get("notes", []),
                           title=d.get("title", ""), schema=d.get("schema", SCHEMA_VERSION))


def make_kit(kit_map: dict[int, str]) -> dict[int, dict[str, str]]:
    return {p: {"voice": v, "label": pads.LABELS.get(v, v)} for p, v in kit_map.items()}


def build_recipe(a: TrackAnalysis, kit_map: dict[int, str] | None = None,
                 min_confidence: float = 0.3, overrides: dict[str, dict] | None = None) -> SP404Recipe:
    kit_map = kit_map or pads.DEFAULT_KIT
    pads.validate_kit(kit_map)
    evs = [e for e in a.events if e.confidence >= min_confidence]
    pats, arr = patterns.build_patterns(evs, a.sections, a.n_bars, resolution=a.resolution, bass=a.bass)
    for p in pats:   # manual pattern edits win over the automatic consensus
        if overrides and p["name"] in overrides:
            p["steps"] = {v: sorted(int(x) for x in st) for v, st in overrides[p["name"]].items()}
            keep = {k: n for k, n in p.get("notes", {}).get("BASS", {}).items() if int(k) in p["steps"].get("BASS", [])}
            if p["steps"].get("BASS"):     # steps the user added get the pattern's most common pitch
                from collections import Counter
                base = Counter(list(p.get("notes", {}).get("BASS", {}).values())).most_common(1)
                dflt = base[0][0] if base else 29            # F1 when nothing was detected
                for st in p["steps"]["BASS"]:
                    keep.setdefault(str(st), dflt)
            p["notes"] = {"BASS": keep} if keep else {}
            p["edited"] = True
    notes = []
    if a.grid.confidence < 0.4:
        notes.append("Темп определён неуверенно — проверь BPM (÷2 / ×2) до того, как строить паттерн.")
    low = [e for e in a.events if e.confidence < min_confidence]
    if low:
        notes.append(f"{len(low)} событий с низкой уверенностью исключены из паттернов.")
    if any(p.get("notes") for p in pats):
        notes.append("Басовые ноты определены приблизительно — проверь на слух." +
                     ("" if a.stems_model else " Стемы не использовались: бас взят из полного микса."))
    r = SP404Recipe(bpm=round(a.grid.bpm, 2), kit=make_kit(kit_map), patterns=pats,
                    arrangement=arr, notes=notes, title=a.filename)
    r.tutorial_steps = tutorial.build_steps(r, kit_map)
    return r
