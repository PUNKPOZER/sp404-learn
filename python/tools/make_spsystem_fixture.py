"""Regenerate tests/fixtures/spsystem/learn-mutated.spsystem: a REAL LEARN save of DROP's after-learn-and-drop.spsystem
(analysis re-run with a user BPM correction, recipe, progress, user tempo). Hand the result to DROP to cross-test.
Usage (from /python):  ../.venv/bin/python tools/make_spsystem_fixture.py"""
import os
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from engine.spsystem import adapters, fsio                      # noqa: E402
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tests"))
from test_spsystem import AFTER_LEARN_DROP, FX, track        # noqa: E402


def build(out: Path) -> Path:
    work = out.with_suffix(".work")
    shutil.copy(AFTER_LEARN_DROP, work)
    _, proj = fsio.open_project(str(work))
    a = track(corrections={"bpm": {"raw": 120.0, "user": 118.0}})
    a.grid.bpm = 118.0
    adapters.apply_analysis(proj, a.to_dict(), app_version="0.3.0", now=1760000000)
    proj.set_module("recipe", adapters.recipe_from_plan({"genre": "house", "steps": [
        {"n": 1, "id": "rhythm", "title": "Build the rhythm", "why": "four on the floor", "items": [{"type": "lesson", "id": "hs-02-drums"}]}]}, app_version="0.3.0"))
    proj.set_module("progress", adapters.progress_doc({"hs-01-what": 1760000100000}, existing=proj.data("progress")))
    proj.set_user_tempo(118.0, now=1760000000)
    fsio.save_file(proj, str(work), "save", now=1760000200, version="0.3.0")
    shutil.move(str(work), str(out))
    for ext in (".bak", ".work.bak"):
        p = Path(str(work) + ext) if ext == ".bak" else Path(str(out.with_suffix(".work")) + ".bak")
        if p.exists():
            os.unlink(p)
    return out


if __name__ == "__main__":
    print(build(FX / "learn-mutated.spsystem"))
