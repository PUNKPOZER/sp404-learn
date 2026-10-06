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
        kw.setdefault("controls", [])
        out.append(kw)

    used: list[str] = []
    for p in recipe.patterns:
        for v, st in p["steps"].items():
            if st and v not in used:
                used.append(v)
    used.sort(key=pads.VOICES.index)

    for v in used:
        pad = pads.pad_for(v, kit_map)
        add(section="КИТ", title=f"Загрузи {pads.LABELS[v]}", voice=v, pad=pad,
            text=f"Положи сэмпл {VOICE_RU.get(v, v)} на PAD {pad}.")

    first = recipe.patterns[0] if recipe.patterns else None

    def create_pattern(name: str):
        add(section=f"ПАТТЕРН {name}", title=f"Создай паттерн {name}", controls=[text.BTN_PATTERN, text.BTN_REC],
            text=(f"Нажми [{text.BTN_PATTERN}], затем [{text.BTN_REC}]. Пустые пэды мигают красным — нажми один из них: "
                  f"сюда запишется паттерн {name}. Откроется экран RECORD SETTING."))
        add(section=f"ПАТТЕРН {name}", title="Включи TR-REC", controls=[text.BTN_REMAIN, text.BTN_REC],
            text=(f"Нажми [{text.BTN_REMAIN}] — способ записи переключится на «TR-REC». Затем нажми [{text.BTN_REC}] — запись началась. "
                  f"{text.STEP_NAMES_NOTE} Темп паттерна ({recipe.bpm:g} BPM) настрой на приборе."))

    for p in recipe.patterns:
        grid: dict[str, list[int]] = {}
        create_pattern(p["name"])
        for v in used:
            st = p["steps"].get(v, [])
            if not st:
                continue
            pad = pads.pad_for(v, kit_map)
            add(section=f"ПАТТЕРН {p['name']}", title=f"{pads.LABELS[v]}: выбери сэмпл", voice=v, pad=pad, controls=[text.BTN_SUBPAD],
                grid=dict(grid), text=f"Удерживая [{text.BTN_SUBPAD}], нажми пэд {pad} — сэмпл: {VOICE_RU.get(v, v)}.")
            grid[v] = list(st)
            bn = p.get("notes", {}).get("BASS") if v == "BASS" else None
            tail = " Горящие пэды — звучащие шаги; нажми горящий пэд, чтобы убрать шаг."
            body = (f"Нажми пэды-шаги: {_fmt_steps(st)}. Ноты баса — {bass_text(st, bn)}. "
                    "Высоту ноты ты задаёшь сам питчем сэмпла; этот способ в приложении пока не описан." + tail
                    if bn else f"Нажми пэды-шаги: {_fmt_steps(st)} — на них зазвучит {VOICE_RU.get(v, v)}." + tail)
            add(section=f"ПАТТЕРН {p['name']}", title=f"{pads.LABELS[v]}: расставь шаги", voice=v, pad=pad,
                grid=dict(grid), highlight=list(st), text=body)
        add(section=f"ПАТТЕРН {p['name']}", title=f"Сохрани паттерн {p['name']}", grid=dict(grid), controls=[text.BTN_EXIT],
            text=f"Закончив, дважды нажми [{text.BTN_EXIT}] — паттерн автоматически сохранится на пэде. Включи его и сравни по слуху с треком.")

    if len(recipe.patterns) > 1 and recipe.arrangement:
        seq = " → ".join(f"{a['pattern']} ({a['label']})" for a in recipe.arrangement)
        add(section="АРАНЖИРОВКА", title="Собери аранжировку",
            controls=[text.BTN_PATTERN, text.BTN_HOLD, text.BTN_EXIT],
            text=(f"Порядок паттернов по треку: {seq}. Чтобы они играли сами по порядку, собери цепочку: [{text.BTN_PATTERN}], затем, удерживая "
                  f"[{text.BTN_HOLD}], нажми пэд цепочки, потом пэды паттернов в нужном порядке и [{text.BTN_EXIT}]."))
    add(section="ГОТОВО", title="Готово", text="Паттерны собраны. Сохрани проект на SP-404MKII и поиграй с вариациями.")
    for s in out:
        s["total"] = len(out)
    return out
