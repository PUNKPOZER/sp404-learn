"""Plain-data model shared by engine, translator and sidecar.

Everything serialises to JSON-compatible dicts via ``to_dict`` / ``from_dict``
so projects, the cache and the UI all speak the same shape.
"""
from __future__ import annotations

from dataclasses import dataclass, field, asdict, fields
from typing import Any

DRUM_TYPES = ["KICK", "SNARE", "CLAP", "CLOSED_HAT", "OPEN_HAT", "PERCUSSION", "UNKNOWN"]
SCHEMA_VERSION = 1


@dataclass
class DrumEvent:
    id: str
    time: float                 # original time in seconds (never altered by quantizing)
    type: str
    confidence: float           # 0..1, 1.0 for manual events
    velocity: float             # 0..1
    bar: int = 0                # 0-based bar index on the grid
    step: int = 0               # 0-based step inside the bar (0..steps_per_bar-1)
    quantized_time: float = 0.0
    timing_offset: float = 0.0  # seconds: original - quantized (negative = early)
    manual: bool = False

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @staticmethod
    def from_dict(d: dict[str, Any]) -> "DrumEvent":
        names = {f.name for f in fields(DrumEvent)}
        return DrumEvent(**{k: v for k, v in d.items() if k in names})


@dataclass
class BassNote:
    time: float
    duration: float
    midi: int
    confidence: float
    bar: int = 0
    step: int = 0

    def to_dict(self):
        return asdict(self)


@dataclass
class Section:
    label: str
    start: float
    end: float
    start_bar: int
    end_bar: int            # exclusive
    cluster: str = "A"      # similarity group: A, B, C, D
    energy: float = 0.0

    def to_dict(self):
        return asdict(self)


@dataclass
class Grid:
    bpm: float
    origin: float                 # time (s) of step 0 of bar 0
    beats_per_bar: int = 4
    candidates: list[float] = field(default_factory=list)  # alternative bpm readings
    confidence: float = 0.0

    @property
    def beat(self) -> float:
        return 60.0 / self.bpm

    def step_dur(self, steps_per_beat: int = 4) -> float:
        return self.beat / steps_per_beat

    def to_dict(self):
        return asdict(self)


@dataclass
class TrackAnalysis:
    path: str
    filename: str
    duration: float
    sample_rate: int
    channels: int
    audio_hash: str
    grid: Grid
    events: list[DrumEvent] = field(default_factory=list)
    sections: list[Section] = field(default_factory=list)
    bass: list[BassNote] = field(default_factory=list)
    characteristics: dict[str, float] = field(default_factory=dict)
    likely_styles: list[dict[str, Any]] = field(default_factory=list)
    genre: dict[str, Any] | None = None          # Genre Engine 2.0 prediction (only when the Genre Pack is installed)
    genre_user: str | None = None                # the user's own correction; never overwrites `genre`
    corrections: dict[str, Any] = field(default_factory=dict)   # user corrections kept beside (never over) the raw readings, e.g. {'bpm': {'raw': 87.0, 'user': 174.0}}
    warnings: list[str] = field(default_factory=list)
    stages: list[dict[str, Any]] = field(default_factory=list)
    resolution: int = 16          # steps per bar used for quantizing
    stems: dict[str, dict[str, Any]] = field(default_factory=dict)   # part → {path, peaks, activity}
    stems_model: str = ""
    schema: int = SCHEMA_VERSION

    @property
    def n_bars(self) -> int:
        if not self.events:
            return max(1, int((self.duration - self.grid.origin) / (self.grid.beat * 4)))
        return max(e.bar for e in self.events) + 1

    def to_dict(self) -> dict[str, Any]:
        return {
            "schema": self.schema,
            "path": self.path, "filename": self.filename, "duration": self.duration,
            "sample_rate": self.sample_rate, "channels": self.channels,
            "audio_hash": self.audio_hash,
            "grid": self.grid.to_dict(),
            "events": [e.to_dict() for e in self.events],
            "sections": [s.to_dict() for s in self.sections],
            "bass": [b.to_dict() for b in self.bass],
            "characteristics": self.characteristics,
            "likely_styles": self.likely_styles,
            "genre": self.genre, "genre_user": self.genre_user, "corrections": self.corrections,
            "warnings": self.warnings,
            "stages": self.stages,
            "resolution": self.resolution,
            "stems": self.stems, "stems_model": self.stems_model,
        }

    @staticmethod
    def from_dict(d: dict[str, Any]) -> "TrackAnalysis":
        return TrackAnalysis(
            path=d["path"], filename=d["filename"], duration=d["duration"],
            sample_rate=d["sample_rate"], channels=d["channels"], audio_hash=d["audio_hash"],
            grid=Grid(**d["grid"]),
            events=[DrumEvent.from_dict(e) for e in d.get("events", [])],
            sections=[Section(**s) for s in d.get("sections", [])],
            bass=[BassNote(**b) for b in d.get("bass", [])],
            characteristics=d.get("characteristics", {}),
            likely_styles=d.get("likely_styles", []),
            genre=d.get("genre"), genre_user=d.get("genre_user"), corrections=d.get("corrections", {}),
            warnings=d.get("warnings", []),
            stages=d.get("stages", []),
            resolution=d.get("resolution", 16),
            stems=d.get("stems", {}), stems_model=d.get("stems_model", ""),
            schema=d.get("schema", SCHEMA_VERSION),
        )
