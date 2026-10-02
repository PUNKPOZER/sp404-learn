"""Footwork course — ORIGINAL educational patterns (general Chicago footwork/juke principles,
not transcriptions of any recording). Output is the same step schema as track tutorials."""
from __future__ import annotations

from typing import Any

from translator.sp404 import pads, text

BPM = 160

KICK = [1, 4, 7, 11, 16]
CLAP = [5, 13]
SNARE = [8, 15]
CHAT = [1, 3, 5, 7, 9, 11, 13, 15]
OHAT = [11]
PERC = [2, 6, 10, 14]
BASS = [1, 7, 12]
VOCAL = [4, 10]
GHOST = [14]
KICK_B = [1, 4, 7, 10, 12, 16]
FILL = {"KICK": [1, 4, 7, 10, 12, 14, 15, 16], "SNARE": [9, 11, 13, 14, 15, 16], "CLOSED_HAT": list(range(1, 17))}

LESSONS = [
    (1, "Drum kit", "Раскладываем пэды"),
    (2, "Kick", "Синкопированная бочка"),
    (3, "Clap", "Клэп на 5 и 13"),
    (4, "Snare", "Снейр между клэпами"),
    (5, "Closed hats", "Восьмые хэты"),
    (6, "Open hats", "Акцент открытого хэта"),
    (7, "Percussion", "Перкуссия на «и»"),
    (8, "Syncopation", "Почему footwork «спотыкается»"),
    (9, "Ghost hits", "Тихие призрачные удары"),
    (10, "Substeps", "Деление шага"),
    (11, "Bass", "Саб-бас под бочку"),
    (12, "Vocal chops", "Вокальные нарезки"),
    (13, "Pattern variation", "Pattern B"),
    (14, "Fill", "Филл перед сменой"),
    (15, "Break", "Брейк: убрать барабаны"),
    (16, "Arrangement", "Порядок паттернов"),
    (17, "FX", "Эффекты и переходы"),
    (18, "Final track", "Собираем и играем"),
]


def build_course(name: str = "footwork", kit_map: dict[int, str] | None = None) -> dict[str, Any]:
    if name != "footwork":
        return {"name": name, "available": False, "message": "Курс пока готов только для Footwork.", "steps": [], "lessons": []}
    kit = kit_map or pads.DEFAULT_KIT
    steps: list[dict[str, Any]] = []
    grid: dict[str, list[int]] = {}
    title_of = {n: t for n, t, _ in LESSONS}

    def pad(v):
        return pads.pad_for(v, kit)

    def add(lesson, title, body, voice=None, highlight=None, snapshot=True):
        steps.append({"id": len(steps), "lesson": lesson, "lessonTitle": title_of[lesson], "section": f"LESSON {lesson:02d}",
                      "title": title, "text": body, "voice": voice, "pad": pad(voice) if voice else None,
                      "highlight": highlight or [], "grid": {k: list(v) for k, v in grid.items()}})

    def voice_lesson(n, v, st, intro, how):
        add(n, f"{pads.LABELS[v]}: выбери пэд", intro, voice=v)
        grid[v] = list(st)
        add(n, f"{pads.LABELS[v]}: расставь шаги", f"{how} Шаги: {' / '.join(map(str, st))}.", voice=v, highlight=st)

    add(1, "Собери кит", f"Загрузи на пэды: 1 KICK, 2 SNARE, 3 CLAP, 4 CLOSED HAT, 5 OPEN HAT, 6 PERC, 7 BASS, 8 VOCAL. "
        f"Темп footwork — около {BPM} BPM; поставь BPM {BPM}. Включи {text.BTN_TRREC}, 16 шагов = один такт.")
    voice_lesson(2, "KICK", KICK, "Footwork строится на бочке, которая не стоит «ровно».",
                 "Бочки идут группами 3+3+... — не четыре в пол.")
    voice_lesson(3, "CLAP", CLAP, "Клэп держит ритм как опора.", "Клэп на 5 и 13 (середины половин такта).")
    voice_lesson(4, "SNARE", SNARE, "Снейр отвечает клэпу и ломает ожидаемую сетку.", "Снейр на 8 и 15.")
    voice_lesson(5, "CLOSED_HAT", CHAT, "Хэты — быстрый «мотор» трека.", "Закрытый хэт на каждый второй шаг.")
    voice_lesson(6, "OPEN_HAT", OHAT, "Открытый хэт — акцент, а не фон.", "Один открытый хэт на 11.")
    voice_lesson(7, "PERCUSSION", PERC, "Перкуссия заполняет «и» между хэтами.", "Перкуссия на 2 / 6 / 10 / 14.")
    add(8, "Синкопа", "Посмотри на сетку: бочка в 1, 4, 7, 11, 16 — расстояния 3, 3, 4, 5. Эта неровность и создаёт «спотыкающийся» грув. "
        "Попробуй сдвинуть любую бочку на шаг и послушай, как меняется ощущение.", voice="KICK", highlight=KICK)
    voice_lesson(9, "SNARE", SNARE + GHOST, "Призрачный удар — тихий снейр между основными.",
                 "Добавь тихий снейр на шаг 14 (уменьши громкость пэда, чтобы он был «призраком»).")
    add(10, "Деление шага", "Substeps — удары быстрее шестнадцатых (роллы). На шаге 16 попробуй дважды ударить по hat/snare внутри одного шага: "
        "сначала на слух, потом через повтор ноты. Это приём для заполнений, в базовый паттерн не добавляем.", voice="CLOSED_HAT", highlight=[15, 16])
    voice_lesson(11, "BASS", BASS, "Саб-бас повторяет ритм бочки, но реже.", "Бас на шаги 1, 7, 12 (низкая нота, например F1).")
    voice_lesson(12, "VOCAL", VOCAL, "Короткие вокальные нарезки отвечают ритму.", "Вокальный чоп на 4 и 10.")

    base = {k: list(v) for k, v in grid.items()}
    grid["KICK"] = list(KICK_B)
    add(13, "Pattern B", "Сделай вариацию: создай Pattern B, скопируй A и измени бочку.", voice="KICK", highlight=KICK_B)
    fill_grid = {**base, **FILL}
    grid.clear(); grid.update(fill_grid)
    add(14, "Филл", "Pattern C — филл на один такт: плотные бочки справа, снейры подряд, хэты на каждом шаге.", highlight=FILL["KICK"])
    grid.clear(); grid.update({"BASS": BASS, "VOCAL": VOCAL})
    add(15, "Брейк", "Pattern D — брейк: убери барабаны, оставь бас и вокал. Контраст делает возвращение бита сильнее.", highlight=VOCAL)
    grid.clear(); grid.update(base)
    add(16, "Аранжировка", "Порядок: A, A, B, B, C (филл), D (брейк), A, B, C. Переключай паттерны в конце каждого такта-цикла.")
    add(17, "FX", f"Пэды 13–16 — эффекты, филл, текстура и ресэмпл. Запиши один эффект-переход в конец филла.", voice=None)
    add(18, "Финал", "Играй цепочку A → B → C → D → A. Это твой первый законченный footwork-трек: сохрани проект и запиши его.")
    for s in steps:
        s["total"] = len(steps)
    patterns = [
        {"name": "A", "bars": 1, "label": "MAIN", "steps": base},
        {"name": "B", "bars": 1, "label": "VARIATION", "steps": {**base, "KICK": KICK_B}},
        {"name": "C", "bars": 1, "label": "FILL", "steps": fill_grid},
        {"name": "D", "bars": 1, "label": "BREAK", "steps": {"BASS": BASS, "VOCAL": VOCAL}},
    ]
    return {"name": "footwork", "available": True, "bpm": BPM, "title": "Footwork — первый трек", "steps": steps,
            "lessons": [{"n": n, "title": t, "summary": s} for n, t, s in LESSONS], "patterns": patterns,
            "kit": {str(p): {"voice": v, "label": pads.LABELS.get(v, v)} for p, v in kit.items()}}
