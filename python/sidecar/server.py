"""JSON-lines sidecar. One request per stdin line, one JSON message per stdout line.

Request : {"id": 1, "method": "analyze", "params": {...}}
Response: {"id": 1, "result": ...} | {"id": 1, "error": {"message": ...}}
Event   : {"event": "stage", "id": 1, "data": {...}}
stdout carries protocol only; diagnostics go to stderr.
"""
from __future__ import annotations

import json
import os
import sys
import threading
import traceback

from engine import pipeline
from engine.audio import decode, spectro
from engine.cache import Cache
from engine.drums import transcribe
from engine.model import DrumEvent, Grid, TrackAnalysis
from translator.sp404 import learn, pads
from translator.sp404.recipe import build_recipe

_out_lock = threading.Lock()


def send(msg: dict) -> None:
    with _out_lock:
        sys.stdout.write(json.dumps(msg) + "\n")
        sys.stdout.flush()


class Server:
    def __init__(self, cache_dir: str):
        self.cache = Cache(cache_dir)
        self.analyzer = pipeline.Analyzer(self.cache)

    # ---- methods -----------------------------------------------------------------
    def m_ping(self, p, rid):
        return {"ok": True, "version": "0.1.0"}

    def m_probe(self, p, rid):
        i = decode.probe(p["path"])
        return {"duration": i.duration, "sample_rate": i.sample_rate, "channels": i.channels,
                "peaks": decode.peaks(decode.decode(p["path"], 11025), p.get("n", 2400))}

    def m_analyze(self, p, rid):
        a = self.analyzer.run(p["path"], emit=lambda e: send({"event": "stage", "id": rid, "data": e}),
                              resolution=p.get("resolution", 16), use_cache=p.get("use_cache", True))
        return a.to_dict()

    def m_cancel(self, p, rid):
        self.analyzer.cancel_flag.set()
        return {"ok": True}

    def m_regrid(self, p, rid):
        """Apply a user BPM/origin/resolution edit: re-place all events, keep original times."""
        a = TrackAnalysis.from_dict(p["analysis"])
        g = p.get("grid", {})
        a.grid = Grid(bpm=float(g.get("bpm", a.grid.bpm)), origin=float(g.get("origin", a.grid.origin)),
                      beats_per_bar=a.grid.beats_per_bar, candidates=a.grid.candidates,
                      confidence=a.grid.confidence)
        a.resolution = int(p.get("resolution", a.resolution))
        transcribe.requantize(a.events, a.grid, a.resolution)
        return a.to_dict()

    def m_recipe(self, p, rid):
        a = TrackAnalysis.from_dict(p["analysis"])
        kit = pads.normalize_kit(p["kit"]) if p.get("kit") else None
        return build_recipe(a, kit, p.get("min_confidence", 0.3), p.get("overrides") or None).to_dict()

    def m_courses(self, p, rid):
        return learn.list_courses()

    def m_course(self, p, rid):
        return learn.build_course(p.get("name", "footwork"), pads.normalize_kit(p["kit"]) if p.get("kit") else None)

    def _stem_path(self, path: str) -> str:
        real = os.path.realpath(path)
        if not real.startswith(os.path.realpath(self.cache.root)) or not real.endswith(".wav") or not os.path.isfile(real):
            raise ValueError("not a stem file")
        return real

    def m_chop_plan(self, p, rid):
        """Regions of a stem for the chosen chop mode (whole / bars / phrases / hits)."""
        from engine.stems import chop
        y, sr = chop.load(self._stem_path(p["path"]))
        g = p.get("grid", {})
        regs = chop.plan(y, sr, p.get("mode", "whole"), float(g.get("bpm", 120)), float(g.get("origin", 0)),
                         bars=p.get("bars", 2), gap=p.get("gap", 0.35), sensitivity=p.get("sensitivity", 1.0))
        return {"regions": [{"start": float(a), "end": float(b)} for a, b in regs], "duration": len(y) / sr}

    def m_export_chops(self, p, rid):
        """Write regions of a stem as 16-bit/48 kHz mono WAV files into ``outdir``."""
        from engine.stems import chop
        y, sr = chop.load(self._stem_path(p["path"]))
        regs = [(float(r["start"]), float(r["end"])) for r in p["regions"]]
        if not regs:
            raise ValueError("nothing to export")
        files = chop.export_regions(y, sr, regs, p["outdir"], p["basename"], bool(p.get("normalize", False)))
        return {"files": files, "outdir": p["outdir"]}

    def m_cache_info(self, p, rid):
        return {"bytes": self.cache.size(), "path": str(self.cache.root)}

    def m_models_status(self, p, rid):
        from engine.stems import demucs_sep as d
        rt = d.runtime_present()
        return {"runtime": rt, "weights": rt and d.weights_present(), "name": d.MODEL_NAME, "size_mb": d.MODEL_SIZE_MB,
                "host": d.MODEL_URL_HOST, "path": str(d.models_dir()), "device": d.device_name() if rt else "n/a",
                "bytes": sum(f.stat().st_size for f in d.models_dir().rglob("*") if f.is_file())}

    def m_models_download(self, p, rid):
        from engine.stems import demucs_sep as d
        d.download_model()
        return self.m_models_status(p, rid)

    def m_cache_clear(self, p, rid):
        self.cache.clear()
        return {"ok": True}

    # ---- loop --------------------------------------------------------------------
    def handle(self, line: str):
        try:
            req = json.loads(line)
        except Exception:
            return
        rid, method = req.get("id"), req.get("method", "")
        fn = getattr(self, "m_" + method, None)
        try:
            if fn is None:
                raise ValueError(f"unknown method {method}")
            send({"id": rid, "result": fn(req.get("params") or {}, rid)})
        except pipeline.Cancelled:
            send({"id": rid, "error": {"message": "cancelled", "cancelled": True}})
        except Exception as e:
            traceback.print_exc(file=sys.stderr)
            send({"id": rid, "error": {"message": str(e)}})

    def serve(self):
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            # long jobs run on a worker so `cancel` can still be read
            threading.Thread(target=self.handle, args=(line,), daemon=True).start()


def main():
    cache_dir = os.environ.get("SP404LEARN_CACHE") or os.path.join(os.path.expanduser("~"), ".sp404learn", "cache")
    Server(cache_dir).serve()


if __name__ == "__main__":
    main()
