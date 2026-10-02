"""Orchestrates the analysis stages. Each stage reports real status; a failing optional
stage becomes a warning and the rest continue."""
from __future__ import annotations

import os
import threading
import time
from typing import Callable

import numpy as np

from engine.audio import decode, spectro
from engine.bass import base as bass_base
from engine.cache import Cache
from engine.drums import transcribe
from engine.model import TrackAnalysis, Grid
from engine.stems import base as stems_base
from engine.structure import segment
from engine.tempo import tempo
from engine.transcription import characteristics

STAGES = [
    ("prepare", "Preparing audio"),
    ("tempo", "Detecting tempo"),
    ("stems", "Separating stems"),
    ("drums", "Detecting drum events"),
    ("bass", "Analyzing bass"),
    ("structure", "Detecting structure"),
    ("recipe", "Building SP-404 recipe"),
]

Emit = Callable[[dict], None]


class Cancelled(Exception):
    pass


class Analyzer:
    def __init__(self, cache: Cache | None = None):
        self.cache = cache
        self.cancel_flag = threading.Event()

    def _check(self):
        if self.cancel_flag.is_set():
            raise Cancelled()

    def run(self, path: str, emit: Emit | None = None, resolution: int = 16,
            use_cache: bool = True) -> TrackAnalysis:
        emit = emit or (lambda e: None)
        self.cancel_flag.clear()
        stages: list[dict] = []

        def stage(sid: str, status: str, detail: str = "", dt: float = 0.0):
            label = dict(STAGES)[sid]
            rec = {"id": sid, "label": label, "status": status, "detail": detail, "seconds": round(dt, 2)}
            stages[:] = [s for s in stages if s["id"] != sid] + [rec]
            emit({"type": "stage", **rec})

        warnings: list[str] = []
        t0 = time.time()
        stage("prepare", "running")
        if not os.path.isfile(path):
            raise decode.AudioError(f"File not found: {path}")
        info = decode.probe(path)
        h = decode.file_hash(path)
        if self.cache and use_cache:
            hit = self.cache.get(h, resolution)
            if hit:
                a = TrackAnalysis.from_dict(hit)
                a.path, a.filename = path, os.path.basename(path)
                for sid, _ in STAGES:
                    stage(sid, "done", "cached")
                a.stages = list(stages)
                return a
        y = decode.decode(path, spectro.SR, mono=True)
        if len(y) < spectro.SR * 4:
            raise decode.AudioError("Track is shorter than 4 seconds.")
        S = spectro.magnitude(y)
        stage("prepare", "done", f"{info.duration:.1f}s, {info.sample_rate} Hz, {info.channels} ch", time.time() - t0)
        self._check()

        t = time.time(); stage("tempo", "running")
        grid, env = tempo.estimate_grid(y, S)
        stage("tempo", "done", f"{grid.bpm:.1f} BPM (confidence {grid.confidence:.0%})", time.time() - t)
        self._check()

        t = time.time(); stage("stems", "running")
        sep = stems_base.default_separator()
        ok, msg = sep.available()
        analysis_S = S
        stems = None
        if ok:
            try:
                stems = sep.separate(y, spectro.SR)
                if stems.drums is not None:
                    analysis_S = spectro.magnitude(stems.drums)
                stage("stems", "done", sep.name, time.time() - t)
            except Exception as e:  # optional stage: degrade, don't die
                warnings.append(f"Stem separation failed ({e}); analysing full mix.")
                stage("stems", "warn", str(e), time.time() - t)
        else:
            warnings.append(msg)
            stage("stems", "skipped", msg, time.time() - t)
        self._check()

        t = time.time(); stage("drums", "running")
        raw = transcribe.raw_events(analysis_S)
        kicks = np.array([r[0] for r in raw if r[1] in ("KICK", "SNARE", "CLAP") and r[2] > 0.5])
        grid = tempo.refine_with_onsets(grid, kicks)
        grid = tempo.pick_downbeat(grid, S)
        events = transcribe.to_events(raw, grid, resolution)
        # start bar 1 at the bar containing the first event (50 ms tolerance for early hits)
        if events:
            first = min(e.time for e in events)
            bar = grid.beat * grid.beats_per_bar
            k = int(np.floor((first + 0.05 - grid.origin) / bar))
            if k != 0:
                grid = Grid(grid.bpm, grid.origin + k * bar, grid.beats_per_bar, grid.candidates, grid.confidence)
                events = transcribe.to_events(raw, grid, resolution)
        stage("drums", "done", f"{len(events)} events", time.time() - t)
        self._check()

        t = time.time(); stage("bass", "running")
        ba = bass_base.default_analyzer()
        ok, msg = ba.available()
        bass = []
        if ok:
            try:
                bass = ba.analyze(stems.bass if stems and stems.bass is not None else y, spectro.SR)
                stage("bass", "done", f"{len(bass)} notes", time.time() - t)
            except Exception as e:
                warnings.append(f"Bass analysis failed ({e}).")
                stage("bass", "warn", str(e), time.time() - t)
        else:
            stage("bass", "skipped", msg, time.time() - t)
        self._check()

        t = time.time(); stage("structure", "running")
        try:
            sections = segment.segment(S, grid, events, info.duration)
            stage("structure", "done", f"{len(sections)} sections", time.time() - t)
        except Exception as e:
            sections = []
            warnings.append(f"Structure analysis failed ({e}).")
            stage("structure", "warn", str(e), time.time() - t)
        self._check()

        a = TrackAnalysis(path=path, filename=os.path.basename(path), duration=info.duration,
                          sample_rate=info.sample_rate, channels=info.channels, audio_hash=h,
                          grid=grid, events=events, sections=sections, bass=bass,
                          warnings=warnings, resolution=resolution)
        n_bars = max(1, int((info.duration - grid.origin) / (grid.beat * 4)))
        a.characteristics = characteristics.measure(events, grid, n_bars)
        a.likely_styles = characteristics.likely_styles(a.characteristics)
        stage("recipe", "done", "", 0.0)
        a.stages = list(stages)
        if self.cache:
            self.cache.put(h, a.to_dict(), resolution)
        return a
