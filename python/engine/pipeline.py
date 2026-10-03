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
from engine.stems import io as stems_io
from engine.drums import transcribe
from engine.model import TrackAnalysis, Grid
from engine.stems import base as stems_base
from engine.structure import segment
from engine.stems.base import PARTS
from engine.tempo import tempo
from engine.transcription import characteristics

STAGES = [
    ("prepare", "Подготовка аудио"),
    ("tempo", "Определение темпа"),
    ("stems", "Разделение на стемы"),
    ("drums", "Поиск ударных"),
    ("bass", "Анализ баса"),
    ("structure", "Определение структуры"),
    ("recipe", "Сборка рецепта SP-404"),
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
            raise decode.AudioError(f"Файл не найден: {path}")
        info = decode.probe(path)
        h = decode.file_hash(path)
        sep = stems_base.default_separator()
        sep_ok, sep_msg = sep.available()
        tag = "stems" if sep_ok else "mix"
        if self.cache and use_cache:
            hit = self.cache.get(h, resolution, tag)
            if hit:
                a = TrackAnalysis.from_dict(hit)
                a.path, a.filename = path, os.path.basename(path)
                for sid, _ in STAGES:
                    stage(sid, "done", "из кэша")
                a.stages = list(stages)
                return a
        y = decode.decode(path, spectro.SR, mono=True)
        if len(y) < spectro.SR * 4:
            raise decode.AudioError("Трек короче 4 секунд.")
        S = spectro.magnitude(y)
        stage("prepare", "done", f"{info.duration:.1f} с, {info.sample_rate} Гц, {info.channels} кан.", time.time() - t0)
        self._check()

        t = time.time(); stage("tempo", "running")
        grid, env = tempo.estimate_grid(y, S)
        stage("tempo", "done", f"{grid.bpm:.1f} BPM (уверенность {grid.confidence:.0%})", time.time() - t)
        self._check()

        mix_meta = None
        if self.cache:
            try:
                mix_meta = stems_io.save_mix(self.cache.stems_dir(h), decode.decode(path, 44100, mono=False))
            except Exception as e:
                warnings.append(f"Воспроизведение трека недоступно ({e}).")
        t = time.time(); stage("stems", "running")
        analysis_S = S
        stems_y: dict[str, np.ndarray] = {}
        stem_meta: dict[str, dict] = {}
        if sep_ok:
            try:
                x = decode.decode(path, 44100, mono=False)
                last = [-1.0]

                def prog(f: float):
                    if f - last[0] >= 0.05:
                        last[0] = f
                        stage("stems", "running", f"{int(f * 100)}%", time.time() - t)
                res = sep.separate(x, 44100, prog)
                self._check()
                from scipy.signal import resample_poly
                for part in PARTS:
                    if part in res.stems:
                        stems_y[part] = resample_poly(res.stems[part], 1, 2).astype(np.float32)
                        if self.cache:
                            stem_meta[part] = stems_io.save(self.cache.stems_dir(h), part, res.stems[part], 44100)
                analysis_S = spectro.magnitude(stems_y["drums"]) if "drums" in stems_y else S
                stage("stems", "done", f"{sep.name} · партий: {len(stems_y)}", time.time() - t)
            except Cancelled:
                raise
            except Exception as e:  # optional stage: degrade, don't die
                warnings.append(f"Разделение на стемы не удалось ({e}); анализирую полный микс.")
                stage("stems", "warn", str(e), time.time() - t)
                stems_y, stem_meta, sep_ok = {}, {}, False
        else:
            warnings.append(sep_msg)
            stage("stems", "skipped", sep_msg, time.time() - t)
        self._check()

        t = time.time(); stage("drums", "running")
        raw_mix = transcribe.raw_events(S)
        raw = list(raw_mix) if analysis_S is S else transcribe.raw_events(analysis_S)
        if analysis_S is not S:
            # Separation can drop quiet hits. Keep the stem result, and add full-mix hits (never kicks:
            # bass bleeds into the low band) that the stem pass missed, at reduced confidence.
            have = [(t, ty) for t, ty, *_ in raw]
            for t, ty, c, v in raw_mix:
                if ty != "KICK" and not any(ty == ty2 and abs(t - t2) < 0.03 for t2, ty2 in have):
                    raw.append((t, ty, c * 0.7, v))
            raw.sort()
        # grid fitting always uses the full-mix hits: timing there is not affected by separation artefacts
        kicks = np.array([r[0] for r in raw_mix if r[1] in ("KICK", "SNARE", "CLAP") and r[2] > 0.5])
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
        stage("drums", "done", f"событий: {len(events)}", time.time() - t)
        self._check()

        t = time.time(); stage("bass", "running")
        ba = bass_base.default_analyzer()
        bass = []
        try:
            src = stems_y.get("bass")
            bass = ba.analyze(src if src is not None else y, grid, resolution, from_stem=src is not None)
            detail = f"нот: {len(bass)}" + ("" if src is not None else " (из полного микса — низкая уверенность)")
            if src is None:
                warnings.append("Ноты баса взяты из полного микса (без стемов) и приблизительны.")
            stage("bass", "done", detail, time.time() - t)
        except Exception as e:
            warnings.append(f"Анализ баса не удался ({e}).")
            stage("bass", "warn", str(e), time.time() - t)
        self._check()

        t = time.time(); stage("structure", "running")
        try:
            sections = segment.segment(S, grid, events, info.duration)
            stage("structure", "done", f"секций: {len(sections)}", time.time() - t)
        except Exception as e:
            sections = []
            warnings.append(f"Анализ структуры не удался ({e}).")
            stage("structure", "warn", str(e), time.time() - t)
        self._check()

        a = TrackAnalysis(path=path, filename=os.path.basename(path), duration=info.duration,
                          sample_rate=info.sample_rate, channels=info.channels, audio_hash=h,
                          grid=grid, events=events, sections=sections, bass=bass,
                          warnings=warnings, resolution=resolution,
                          stems={**stem_meta, **({"mix": mix_meta} if mix_meta else {})},
                          stems_model=sep.name if stem_meta else "")
        n_bars = max(1, int((info.duration - grid.origin) / (grid.beat * 4)))
        a.characteristics = characteristics.measure(events, grid, n_bars)
        if "vocals" in stems_y:
            a.characteristics["vocal_activity"] = stems_io.activity_fraction(stems_y["vocals"], grid, n_bars)
        a.likely_styles = characteristics.likely_styles(a.characteristics)
        stage("recipe", "done", "", 0.0)
        a.stages = list(stages)
        if self.cache:
            self.cache.put(h, a.to_dict(), resolution, tag)
        return a
