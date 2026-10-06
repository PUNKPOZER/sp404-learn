"""Course builder: turns a course spec (translator/sp404/courses.py) into the same step schema as
track tutorials, so one UI renders both. Patterns are original educational patterns."""
from __future__ import annotations

from typing import Any

from translator.sp404 import pads
from translator.sp404.i18n import L as T
from translator.sp404.courses import COURSES

LESSON_VOICES = {"KICK", "SNARE", "CLAP", "CLOSED_HAT", "OPEN_HAT", "PERCUSSION", "BASS", "VOCAL", "CHOP", "TEXTURE", "FX"}


def list_courses() -> list[dict[str, Any]]:
    return [{"id": c["id"], "title": c["title"], "bpm": c["bpm"], "short": c["short"], "summary": c["summary"],
             "lessons": [{"n": i + 1, "title": l["title"], "summary": l["summary"]} for i, l in enumerate(c["lessons"])]}
            for c in COURSES.values()]


def build_course(name: str = "footwork", kit_map: dict[int, str] | None = None) -> dict[str, Any]:
    spec = COURSES.get(name)
    if spec is None:
        return {"name": name, "available": False, "message": T("Такого курса нет.", "No such course."), "steps": [], "lessons": []}
    kit = kit_map or pads.DEFAULT_KIT
    patterns = {p["name"]: p for p in spec["patterns"]}
    steps: list[dict[str, Any]] = []
    grid: dict[str, list[int]] = {}
    n_lessons = len(spec["lessons"])

    def pad(v):
        return pads.pad_for(v, kit) if v else None

    def add(n, lesson, title, body, voice=None, highlight=None, controls=None):
        steps.append({"id": len(steps), "lesson": n, "lessonTitle": lesson["title"], "lessonsTotal": n_lessons,
                      "section": T(f"УРОК {n:02d}", f"LESSON {n:02d}"), "title": title, "text": body, "voice": voice, "pad": pad(voice),
                      "highlight": list(highlight or []), "controls": list(controls or []), "grid": {k: list(v) for k, v in grid.items()}})

    for n, L in enumerate(spec["lessons"], 1):
        kind = L["kind"]
        if kind == "info":
            add(n, L, L["title"], L["text"], L.get("voice"), L.get("highlight"), L.get("controls"))
        elif kind == "voice":
            v, st = L["voice"], L["steps"]
            label = pads.LABELS.get(v, v)
            add(n, L, T(f"{label}: выбери сэмпл", f"{label}: choose the sample"), f"{L['intro']} " + T(f"Удерживая [SUB PAD], нажми ПЭД {pad(v)}.", f"Holding [SUB PAD], press PAD {pad(v)}."), voice=v, controls=["SUB PAD"])
            grid[v] = list(st)
            add(n, L, T(f"{label}: расставь шаги", f"{label}: place the steps"), f"{L['how']} " + T(f"Нажми пэды-шаги: {' / '.join(map(str, st))}.", f"Press the step pads: {' / '.join(map(str, st))}."), voice=v, highlight=st)
        elif kind == "pattern":
            grid.clear()
            grid.update({k: list(v) for k, v in patterns[L["pattern"]]["steps"].items()})
            add(n, L, L["title"], L["text"], L.get("voice"), L.get("highlight"))
    for s in steps:
        s["total"] = len(steps)
    kit_out = {str(p): {"voice": v, "label": pads.LABELS.get(v, v)} for p, v in kit.items()}
    return {"name": spec["id"], "available": True, "bpm": spec["bpm"], "title": T(f"{spec['title']} — первый трек", f"{spec['title']} — first track"), "steps": steps,
            "lessons": [{"n": i + 1, "title": l["title"], "summary": l["summary"]} for i, l in enumerate(spec["lessons"])],
            "patterns": [{"name": p["name"], "bars": 1, "label": p["label"], "steps": p["steps"]} for p in spec["patterns"]],
            "kit": kit_out}
