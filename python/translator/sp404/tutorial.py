"""Turn patterns into an ordered, concrete SP-404MKII lesson list.

Each step carries the full *visible state* (pad highlight + step grid) so the UI is a pure
renderer: it never has to infer anything from the text.
"""
from __future__ import annotations

from typing import Any

from translator.sp404 import pads, text
from translator.sp404.i18n import L

_VOICE_NAME = {"KICK": ("бочку (kick)", "the kick"), "SNARE": ("снейр", "the snare"), "CLAP": ("клэп", "the clap"),
               "CLOSED_HAT": ("закрытый хэт", "the closed hat"), "OPEN_HAT": ("открытый хэт", "the open hat"),
               "PERCUSSION": ("перкуссию", "the percussion"), "BASS": ("бас", "the bass")}


class _VoiceName:
    def get(self, k, default=None):
        v = _VOICE_NAME.get(k)
        return L(*v) if v else default


VOICE_RU = _VoiceName()


NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]


def note_name(midi: int) -> str:
    return f"{NAMES[midi % 12]}{midi // 12 - 1}"


def bass_text(steps: list[int], notes: dict) -> str:
    by: dict[str, list[int]] = {}
    for s in steps:
        by.setdefault(note_name(notes[str(s)]), []).append(s) if str(s) in notes else None
    return "; ".join(f"{n}: {L('шаг', 'step')} {' / '.join(map(str, st))}" for n, st in by.items())


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
        add(section=L("КИТ", "KIT"), title=L(f"Загрузи {pads.LABELS[v]}", f"Load {pads.LABELS[v]}"), voice=v, pad=pad,
            text=L(f"Положи сэмпл {VOICE_RU.get(v, v)} на PAD {pad}.", f"Put the sample for {VOICE_RU.get(v, v)} on PAD {pad}."))

    first = recipe.patterns[0] if recipe.patterns else None

    def create_pattern(name: str):
        add(section=L(f"ПАТТЕРН {name}", f"PATTERN {name}"), title=L(f"Создай паттерн {name}", f"Create pattern {name}"), controls=[text.BTN_PATTERN, text.BTN_REC],
            text=L(f"Нажми [{text.BTN_PATTERN}], затем [{text.BTN_REC}]. Пустые пэды мигают красным — нажми один из них: "
                   f"сюда запишется паттерн {name}. Откроется экран RECORD SETTING.",
                   f"Press [{text.BTN_PATTERN}], then [{text.BTN_REC}]. Empty pads blink red — press one of them: "
                   f"pattern {name} will be recorded there. The RECORD SETTING screen opens."))
        add(section=L(f"ПАТТЕРН {name}", f"PATTERN {name}"), title=L("Включи TR-REC", "Turn on TR-REC"), controls=[text.BTN_REMAIN, text.BTN_REC],
            text=L(f"Нажми [{text.BTN_REMAIN}] — способ записи переключится на «TR-REC». Затем нажми [{text.BTN_REC}] — запись началась. "
                   f"{text.STEP_NAMES_NOTE()} Темп паттерна ({recipe.bpm:g} BPM) настрой на приборе.",
                   f"Press [{text.BTN_REMAIN}] — the recording method switches to “TR-REC”. Then press [{text.BTN_REC}] — recording has started. "
                   f"{text.STEP_NAMES_NOTE()} Set the pattern's tempo ({recipe.bpm:g} BPM) on the unit."))

    for p in recipe.patterns:
        grid: dict[str, list[int]] = {}
        create_pattern(p["name"])
        for v in used:
            st = p["steps"].get(v, [])
            if not st:
                continue
            pad = pads.pad_for(v, kit_map)
            add(section=L(f"ПАТТЕРН {p['name']}", f"PATTERN {p['name']}"), title=L(f"{pads.LABELS[v]}: выбери сэмпл", f"{pads.LABELS[v]}: choose the sample"), voice=v, pad=pad, controls=[text.BTN_SUBPAD],
                grid=dict(grid), text=L(f"Удерживая [{text.BTN_SUBPAD}], нажми пэд {pad} — сэмпл: {VOICE_RU.get(v, v)}.", f"Holding [{text.BTN_SUBPAD}], press pad {pad} — sample: {VOICE_RU.get(v, v)}."))
            grid[v] = list(st)
            bn = p.get("notes", {}).get("BASS") if v == "BASS" else None
            tail = L(" Горящие пэды — звучащие шаги; нажми горящий пэд, чтобы убрать шаг.", " Lit pads are sounding steps; press a lit pad to remove the step.")
            body = (L(f"Нажми пэды-шаги: {_fmt_steps(st)}. Ноты баса — {bass_text(st, bn)}. "
                      "Высоту ноты ты задаёшь сам питчем сэмпла; этот способ в приложении пока не описан.",
                      f"Press the step pads: {_fmt_steps(st)}. Bass notes — {bass_text(st, bn)}. "
                      "You set the note's pitch yourself with the sample's pitch; this method isn't described in the app yet.") + tail
                    if bn else L(f"Нажми пэды-шаги: {_fmt_steps(st)} — на них зазвучит {VOICE_RU.get(v, v)}.", f"Press the step pads: {_fmt_steps(st)} — {VOICE_RU.get(v, v)} will sound on them.") + tail)
            add(section=L(f"ПАТТЕРН {p['name']}", f"PATTERN {p['name']}"), title=L(f"{pads.LABELS[v]}: расставь шаги", f"{pads.LABELS[v]}: place the steps"), voice=v, pad=pad,
                grid=dict(grid), highlight=list(st), text=body)
        add(section=L(f"ПАТТЕРН {p['name']}", f"PATTERN {p['name']}"), title=L(f"Сохрани паттерн {p['name']}", f"Save pattern {p['name']}"), grid=dict(grid), controls=[text.BTN_EXIT],
            text=L(f"Закончив, дважды нажми [{text.BTN_EXIT}] — паттерн автоматически сохранится на пэде. Включи его и сравни по слуху с треком.", f"When done, press [{text.BTN_EXIT}] twice — the pattern saves itself on the pad. Play it and compare it with the track by ear."))

    if len(recipe.patterns) > 1 and recipe.arrangement:
        seq = " → ".join(f"{a['pattern']} ({a['label']})" for a in recipe.arrangement)
        add(section=L("АРАНЖИРОВКА", "ARRANGEMENT"), title=L("Собери аранжировку", "Build the arrangement"),
            controls=[text.BTN_PATTERN, text.BTN_HOLD, text.BTN_EXIT],
            text=L(f"Порядок паттернов по треку: {seq}. Чтобы они играли сами по порядку, собери цепочку: [{text.BTN_PATTERN}], затем, удерживая "
                   f"[{text.BTN_HOLD}], нажми пэд цепочки, потом пэды паттернов в нужном порядке и [{text.BTN_EXIT}].",
                   f"Pattern order in the track: {seq}. To make them play in order by themselves, build a chain: [{text.BTN_PATTERN}], then, holding "
                   f"[{text.BTN_HOLD}], press a chain pad, then the patterns' pads in the right order and [{text.BTN_EXIT}]."))
    add(section=L("ГОТОВО", "DONE"), title=L("Готово", "Done"), text=L("Паттерны собраны. Сохрани проект на SP-404MKII и поиграй с вариациями.", "The patterns are built. Save the project on the SP-404MKII and play with variations."))
    for s in out:
        s["total"] = len(out)
    return out
