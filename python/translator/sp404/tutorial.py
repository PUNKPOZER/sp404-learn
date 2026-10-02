"""Turn patterns into an ordered, concrete SP-404MKII lesson list.

Each step carries the full *visible state* (pad highlight + step grid) so the UI is a pure
renderer: it never has to infer anything from the text.
"""
from __future__ import annotations

from typing import Any

from translator.sp404 import pads, text

VOICE_RU = {"KICK": "бочку (kick)", "SNARE": "снейр", "CLAP": "клэп", "CLOSED_HAT": "закрытый хэт",
            "OPEN_HAT": "открытый хэт", "PERCUSSION": "перкуссию", "BASS": "бас"}


NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]


def note_name(midi: int) -> str:
    return f"{NAMES[midi % 12]}{midi // 12 - 1}"


def bass_text(steps: list[int], notes: dict) -> str:
    by: dict[str, list[int]] = {}
    for s in steps:
        by.setdefault(note_name(notes[str(s)]), []).append(s) if str(s) in notes else None
    return "; ".join(f"{n}: шаг {' / '.join(map(str, st))}" for n, st in by.items())


def _fmt_steps(steps: list[int]) -> str:
    return " / ".join(str(s) for s in steps)


def build_steps(recipe, kit_map: dict[int, str]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []

    def add(**kw):
        kw["id"] = len(out)
        kw.setdefault("grid", {})
        kw.setdefault("pad", None)
        kw.setdefault("highlight", [])
        kw.setdefault("voice", None)
        out.append(kw)

    used: list[str] = []
    for p in recipe.patterns:
        for v, st in p["steps"].items():
            if st and v not in used:
                used.append(v)
    used.sort(key=pads.VOICES.index)

    for v in used:
        pad = pads.pad_for(v, kit_map)
        add(section="KIT", title=f"Загрузи {pads.LABELS[v]}", voice=v, pad=pad,
            text=f"Положи сэмпл {VOICE_RU.get(v, v)} на PAD {pad}.")

    first = recipe.patterns[0] if recipe.patterns else None
    add(section="SETUP", title="Открой режим паттернов",
        text=f"Нажми {text.BTN_PATTERN}, выбери пустой паттерн и подтверди создание: это Pattern A.")
    add(section="SETUP", title=f"Установи BPM = {recipe.bpm:g}",
        text=f"Зажми {text.BTN_BPM} и выставь темп {recipe.bpm:g}. Метроном/клик можно включить для проверки.")
    add(section="SETUP", title="Включи пошаговый ввод",
        text=f"Включи {text.BTN_TRREC}. Шаги 1–16 — один такт. {text.STEP_NAMES_NOTE}")

    for p in recipe.patterns:
        grid: dict[str, list[int]] = {}
        if p is not first:
            add(section=f"PATTERN {p['name']}", title=f"Создай Pattern {p['name']}",
                text=f"Выбери новый пустой паттерн ({p['name']}), BPM {recipe.bpm:g}, снова {text.BTN_TRREC}.", grid={})
        for v in used:
            st = p["steps"].get(v, [])
            if not st:
                continue
            pad = pads.pad_for(v, kit_map)
            add(section=f"PATTERN {p['name']}", title=f"{pads.LABELS[v]}: выбери пэд", voice=v, pad=pad,
                grid=dict(grid), text=f"Выбери {VOICE_RU.get(v, v)} на PAD {pad}.")
            grid[v] = list(st)
            bn = p.get("notes", {}).get("BASS") if v == "BASS" else None
            body = (f"Поставь бас на шаги: {_fmt_steps(st)}. Ноты — {bass_text(st, bn)}. "
                    "Высоту задай питчем сэмпла на пэде (клавиатурный режим пэдов или подстройка Pitch)."
                    if bn else f"Поставь {VOICE_RU.get(v, v)} на шаги: {_fmt_steps(st)}.")
            add(section=f"PATTERN {p['name']}", title=f"{pads.LABELS[v]}: расставь шаги", voice=v, pad=pad,
                grid=dict(grid), highlight=list(st), text=body)
        add(section=f"PATTERN {p['name']}", title=f"Проверь Pattern {p['name']}", grid=dict(grid),
            text="Включи воспроизведение и сравни по слуху. Если что-то не так — вернись к нужному инструменту.")

    if len(recipe.patterns) > 1 and recipe.arrangement:
        seq = " → ".join(f"{a['pattern']} ({a['label']})" for a in recipe.arrangement)
        add(section="ARRANGEMENT", title="Собери аранжировку",
            text=f"Порядок паттернов по треку: {seq}. Переключай паттерны в нужные моменты (или запиши цепочку).")
    add(section="DONE", title="Готово", text="Паттерны собраны. Сохрани проект на SP-404MKII и поиграй с вариациями.")
    for s in out:
        s["total"] = len(out)
    return out
