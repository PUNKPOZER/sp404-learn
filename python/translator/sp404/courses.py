"""Genre courses. Every pattern here is an ORIGINAL educational pattern built from general, well-known
genre conventions — none is a transcription of a specific recording.

Steps are 1-based positions in a 16-step bar (1/16 notes). A lesson is one of:
  info    – explanation (optionally pointing at a voice / steps)
  voice   – pick the pad, then place the steps for one voice (cumulative on the grid)
  pattern – show a whole named pattern (variation, fill, break…)
"""
from __future__ import annotations

from typing import Any

from translator.sp404.i18n import L, get_lang, set_lang
from translator.sp404.text import STEP_NAMES_NOTE, TRREC_CONTROLS, TRREC_HOWTO

def info(title, summary, text, voice=None, highlight=None, controls=None):
    return dict(kind="info", title=title, summary=summary, text=text, voice=voice, highlight=highlight or [], controls=controls or [])


def voice(title, summary, v, steps, intro, how):
    return dict(kind="voice", title=title, summary=summary, voice=v, steps=steps, intro=intro, how=how)


def pattern(title, summary, name, text, highlight=None, voice_=None):
    return dict(kind="pattern", title=title, summary=summary, pattern=name, text=text, highlight=highlight or [], voice=voice_)


def kit_lesson(bpm, extra=""):
    return info(L("Драм-кит", "Drum kit"), L("Раскладываем пэды", "Laying out the pads"),
                L(f"Загрузи на пэды: 1 БОЧКА, 2 СНЕЙР, 3 КЛЭП, 4 ХЭТ ЗАКР., 5 ХЭТ ОТКР., 6 ПЕРК., 7 БАС, 8 ВОКАЛ; 9–12 — нарезки, "
                  f"13–16 — FX, филл, текстура, ресэмпл. Темп — {bpm} BPM. Запись по шагам (TR-REC): {TRREC_HOWTO()} {STEP_NAMES_NOTE()}{extra}",
                  f"Load the pads: 1 KICK, 2 SNARE, 3 CLAP, 4 HAT CL., 5 HAT OP., 6 PERC., 7 BASS, 8 VOCAL; 9–12 — chops, "
                  f"13–16 — FX, fill, texture, resample. Tempo — {bpm} BPM. Step recording (TR-REC): {TRREC_HOWTO()} {STEP_NAMES_NOTE()}{extra}"),
                controls=TRREC_CONTROLS)


def arrangement(order, extra=""):
    return info(L("Аранжировка", "Arrangement"), L("Порядок паттернов", "Pattern order"),
                L(f"Порядок: {order}. Переключай паттерны в конце каждого такта-цикла.{extra}", f"Order: {order}. Switch patterns at the end of each bar cycle.{extra}"))


def final(text=None):
    text = text or L("Играй цепочку паттернов целиком. Сохрани проект и запиши результат — это твой первый законченный трек в жанре.",
                     "Play the pattern chain all the way through. Save the project and record the result — this is your first finished track in the genre.")
    return info(L("Финальный трек", "Final track"), L("Собираем и играем", "Put it together and play"), text)



def fx_note():
    return (L("Эффекты на SP-404MKII (например Reverb, Tape Echo, Vinyl Sim, Cassette Sim, Lo-fi) вешаются на шину пэда; точные названия смотри в списке эффектов своей прошивки.", "Effects on the SP-404MKII (for example Reverb, Tape Echo, Vinyl Sim, Cassette Sim, Lo-fi) are put on the pad's bus; check the exact names in your firmware's effect list."))


def _build() -> dict[str, dict[str, Any]]:
    FX_NOTE = fx_note()
    # ------------------------------------------------------------------------------------------ footwork
    FOOTWORK = dict(
        id="footwork", title="Footwork / Juke", bpm=160, short=L("Синкопированная бочка, быстрые хэты", "Syncopated kick, fast hats"),
        summary=L("Чикагский footwork: рваная бочка, клэп и снейр в «ответе», быстрые хэты и вокальные нарезки.", "Chicago footwork: a broken kick, claps and snares as the “answer”, fast hats and vocal chops."),
        patterns=[
            dict(name="A", label="MAIN", steps={"KICK": [1, 4, 7, 11, 16], "CLAP": [5, 13], "SNARE": [8, 15], "CLOSED_HAT": [1, 3, 5, 7, 9, 11, 13, 15],
                 "OPEN_HAT": [11], "PERCUSSION": [2, 6, 10, 14], "BASS": [1, 7, 12], "VOCAL": [4, 10]}),
            dict(name="B", label="VARIATION", steps={"KICK": [1, 4, 7, 10, 12, 16], "CLAP": [5, 13], "SNARE": [8, 15], "CLOSED_HAT": [1, 3, 5, 7, 9, 11, 13, 15],
                 "OPEN_HAT": [11], "PERCUSSION": [2, 6, 10, 14], "BASS": [1, 7, 12], "VOCAL": [4, 10]}),
            dict(name="C", label="FILL", steps={"KICK": [1, 4, 7, 10, 12, 14, 15, 16], "CLAP": [5, 13], "SNARE": [9, 11, 13, 14, 15, 16],
                 "CLOSED_HAT": list(range(1, 17)), "OPEN_HAT": [11], "PERCUSSION": [2, 6, 10, 14], "BASS": [1, 7, 12], "VOCAL": [4, 10]}),
            dict(name="D", label="BREAK", steps={"BASS": [1, 7, 12], "VOCAL": [4, 10]}),
        ],
        lessons=[
            kit_lesson(160, L(" Footwork живёт около 160 BPM.", " Footwork lives at around 160 BPM.")),
            voice(L("Бочка", "Kick"), L("Синкопированная бочка", "Syncopated kick"), "KICK", [1, 4, 7, 11, 16], L("Footwork строится на бочке, которая не стоит «ровно».", "Footwork is built on a kick that doesn't sit “straight”."), L("Бочки идут группами 3+3+… — не четыре в пол.", "Kicks come in groups of 3+3+… — not four on the floor.")),
            voice(L("Клэп", "Clap"), L("Клэп на 5 и 13", "Clap on 5 and 13"), "CLAP", [5, 13], L("Клэп держит ритм как опора.", "The clap holds the rhythm like an anchor."), L("Клэп на 5 и 13 (середины половин такта).", "Clap on 5 and 13 (the middles of the half-bars).")),
            voice(L("Снейр", "Snare"), L("Снейр между клэпами", "Snare between the claps"), "SNARE", [8, 15], L("Снейр отвечает клэпу и ломает ожидаемую сетку.", "The snare answers the clap and breaks the expected grid."), L("Снейр на 8 и 15.", "Snare on 8 and 15.")),
            voice(L("Закрытые хэты", "Closed hats"), L("Восьмые хэты", "Eighth-note hats"), "CLOSED_HAT", [1, 3, 5, 7, 9, 11, 13, 15], L("Хэты — быстрый «мотор» трека.", "Hats are the track's fast “engine”."), L("Закрытый хэт на каждый второй шаг.", "Closed hat on every second step.")),
            voice(L("Открытые хэты", "Open hats"), L("Акцент открытого хэта", "An open-hat accent"), "OPEN_HAT", [11], L("Открытый хэт — акцент, а не фон.", "The open hat is an accent, not a background."), L("Один открытый хэт на 11.", "One open hat on 11.")),
            voice(L("Перкуссия", "Percussion"), L("Перкуссия на «и»", "Percussion on the “and”"), "PERCUSSION", [2, 6, 10, 14], L("Перкуссия заполняет «и» между хэтами.", "Percussion fills the “and” between the hats."), L("Перкуссия на 2 / 6 / 10 / 14.", "Percussion on 2 / 6 / 10 / 14.")),
            info(L("Синкопа", "Syncopation"), L("Почему footwork «спотыкается»", "Why footwork “stumbles”"), L("Посмотри на сетку: бочка в 1, 4, 7, 11, 16 — расстояния 3, 3, 4, 5. Эта неровность и создаёт «спотыкающийся» грув. Попробуй сдвинуть любую бочку на шаг и послушай, как меняется ощущение.", "Look at the grid: kicks on 1, 4, 7, 11, 16 — gaps of 3, 3, 4, 5. That unevenness creates the “stumbling” groove. Try moving any kick by a step and hear how the feel changes."), "KICK", [1, 4, 7, 11, 16]),
            voice(L("Призрачные удары", "Ghost hits"), L("Тихие призрачные удары", "Quiet ghost hits"), "SNARE", [8, 14, 15], L("Призрачный удар — тихий снейр между основными.", "A ghost hit is a quiet snare between the main ones."),
                  L("Добавь тихий снейр на шаг 14 (уменьши громкость пэда, чтобы он был «призраком»).", "Add a quiet snare on step 14 (lower the pad volume so it's a “ghost”).")),
            info(L("Деление шага", "Step division"), L("Деление шага", "Step division"), L("Substeps — удары быстрее шестнадцатых (роллы). На шаге 16 попробуй дважды ударить по хэту или снейру внутри одного шага: сначала на слух, потом через повтор ноты. Это приём для заполнений, в базовый паттерн не добавляем.", "Substeps — hits faster than sixteenths (rolls). On step 16 try hitting the hat or snare twice within one step: first by ear, then with note repeat. This is a fill technique; we don't add it to the base pattern."), "CLOSED_HAT", [15, 16]),
            voice(L("Бас", "Bass"), L("Саб-бас под бочку", "Sub bass under the kick"), "BASS", [1, 7, 12], L("Саб-бас повторяет ритм бочки, но реже.", "The sub bass repeats the kick's rhythm, but less often."), L("Бас на шаги 1, 7, 12 (низкая нота, например F1).", "Bass on steps 1, 7, 12 (a low note, for example F1).")),
            voice(L("Вокальные нарезки", "Vocal chops"), L("Вокальные нарезки", "Vocal chops"), "VOCAL", [4, 10], L("Короткие вокальные нарезки отвечают ритму.", "Short vocal chops answer the rhythm."), L("Вокальный чоп на 4 и 10.", "A vocal chop on 4 and 10.")),
            pattern(L("Вариация паттерна", "Pattern variation"), "Pattern B", "B", L("Сделай вариацию: создай паттерн B, скопируй A и измени бочку.", "Make a variation: create pattern B, copy A and change the kick."), [1, 4, 7, 10, 12, 16], "KICK"),
            pattern(L("Филл", "Fill"), L("Филл перед сменой", "A fill before the change"), "C", L("Паттерн C — филл на один такт: плотные бочки справа, снейры подряд, хэты на каждом шаге.", "Pattern C — a one-bar fill: dense kicks on the right, snares in a row, hats on every step."), [1, 4, 7, 10, 12, 14, 15, 16], "KICK"),
            pattern(L("Брейк", "Break"), L("Брейк: убрать барабаны", "Break: drop the drums"), "D", L("Паттерн D — брейк: убери барабаны, оставь бас и вокал. Контраст делает возвращение бита сильнее.", "Pattern D — the break: remove the drums, keep the bass and vocal. The contrast makes the return of the beat stronger."), [4, 10], "VOCAL"),
            arrangement(L("A, A, B, B, C (филл), D (брейк), A, B, C", "A, A, B, B, C (fill), D (break), A, B, C")),
            info(L("Эффекты", "Effects"), L("Эффекты и переходы", "Effects and transitions"), L("Пэды 13–16 — эффекты, филл, текстура и ресэмпл. Запиши один эффект-переход в конец филла. ", "Pads 13–16 are effects, fill, texture and resample. Record one effect transition at the end of the fill. ") + FX_NOTE),
            final(L("Играй цепочку A → B → C → D → A. Это твой первый законченный footwork-трек: сохрани проект и запиши его.", "Play the chain A → B → C → D → A. This is your first finished footwork track: save the project and record it.")),
        ],
    )

    # ------------------------------------------------------------------------------------------ jungle
    JUNGLE = dict(
        id="jungle", title="Jungle / Drum & Bass", bpm=170, short=L("Рваный брейк на 170 BPM, тяжёлый саб", "A broken break at 170 BPM, heavy sub"),
        summary=L("Нарезанный брейкбит на высоком темпе, призрачные снейры и длинный саб-бас.", "A chopped breakbeat at a high tempo, ghost snares and a long sub bass."),
        patterns=[
            dict(name="A", label="MAIN", steps={"KICK": [1, 4, 11], "SNARE": [5, 8, 10, 13, 16], "CLOSED_HAT": [1, 3, 5, 7, 9, 11, 13, 15], "OPEN_HAT": [15], "BASS": [1, 11]}),
            dict(name="B", label="VARIATION", steps={"KICK": [1, 4, 7, 11], "SNARE": [5, 8, 10, 13, 16], "CLOSED_HAT": [1, 3, 5, 7, 9, 11, 13, 15], "OPEN_HAT": [15], "BASS": [1, 11]}),
            dict(name="C", label="FILL", steps={"KICK": [1, 4, 11], "SNARE": [5, 8, 10, 13, 14, 15, 16], "CLOSED_HAT": list(range(1, 17)), "BASS": [1, 11]}),
            dict(name="D", label="BREAK", steps={"BASS": [1, 11], "OPEN_HAT": [1]}),
        ],
        lessons=[
            kit_lesson(170, L(" Jungle и drum & bass живут около 160–175 BPM — SP-404MKII спокойно держит такой темп.", " Jungle and drum & bass live at around 160–175 BPM — the SP-404MKII handles that tempo easily.")),
            voice(L("Бочка", "Kick"), L("Бочка не «в четыре»", "A kick that isn't “in four”"), "KICK", [1, 4, 11], L("В джангле бочка редкая и рваная — она оставляет место брейку.", "In jungle the kick is sparse and broken — it leaves room for the break."), L("Бочка на 1, 4 и 11: сильная раз, короткий отклик и сдвинутый удар во второй половине.", "Kick on 1, 4 and 11: a strong one, a short answer and a shifted hit in the second half.")),
            voice(L("Снейр", "Snare"), L("Бэкбит на 5 и 13", "Backbeat on 5 and 13"), "SNARE", [5, 13], L("Снейр — главный якорь: он на 2-й и 4-й доле такта.", "The snare is the main anchor: it sits on beats 2 and 4 of the bar."), L("Снейр на 5 и 13.", "Snare on 5 and 13.")),
            voice(L("Призрачные снейры", "Ghost snares"), L("Тихие снейры между ударами", "Quiet snares between hits"), "SNARE", [5, 8, 10, 13, 16], L("Живость брейку дают тихие «призраки» между основными ударами.", "Quiet “ghosts” between the main hits give the break its life."),
                  L("Добавь тихие снейры на 8, 10 и 16 (громкость пэда пониже) — основные 5 и 13 остаются громкими.", "Add quiet snares on 8, 10 and 16 (pad volume lower) — the main 5 and 13 stay loud.")),
            voice(L("Закрытые хэты", "Closed hats"), L("Восьмые хэты", "Eighth-note hats"), "CLOSED_HAT", [1, 3, 5, 7, 9, 11, 13, 15], L("Хэты задают ровное движение поверх рваной бочки.", "Hats set an even motion over the broken kick."), L("Закрытый хэт через шаг.", "Closed hat on every other step.")),
            voice(L("Открытый хэт", "Open hat"), L("Акцент перед повтором", "An accent before the repeat"), "OPEN_HAT", [15], L("Открытый хэт в конце такта «подбрасывает» ритм в следующий.", "An open hat at the end of the bar “throws” the rhythm into the next one."), L("Открытый хэт на 15.", "Open hat on 15.")),
            info(L("Нарезка брейка", "Chopping the break"), L("Нарезаем барабанный луп", "Chop a drum loop"), L("Классический приём жанра: возьми свой барабанный луп (свой или с лицензией), нарежь на удары и разложи по пэдам — бочка, снейр, хэты отдельно. Так ты сам переставляешь удары, как в паттерне выше. В приложении: Стемы → «Выгрузка» → ударные по ударам.", "The genre's classic technique: take your drum loop (your own or licensed), chop it into hits and spread them over the pads — kick, snare and hats separately. That way you rearrange the hits yourself, like in the pattern above. In the app: Stems → “Export” → drums by hits.")),
            voice(L("Саб-бас", "Sub bass"), L("Длинный саб", "A long sub"), "BASS", [1, 11], L("Бас в джангле — длинные чистые ноты ниже бочки.", "Bass in jungle is long, clean notes below the kick."), L("Бас на 1 и 11, ноты длинные (низкая A или F).", "Bass on 1 and 11, long notes (a low A or F).")),
            pattern(L("Вариация", "Variation"), "Pattern B", "B", L("Сделай вариацию: добавь бочку на 7 — брейк «перекувыркнётся».", "Make a variation: add a kick on 7 — the break “tumbles over”."), [1, 4, 7, 11], "KICK"),
            pattern(L("Филл", "Fill"), L("Снейровый ролл", "Snare roll"), "C", L("Паттерн C — снейры подряд на 13–16 и хэты на каждом шаге ведут к смене.", "Pattern C — snares in a row on 13–16 and hats on every step lead into the change."), [13, 14, 15, 16], "SNARE"),
            pattern(L("Брейк", "Break"), L("Оставляем саб", "Keep the sub"), "D", L("Паттерн D — барабаны уходят, остаётся саб. Возвращение брейка будет мощным.", "Pattern D — the drums leave, only the sub remains. The return of the break will be powerful."), [1, 11], "BASS"),
            arrangement(L("A, A, B, A, C (филл), D (брейк), A, B", "A, A, B, A, C (fill), D (break), A, B")),
            final(L("Играй A → B → C → D → A. Добавь семпл-атмосферу или вокал на пэды 9–12 — и первый джангл-трек готов.", "Play A → B → C → D → A. Add a sample atmosphere or vocal on pads 9–12 — and your first jungle track is done.")),
        ],
    )

    # ------------------------------------------------------------------------------------------ breakbeat
    BREAKBEAT = dict(
        id="breakbeat", title="Breakbeat / Big Beat", bpm=130, short=L("Сэмплированный брейк с драйвом", "A sampled break with drive"),
        summary=L("Брейкбит средних темпов: тяжёлая бочка, бэкбит снейра, призрачные удары и рифф.", "A mid-tempo breakbeat: heavy kick, backbeat snare, ghost hits and a riff."),
        patterns=[
            dict(name="A", label="MAIN", steps={"KICK": [1, 3, 11], "SNARE": [5, 8, 13, 16], "CLOSED_HAT": [1, 3, 5, 7, 9, 11, 13, 15], "OPEN_HAT": [16], "BASS": [1, 3, 11], "CHOP": [9]}),
            dict(name="B", label="VARIATION", steps={"KICK": [1, 3, 7, 11], "SNARE": [5, 8, 13, 16], "CLOSED_HAT": [1, 3, 5, 7, 9, 11, 13, 15], "OPEN_HAT": [16], "BASS": [1, 3, 11], "CHOP": [9]}),
            dict(name="C", label="FILL", steps={"KICK": [1, 3, 11], "SNARE": [5, 8, 13, 14, 15, 16], "CLOSED_HAT": list(range(1, 17)), "BASS": [1, 3, 11]}),
            dict(name="D", label="BREAK", steps={"CHOP": [1, 9], "BASS": [1]}),
        ],
        lessons=[
            kit_lesson(130, L(" Breakbeat обычно держится в районе 120–140 BPM.", " Breakbeat usually sits around 120–140 BPM.")),
            voice(L("Бочка", "Kick"), L("Тяжёлая бочка", "Heavy kick"), "KICK", [1, 3, 11], L("Бочка в брейкбите «подталкивает» вперёд: сильная на 1, быстрая на 3 и сдвинутая на 11.", "The kick in breakbeat “pushes” forward: strong on 1, quick on 3 and shifted on 11."), L("Бочка на 1, 3 и 11.", "Kick on 1, 3 and 11.")),
            voice(L("Снейр", "Snare"), L("Бэкбит", "Backbeat"), "SNARE", [5, 13], L("Снейр на 2 и 4 долях — привычный бэкбит.", "Snare on beats 2 and 4 — the familiar backbeat."), L("Снейр на 5 и 13.", "Snare on 5 and 13.")),
            voice(L("Призрачные удары", "Ghost hits"), L("Живой брейк", "A live-feel break"), "SNARE", [5, 8, 13, 16], L("Тихие снейры на 8 и 16 дают ощущение живого барабанщика.", "Quiet snares on 8 and 16 give the feel of a live drummer."), L("Добавь тихие снейры на 8 и 16 (тише основных).", "Add quiet snares on 8 and 16 (quieter than the main ones).")),
            voice(L("Закрытые хэты", "Closed hats"), L("Восьмые", "Eighths"), "CLOSED_HAT", [1, 3, 5, 7, 9, 11, 13, 15], L("Хэты ведут ровное движение.", "Hats carry an even motion."), L("Закрытый хэт через шаг.", "Closed hat on every other step.")),
            voice(L("Открытый хэт", "Open hat"), L("Подхват", "Pickup"), "OPEN_HAT", [16], L("Открытый хэт перед новым тактом — «вдох» перед повтором.", "An open hat before the new bar — a “breath” before the repeat."), L("Открытый хэт на 16.", "Open hat on 16.")),
            info(L("Грув и свинг", "Groove and swing"), L("Чуть «плывущие» шестнадцатые", "Slightly “floating” sixteenths"), L("Брейк звучит живее, если сдвигать каждый второй шаг чуть позже сетки (свинг) и менять громкость хэтов. Попробуй пару шагов на пэдах чуть тише — ровно-механический ритм сразу оживает.", "A break sounds livelier if you push every second step a little behind the grid (swing) and vary the hat volume. Try playing a couple of steps a bit quieter on the pads — a flat, mechanical rhythm comes alive at once.")),
            voice(L("Басовый рифф", "Bass riff"), L("Рифф под бочку", "A riff under the kick"), "BASS", [1, 3, 11], L("Рифф повторяет ритм бочки, но на нотах.", "The riff repeats the kick's rhythm, but on notes."), L("Бас на 1, 3 и 11 (короткие ноты).", "Bass on 1, 3 and 11 (short notes).")),
            voice(L("Семпл-хук", "Sample hook"), L("Один «крючок» на пэде", "One “hook” on a pad"), "CHOP", [9], L("Фраза из пластинки или синта на одном пэде — «подпись» трека.", "A phrase from a record or synth on one pad — the track's “signature”."), L("Хук на пэд 9, шаг 9.", "Hook on pad 9, step 9.")),
            pattern(L("Вариация", "Variation"), "Pattern B", "B", L("Добавь бочку на 7 — ритм «подпрыгнет».", "Add a kick on 7 — the rhythm will “bounce”."), [1, 3, 7, 11], "KICK"),
            pattern(L("Филл", "Fill"), L("Ролл снейра", "Snare roll"), "C", L("Паттерн C — снейры на 13–16 и хэты на каждом шаге.", "Pattern C — snares on 13–16 and hats on every step."), [13, 14, 15, 16], "SNARE"),
            pattern(L("Брейк", "Break"), L("Только хук и бас", "Only hook and bass"), "D", L("Паттерн D — убери барабаны, оставь хук и бас.", "Pattern D — remove the drums, keep the hook and bass."), [1, 9], "CHOP"),
            arrangement(L("A, A, B, A, C (филл), D (брейк), A, B", "A, A, B, A, C (fill), D (break), A, B")),
            final(),
        ],
    )

    # ------------------------------------------------------------------------------------------ house
    HOUSE = dict(
        id="house", title="House", bpm=124, short=L("Четыре в пол и офф-бит хэт", "Four on the floor and an off-beat hat"),
        summary=L("Классический хаус: бочка в четыре, клэп на 2 и 4, открытый хэт между бочками, офф-бит бас и аккорды.", "Classic house: four-on-the-floor kick, claps on 2 and 4, an open hat between the kicks, an off-beat bass and chords."),
        patterns=[
            dict(name="A", label="MAIN", steps={"KICK": [1, 5, 9, 13], "CLAP": [5, 13], "CLOSED_HAT": [2, 4, 6, 8, 10, 12, 14, 16], "OPEN_HAT": [3, 7, 11, 15],
                 "PERCUSSION": [8, 16], "BASS": [3, 7, 11, 15], "CHOP": [4, 10, 12]}),
            dict(name="B", label="VARIATION", steps={"KICK": [1, 5, 9, 13], "CLAP": [5, 13, 16], "CLOSED_HAT": [2, 4, 6, 8, 10, 12, 14, 16], "OPEN_HAT": [3, 7, 11, 15],
                 "PERCUSSION": [4, 8, 12, 16], "BASS": [3, 7, 11, 15], "CHOP": [4, 10, 12], "VOCAL": [13]}),
            dict(name="C", label="BUILD", steps={"KICK": [1, 5, 9, 13], "CLAP": [5, 9, 11, 13, 14, 15, 16], "CLOSED_HAT": list(range(1, 17)), "BASS": [3, 7, 11, 15]}),
            dict(name="D", label="BREAK", steps={"CHOP": [4, 10, 12], "VOCAL": [13], "PERCUSSION": [8, 16]}),
        ],
        lessons=[
            kit_lesson(124, L(" House — около 120–128 BPM.", " House — around 120–128 BPM.")),
            voice(L("Бочка", "Kick"), L("Четыре в пол", "Four on the floor"), "KICK", [1, 5, 9, 13], L("Основа хауса — ровная бочка на каждую долю.", "The foundation of house — an even kick on every beat."), L("Бочка на 1, 5, 9 и 13.", "Kick on 1, 5, 9 and 13.")),
            voice(L("Клэп", "Clap"), L("Клэп на 2 и 4", "Clap on 2 and 4"), "CLAP", [5, 13], L("Клэп подчёркивает вторую и четвёртую доли.", "The clap stresses the second and fourth beats."), L("Клэп на 5 и 13.", "Clap on 5 and 13.")),
            voice(L("Открытый хэт", "Open hat"), L("Офф-бит между бочками", "Off-beat between the kicks"), "OPEN_HAT", [3, 7, 11, 15], L("Открытый хэт на «и» между бочками — фирменное «ц-ц» хауса.", "An open hat on the “and” between the kicks — house's signature “ts-ts”."), L("Открытый хэт на 3, 7, 11 и 15.", "Open hat on 3, 7, 11 and 15.")),
            voice(L("Закрытые хэты", "Closed hats"), L("Шестнадцатые для движения", "Sixteenths for motion"), "CLOSED_HAT", [2, 4, 6, 8, 10, 12, 14, 16], L("Тихие закрытые хэты на чётных шагах добавляют бег.", "Quiet closed hats on even steps add run."), L("Закрытый хэт на 2, 4, … 16 (тише открытого).", "Closed hat on 2, 4, … 16 (quieter than the open one).")),
            voice(L("Перкуссия", "Percussion"), L("Шейкер / конга", "Shaker / conga"), "PERCUSSION", [8, 16], L("Небольшая перкуссия добавляет «воздух».", "A little percussion adds “air”."), L("Перкуссия на 8 и 16.", "Percussion on 8 and 16.")),
            voice(L("Бас", "Bass"), L("Офф-бит бас", "Off-beat bass"), "BASS", [3, 7, 11, 15], L("Бас играет между бочками, чтобы они не мешали друг другу.", "The bass plays between the kicks so they don't get in each other's way."), L("Бас на 3, 7, 11 и 15.", "Bass on 3, 7, 11 and 15.")),
            voice(L("Аккорды", "Chords"), L("Стабы на пэде", "Stabs on a pad"), "CHOP", [4, 10, 12], L("Короткие аккордовые «стабы» (свои или с лицензией) на одном пэде.", "Short chord “stabs” (your own or licensed) on one pad."), L("Аккорд на пэд 9, шаги 4, 10 и 12.", "Chord on pad 9, steps 4, 10 and 12.")),
            voice(L("Вокальный чоп", "Vocal chop"), L("Вокальная фраза", "A vocal phrase"), "VOCAL", [13], L("Одна вокальная нарезка в конце такта цепляет слух.", "One vocal chop at the end of the bar catches the ear."), L("Вокал на 13 — в B-паттерне.", "Vocal on 13 — in the B pattern.")),
            pattern(L("Вариация", "Variation"), "Pattern B", "B", L("Паттерн B: клэп на 16 и перкуссия плотнее, добавлен вокал.", "Pattern B: a clap on 16 and denser percussion, a vocal added."), [16, 13], "CLAP"),
            pattern(L("Нарастание", "Build-up"), L("Билд перед дропом", "A build before the drop"), "C", L("Паттерн C — клэпы учащаются к концу, хэты на каждый шаг: напряжение перед дропом.", "Pattern C — claps get more frequent towards the end, hats on every step: tension before the drop."), [9, 11, 13, 14, 15, 16], "CLAP"),
            pattern(L("Брейк", "Break"), L("Без бочки", "Without the kick"), "D", L("Паттерн D — убери бочку и бас: остаются аккорды и вокал. Возвращение бочки — главный момент.", "Pattern D — remove the kick and bass: chords and vocal remain. The kick's return is the main moment."), [4, 10, 12], "CHOP"),
            arrangement(L("A, A, B, A, C (билд), D (брейк), A, B", "A, A, B, A, C (build), D (break), A, B")),
            final(L("Играй A → B → C → D → A. Хаус держится на повторении: меняй по одному элементу за раз.", "Play A → B → C → D → A. House lives on repetition: change one element at a time.")),
        ],
    )

    # ------------------------------------------------------------------------------------------ hip-hop
    HIPHOP = dict(
        id="hiphop", title="Hip-Hop / Boom Bap", bpm=90, short=L("Бочка + снейр на 2 и 4, сэмпл-луп", "Kick + snare on 2 and 4, a sample loop"),
        summary=L("Классический бум-бэп: ленивая бочка, чёткий снейр на 2 и 4, восьмые хэты и нарезанный сэмпл.", "Classic boom-bap: a lazy kick, a crisp snare on 2 and 4, eighth-note hats and a chopped sample."),
        patterns=[
            dict(name="A", label="MAIN", steps={"KICK": [1, 7, 11], "SNARE": [5, 13], "CLOSED_HAT": [1, 3, 5, 7, 9, 11, 13, 15], "BASS": [1, 7, 11], "CHOP": [1, 9]}),
            dict(name="B", label="VARIATION", steps={"KICK": [1, 7, 11, 16], "SNARE": [5, 13], "CLOSED_HAT": [1, 3, 5, 7, 9, 11, 13, 15], "OPEN_HAT": [16], "BASS": [1, 7, 11], "CHOP": [1, 9]}),
            dict(name="C", label="FILL", steps={"KICK": [1, 7, 11], "SNARE": [5, 13, 15, 16], "CLOSED_HAT": [1, 3, 5, 7, 9, 11, 13, 15], "BASS": [1, 7, 11], "CHOP": [1, 9]}),
            dict(name="D", label="BREAK", steps={"CHOP": [1, 9], "BASS": [1]}),
        ],
        lessons=[
            kit_lesson(90, L(" Бум-бэп — около 85–95 BPM.", " Boom-bap — around 85–95 BPM.")),
            voice(L("Бочка", "Kick"), L("Ленивая бочка", "A lazy kick"), "KICK", [1, 7, 11], L("Бочка бьёт на 1, затем «после» второй доли и перед четвёртой — это даёт качающийся грув.", "The kick hits on 1, then “after” the second beat and before the fourth — it gives a swaying groove."), L("Бочка на 1, 7 и 11.", "Kick on 1, 7 and 11.")),
            voice(L("Снейр", "Snare"), L("Снейр на 2 и 4", "Snare on 2 and 4"), "SNARE", [5, 13], L("Снейр — сердце бум-бэпа: громкий и сухой.", "The snare is the heart of boom-bap: loud and dry."), L("Снейр на 5 и 13.", "Snare on 5 and 13.")),
            voice(L("Хэты", "Hats"), L("Восьмые хэты", "Eighth-note hats"), "CLOSED_HAT", [1, 3, 5, 7, 9, 11, 13, 15], L("Ровные восьмые — фон, на который садится грув.", "Even eighths — the background the groove sits on."), L("Закрытый хэт через шаг.", "Closed hat on every other step.")),
            info(L("Свинг и «живость»", "Swing and “liveliness”"), L("Почему бит качает", "Why the beat swings"), L("Бит звучит живее, если сдвигать каждый второй шаг чуть позже сетки (свинг) и играть хэты разной громкостью. На SP-404MKII пробуй сдвиг шагов или запись пэдами вручную — не бойся неровностей.", "A beat sounds livelier if you push every second step a little behind the grid (swing) and play the hats at different volumes. On the SP-404MKII try shifting steps or recording the pads by hand — don't be afraid of unevenness.")),
            voice(L("Бас", "Bass"), L("Бас за бочкой", "Bass behind the kick"), "BASS", [1, 7, 11], L("Бас повторяет бочку — вместе они звучат как один инструмент.", "The bass repeats the kick — together they sound like one instrument."), L("Бас на 1, 7 и 11 (круглый, не слишком длинный).", "Bass on 1, 7 and 11 (round, not too long).")),
            voice(L("Сэмпл-луп", "Sample loop"), L("Нарезка пластинки", "Chopping a record"), "CHOP", [1, 9], L("Сэмпл (свой или с лицензией) режется на куски: начало фразы и её продолжение.", "A sample (your own or licensed) is cut into pieces: the start of a phrase and its continuation."), L("Куски сэмпла на пэд 9, шаги 1 и 9.", "Sample pieces on pad 9, steps 1 and 9.")),
            pattern(L("Вариация", "Variation"), "Pattern B", "B", L("Паттерн B: бочка на 16 и открытый хэт — «подталкивают» в следующий такт.", "Pattern B: a kick on 16 and an open hat — they “push” into the next bar."), [16], "KICK"),
            pattern(L("Филл", "Fill"), L("Снейры в конец", "Snares at the end"), "C", L("Паттерн C — два снейра на 15–16 как «вопросительный» хвост.", "Pattern C — two snares on 15–16 as a “questioning” tail."), [15, 16], "SNARE"),
            pattern(L("Брейк", "Break"), L("Только сэмпл и бас", "Only sample and bass"), "D", L("Паттерн D — убери барабаны на такт: слышен чистый сэмпл.", "Pattern D — drop the drums for a bar: the clean sample is heard."), [1, 9], "CHOP"),
            arrangement(L("A, A, B, A, C (филл), D (брейк), A, B", "A, A, B, A, C (fill), D (break), A, B")),
            final(L("Играй A → B → C → D → A, поверх можно читать или записать вокал. Первый бум-бэп бит готов.", "Play A → B → C → D → A; you can rap or record a vocal on top. Your first boom-bap beat is done.")),
        ],
    )

    # ------------------------------------------------------------------------------------------ techno
    TECHNO = dict(
        id="techno", title="Techno", bpm=132, short=L("Гипнотичная бочка и офф-бит хэт", "A hypnotic kick and an off-beat hat"),
        summary=L("Техно: непрерывная бочка, офф-бит хэты, редкий клэп, «рамбл»-бас и эволюция фильтром.", "Techno: a nonstop kick, off-beat hats, a rare clap, a “rumble” bass and filter evolution."),
        patterns=[
            dict(name="A", label="MAIN", steps={"KICK": [1, 5, 9, 13], "CLAP": [13], "CLOSED_HAT": [3, 7, 11, 15], "OPEN_HAT": [4, 12], "PERCUSSION": [8, 16], "BASS": [2, 6, 10, 14], "CHOP": [4, 10]}),
            dict(name="B", label="VARIATION", steps={"KICK": [1, 5, 9, 13], "CLAP": [5, 13], "CLOSED_HAT": [3, 7, 11, 15], "OPEN_HAT": [4, 12], "PERCUSSION": [4, 8, 12, 16], "BASS": [2, 6, 10, 14], "CHOP": [4, 10]}),
            dict(name="C", label="BUILD", steps={"KICK": [1, 5, 9, 13], "CLAP": [9, 11, 13, 14, 15, 16], "CLOSED_HAT": list(range(1, 17)), "BASS": [2, 6, 10, 14]}),
            dict(name="D", label="BREAK", steps={"CHOP": [4, 10], "PERCUSSION": [8, 16], "BASS": [2]}),
        ],
        lessons=[
            kit_lesson(132, L(" Техно — около 125–140 BPM.", " Techno — around 125–140 BPM.")),
            voice(L("Бочка", "Kick"), L("Непрерывный пульс", "A nonstop pulse"), "KICK", [1, 5, 9, 13], L("Бочка — это пульс: её звук (длина, низ, щелчок) важнее нот.", "The kick is the pulse: its sound (length, low end, click) matters more than the notes."), L("Бочка на 1, 5, 9 и 13.", "Kick on 1, 5, 9 and 13.")),
            voice(L("Офф-бит хэт", "Off-beat hat"), L("Хэт между бочками", "A hat between the kicks"), "CLOSED_HAT", [3, 7, 11, 15], L("Хэт на «и» создаёт гипнотическое «тц-тц».", "A hat on the “and” creates a hypnotic “tss-tss”."), L("Закрытый хэт на 3, 7, 11 и 15.", "Closed hat on 3, 7, 11 and 15.")),
            voice(L("Открытый хэт", "Open hat"), L("Редкий акцент", "A rare accent"), "OPEN_HAT", [4, 12], L("Открытый хэт один-два раза за такт добавляет воздух.", "An open hat once or twice a bar adds air."), L("Открытый хэт на 4 и 12.", "Open hat on 4 and 12.")),
            voice(L("Клэп", "Clap"), L("Редкий клэп", "A rare clap"), "CLAP", [13], L("В техно клэп часто один раз за такт или вообще не звучит на каждой доле.", "In techno the clap often hits once a bar, or doesn't sound on every beat at all."), L("Клэп на 13 (можно добавить 5 позже).", "Clap on 13 (you can add 5 later).")),
            voice(L("Перкуссия", "Percussion"), L("Рим / перк", "Rim / perc"), "PERCUSSION", [8, 16], L("Короткая перкуссия двигает ритм вперёд.", "Short percussion drives the rhythm forward."), L("Перкуссия на 8 и 16.", "Percussion on 8 and 16.")),
            voice(L("Рамбл-бас", "Rumble bass"), L("Бас между бочками", "Bass between the kicks"), "BASS", [2, 6, 10, 14], L("«Рамбл» — низкий гул сразу после бочки.", "The “rumble” is a low hum right after the kick."), L("Бас на 2, 6, 10 и 14 (низкий и приглушённый).", "Bass on 2, 6, 10 and 14 (low and muted).")),
            voice(L("Стабы", "Stabs"), L("Короткие аккорды / синт", "Short chords / synth"), "CHOP", [4, 10], L("Короткий синт-стаб на одном пэде добавляет «мелодию».", "A short synth stab on one pad adds a “melody”."), L("Стаб на пэд 9, шаги 4 и 10.", "Stab on pad 9, steps 4 and 10.")),
            info(L("Эволюция", "Evolution"), L("Фильтр и громкость", "Filter and volume"), L("Техно развивается медленно: плавно открывай фильтр, добавляй и убирай по одному элементу раз в 8 тактов. ", "Techno develops slowly: open the filter smoothly, add and remove one element every 8 bars. ") + FX_NOTE),
            pattern(L("Вариация", "Variation"), "Pattern B", "B", L("Паттерн B: клэп на 5 и 13, перкуссия плотнее.", "Pattern B: a clap on 5 and 13, denser percussion."), [5, 13], "CLAP"),
            pattern(L("Нарастание", "Build-up"), L("Билд", "Build"), "C", L("Паттерн C — клэпы учащаются, хэты на каждом шаге: напряжение перед сменой.", "Pattern C — claps get more frequent, hats on every step: tension before the change."), [13, 14, 15, 16], "CLAP"),
            pattern(L("Брейк", "Break"), L("Без бочки", "Without the kick"), "D", L("Паттерн D — бочка уходит, остаётся стаб и перкуссия.", "Pattern D — the kick leaves, the stab and percussion remain."), [4, 10], "CHOP"),
            arrangement(L("A (8 тактов), B (8), C (билд), D (брейк), A, B", "A (8 bars), B (8), C (build), D (break), A, B")),
            final(L("Играй A → B → C → D → A, меняя фильтр. В техно главное — выдержка.", "Play A → B → C → D → A, moving the filter. In techno, patience is everything.")),
        ],
    )

    # ------------------------------------------------------------------------------------------ trip-hop
    TRIPHOP = dict(
        id="triphop", title="Trip-Hop", bpm=84, short=L("Медленный, тёмный, с пластиночным шумом", "Slow, dark, with record noise"),
        summary=L("Трип-хоп: тяжёлая медленная бочка, пыльный снейр, длинный бас, сэмпл-атмосфера и винил.", "Trip-hop: a heavy slow kick, a dusty snare, a long bass, a sample atmosphere and vinyl."),
        patterns=[
            dict(name="A", label="MAIN", steps={"KICK": [1, 11], "SNARE": [5, 13], "CLOSED_HAT": [3, 7, 11, 15], "BASS": [1, 11], "CHOP": [1], "TEXTURE": [1]}),
            dict(name="B", label="VARIATION", steps={"KICK": [1, 8, 11], "SNARE": [5, 13], "CLOSED_HAT": [3, 7, 11, 15], "OPEN_HAT": [16], "BASS": [1, 11], "CHOP": [1], "TEXTURE": [1]}),
            dict(name="C", label="FILL", steps={"KICK": [1, 11], "SNARE": [5, 13, 15], "CLOSED_HAT": [3, 7, 11, 15], "BASS": [1, 11], "CHOP": [1], "TEXTURE": [1]}),
            dict(name="D", label="BREAK", steps={"CHOP": [1], "TEXTURE": [1], "BASS": [1]}),
        ],
        lessons=[
            kit_lesson(84, L(" Трип-хоп — около 70–95 BPM: медленно и тяжело. Пэды 15–16 пригодятся под текстуру.", " Trip-hop — around 70–95 BPM: slow and heavy. Pads 15–16 will come in handy for texture.")),
            info(L("Настроение", "Mood"), L("Медленно и плотно", "Slow and dense"), L("Трип-хоп строится на пространстве: меньше нот, больше тишины, тёмный тембр. Не заполняй каждый шаг — пустота здесь инструмент.", "Trip-hop is built on space: fewer notes, more silence, a dark tone. Don't fill every step — emptiness is an instrument here.")),
            voice(L("Бочка", "Kick"), L("Тяжёлая редкая бочка", "A heavy, sparse kick"), "KICK", [1, 11], L("Бочка бьёт редко и глубоко.", "The kick hits rarely and deep."), L("Бочка на 1 и 11.", "Kick on 1 and 11.")),
            voice(L("Снейр", "Snare"), L("Пыльный снейр", "A dusty snare"), "SNARE", [5, 13], L("Снейр сухой, с небольшим «шорохом».", "The snare is dry, with a slight “rustle”."), L("Снейр на 5 и 13.", "Snare on 5 and 13.")),
            voice(L("Хэт", "Hat"), L("Лёгкий офф-бит", "A light off-beat"), "CLOSED_HAT", [3, 7, 11, 15], L("Хэт тише и реже, чтобы не мешать атмосфере.", "The hat is quieter and sparser so it doesn't get in the way of the atmosphere."), L("Закрытый хэт на 3, 7, 11 и 15.", "Closed hat on 3, 7, 11 and 15.")),
            voice(L("Бас", "Bass"), L("Длинный бас", "A long bass"), "BASS", [1, 11], L("Бас — длинные тёмные ноты вместе с бочкой.", "The bass is long dark notes together with the kick."), L("Бас на 1 и 11, ноты тянутся.", "Bass on 1 and 11, notes sustained.")),
            voice(L("Сэмпл-атмосфера", "Sample atmosphere"), L("Пластиночный луп", "A record loop"), "CHOP", [1], L("Струнный, джазовый или вокальный сэмпл задаёт характер трека.", "A string, jazz or vocal sample sets the character of the track."), L("Сэмпл на пэд 9, шаг 1 (запусти на весь такт).", "Sample on pad 9, step 1 (let it run for the whole bar).")),
            voice(L("Винил-текстура", "Vinyl texture"), L("Шум пластинки", "Record noise"), "TEXTURE", [1], L("Тихий шум винила склеивает слои.", "Quiet vinyl noise glues the layers together."), L("Текстуру на пэд 15, шаг 1 — зацикленный шум, очень тихо.", "Texture on pad 15, step 1 — looped noise, very quiet.")),
            info(L("Эффекты", "Effects"), L("Пространство", "Space"), L("Реверб и ленточное эхо на снейре и сэмпле делают «глубину». ", "Reverb and tape echo on the snare and sample create “depth”. ") + FX_NOTE),
            pattern(L("Вариация", "Variation"), "Pattern B", "B", L("Паттерн B: бочка на 8 и открытый хэт на 16 — лёгкое покачивание.", "Pattern B: a kick on 8 and an open hat on 16 — a light sway."), [8, 16], "KICK"),
            pattern(L("Филл", "Fill"), L("Снейр-хвост", "Snare tail"), "C", L("Паттерн C — один дополнительный снейр на 15.", "Pattern C — one extra snare on 15."), [15], "SNARE"),
            pattern(L("Брейк", "Break"), L("Только атмосфера", "Only atmosphere"), "D", L("Паттерн D — оставь сэмпл, винил и бас.", "Pattern D — keep the sample, vinyl and bass."), [1], "CHOP"),
            arrangement(L("A, A, B, A, C, D (брейк), A, B", "A, A, B, A, C, D (break), A, B")),
            final(L("Играй A → B → C → D → A. Добавь эффекты на сэмпл — и настроение готово.", "Play A → B → C → D → A. Add effects to the sample — and the mood is done.")),
        ],
    )

    # ------------------------------------------------------------------------------------------ lo-fi house
    LOFIHOUSE = dict(
        id="lofihouse", title="Lo-Fi House", bpm=118, short=L("Тёплый хаус с шумом и «плывущим» грувом", "Warm house with noise and a “floating” groove"),
        summary=L("Лоу-фай хаус: мягкая бочка в четыре, лёгкий клэп, шейкер, тёплый аккордовый луп и кассетный шум.", "Lo-fi house: a soft four-on-the-floor kick, a light clap, a shaker, a warm chord loop and tape noise."),
        patterns=[
            dict(name="A", label="MAIN", steps={"KICK": [1, 5, 9, 13], "CLAP": [5, 13], "CLOSED_HAT": [3, 7, 11, 15], "PERCUSSION": [2, 4, 6, 8, 10, 12, 14, 16], "BASS": [1, 4, 9, 12], "CHOP": [1, 9], "TEXTURE": [1]}),
            dict(name="B", label="VARIATION", steps={"KICK": [1, 5, 9, 13], "CLAP": [5, 13, 16], "CLOSED_HAT": [3, 7, 11, 15], "OPEN_HAT": [8], "PERCUSSION": [2, 4, 6, 8, 10, 12, 14, 16], "BASS": [1, 4, 9, 12], "CHOP": [1, 9], "TEXTURE": [1]}),
            dict(name="C", label="FILL", steps={"KICK": [1, 5, 9, 13], "CLAP": [5, 13, 15, 16], "CLOSED_HAT": [3, 7, 11, 15], "PERCUSSION": list(range(1, 17)), "BASS": [1, 4, 9, 12], "CHOP": [1, 9], "TEXTURE": [1]}),
            dict(name="D", label="BREAK", steps={"CHOP": [1, 9], "TEXTURE": [1], "PERCUSSION": [2, 6, 10, 14]}),
        ],
        lessons=[
            kit_lesson(118, L(" Лоу-фай хаус — около 110–122 BPM.", " Lo-fi house — around 110–122 BPM.")),
            info(L("Идея жанра", "The genre's idea"), L("Хаус, но «с пыльцой»", "House, but “dusty”"), L("Это обычный хаус-грув, но звучит как с кассеты: приглушённые верха, лёгкий шум и чуть неровный тайминг. Не доводи всё до идеала — несовершенство и есть стиль.", "It's an ordinary house groove, but it sounds like it came off a cassette: muffled highs, light noise and slightly uneven timing. Don't push everything to perfection — imperfection is the style.")),
            voice(L("Бочка", "Kick"), L("Мягкая бочка в четыре", "A soft kick in four"), "KICK", [1, 5, 9, 13], L("Бочка круглая и тёплая, без жёсткого щелчка.", "The kick is round and warm, without a hard click."), L("Бочка на 1, 5, 9 и 13 (притуши верха фильтром).", "Kick on 1, 5, 9 and 13 (tame the highs with a filter).")),
            voice(L("Клэп", "Clap"), L("Тихий клэп / рим", "A quiet clap / rim"), "CLAP", [5, 13], L("Клэп мягкий — часто это рим или щелчок.", "The clap is soft — often a rim or a click."), L("Клэп на 5 и 13.", "Clap on 5 and 13.")),
            voice(L("Хэт", "Hat"), L("Офф-бит хэт", "Off-beat hat"), "CLOSED_HAT", [3, 7, 11, 15], L("Хэт приглушённый, «в рот».", "The hat is muffled, “in the mouth”."), L("Закрытый хэт на 3, 7, 11 и 15.", "Closed hat on 3, 7, 11 and 15.")),
            voice(L("Шейкер", "Shaker"), L("Шейкер на шестнадцатых", "A shaker on sixteenths"), "PERCUSSION", [2, 4, 6, 8, 10, 12, 14, 16], L("Шейкер добавляет «движение» и тёплую текстуру.", "The shaker adds “motion” and a warm texture."), L("Перкуссия на чётных шагах, очень тихо.", "Percussion on even steps, very quiet.")),
            voice(L("Бас", "Bass"), L("Плавающий бас", "A floating bass"), "BASS", [1, 4, 9, 12], L("Бас мягкий, чуть асинхронный с бочкой.", "The bass is soft, slightly out of sync with the kick."), L("Бас на 1, 4, 9 и 12.", "Bass on 1, 4, 9 and 12.")),
            voice(L("Аккордовый луп", "A chord loop"), L("Тёплые аккорды", "Warm chords"), "CHOP", [1, 9], L("Аккордовый сэмпл (джаз-рода) — сердце трека.", "A chord sample (jazz-style) is the heart of the track."), L("Аккорд на пэд 9, шаги 1 и 9.", "Chord on pad 9, steps 1 and 9.")),
            voice(L("Кассетный шум", "Tape noise"), L("Текстура", "Texture"), "TEXTURE", [1], L("Шум и потрескивание склеивают звук.", "Noise and crackle glue the sound together."), L("Текстуру на пэд 15, шаг 1, тихо.", "Texture on pad 15, step 1, quiet.")),
            info(L("Эффекты и «лоу-фай»", "Effects and “lo-fi”"), L("Кассета и винил", "Cassette and vinyl"), L("Ресэмпл с эффектами — сильная сторона SP: пропусти луп через эффект «кассеты» или Lo-fi и снова запиши на пэд 16. ", "Resampling with effects is the SP's strength: run the loop through the “cassette” effect or Lo-fi and record it again on pad 16. ") + FX_NOTE),
            pattern(L("Вариация", "Variation"), "Pattern B", "B", L("Паттерн B: клэп на 16 и открытый хэт на 8.", "Pattern B: a clap on 16 and an open hat on 8."), [8, 16], "OPEN_HAT"),
            pattern(L("Филл", "Fill"), L("Перкуссия на каждый шаг", "Percussion on every step"), "C", L("Паттерн C — шейкер на каждый шаг и два клэпа в конце.", "Pattern C — a shaker on every step and two claps at the end."), [15, 16], "CLAP"),
            pattern(L("Брейк", "Break"), L("Только аккорды", "Only chords"), "D", L("Паттерн D — остаются аккорды, шум и шейкер.", "Pattern D — chords, noise and shaker remain."), [1, 9], "CHOP"),
            arrangement(L("A, A, B, A, C (филл), D (брейк), A, B", "A, A, B, A, C (fill), D (break), A, B")),
            final(L("Играй A → B → C → D → A. Запиши результат и пропусти через кассетный эффект ещё раз.", "Play A → B → C → D → A. Record the result and run it through the cassette effect once more.")),
        ],
    )

    # ------------------------------------------------------------------------------------------ lo-fi hip-hop
    LOFIHIPHOP = dict(
        id="lofihiphop", title="Lo-Fi Hip-Hop", bpm=78, short=L("Ленивый бит, джазовые аккорды, винил", "A lazy beat, jazz chords, vinyl"),
        summary=L("Лоу-фай хип-хоп: неспешная бочка, снейр на 2 и 4, «пропущенные» хэты, аккордовый луп и потрескивание.", "Lo-fi hip-hop: an unhurried kick, a snare on 2 and 4, “missing” hats, a chord loop and crackle."),
        patterns=[
            dict(name="A", label="MAIN", steps={"KICK": [1, 8, 11], "SNARE": [5, 13], "CLOSED_HAT": [1, 3, 5, 9, 11, 13], "BASS": [1, 8, 11], "CHOP": [1, 9], "TEXTURE": [1]}),
            dict(name="B", label="VARIATION", steps={"KICK": [1, 8, 11, 16], "SNARE": [5, 13], "CLOSED_HAT": [1, 3, 5, 9, 11, 13, 15], "OPEN_HAT": [16], "BASS": [1, 8, 11], "CHOP": [1, 9], "TEXTURE": [1]}),
            dict(name="C", label="FILL", steps={"KICK": [1, 8, 11], "SNARE": [5, 13, 15], "CLOSED_HAT": [1, 3, 5, 9, 11, 13], "BASS": [1, 8, 11], "CHOP": [1, 9], "TEXTURE": [1]}),
            dict(name="D", label="BREAK", steps={"CHOP": [1, 9], "TEXTURE": [1]}),
        ],
        lessons=[
            kit_lesson(78, L(" Лоу-фай хип-хоп — около 70–90 BPM.", " Lo-fi hip-hop — around 70–90 BPM.")),
            info(L("Идея жанра", "The genre's idea"), L("Уютно и неидеально", "Cosy and imperfect"), L("Тихий бит для фона: мягкие барабаны, тёплые аккорды, потрескивание. Ритм намеренно «ленивый» — ошибки тайминга здесь часть звука.", "A quiet background beat: soft drums, warm chords, crackle. The rhythm is deliberately “lazy” — timing errors are part of the sound here.")),
            voice(L("Бочка", "Kick"), L("Ленивая бочка", "A lazy kick"), "KICK", [1, 8, 11], L("Бочка мягкая, без жёсткости, и бьёт чуть «позади» доли.", "The kick is soft, not harsh, and hits slightly “behind” the beat."), L("Бочка на 1, 8 и 11.", "Kick on 1, 8 and 11.")),
            voice(L("Снейр", "Snare"), L("Мягкий снейр", "A soft snare"), "SNARE", [5, 13], L("Снейр — приглушённый, как с кассеты.", "The snare is muffled, as if from a cassette."), L("Снейр на 5 и 13.", "Snare on 5 and 13.")),
            voice(L("Хэты с пропусками", "Hats with gaps"), L("Живые хэты", "Living hats"), "CLOSED_HAT", [1, 3, 5, 9, 11, 13], L("Хэты нарочно «неполные»: несколько ударов пропущены, и бит дышит.", "The hats are deliberately “incomplete”: a few hits are skipped and the beat breathes."), L("Закрытый хэт на 1, 3, 5, 9, 11 и 13.", "Closed hat on 1, 3, 5, 9, 11 and 13.")),
            info(L("Свинг", "Swing"), L("Качание", "Sway"), L("Сдвинь каждый второй шаг чуть позже сетки и играй хэты разной громкостью — так бит «шатается» приятно, а не ломается.", "Push every second step a little behind the grid and play the hats at different volumes — that way the beat “wobbles” pleasantly instead of breaking.")),
            voice(L("Бас", "Bass"), L("Тёплый бас", "A warm bass"), "BASS", [1, 8, 11], L("Бас круглый и мягкий, под бочку.", "The bass is round and soft, under the kick."), L("Бас на 1, 8 и 11.", "Bass on 1, 8 and 11.")),
            voice(L("Аккорды", "Chords"), L("Джазовые аккорды", "Jazz chords"), "CHOP", [1, 9], L("Аккордовый сэмпл (свой или с лицензией) — это настроение трека.", "A chord sample (your own or licensed) is the mood of the track."), L("Аккорды на пэд 9, шаги 1 и 9.", "Chords on pad 9, steps 1 and 9.")),
            voice(L("Винил", "Vinyl"), L("Потрескивание", "Crackle"), "TEXTURE", [1], L("Шум пластинки объединяет всё в единый звук.", "Record noise unites everything into one sound."), L("Текстуру на пэд 15, шаг 1, очень тихо.", "Texture on pad 15, step 1, very quiet.")),
            info(L("Эффекты", "Effects"), L("Кассета и Lo-fi", "Cassette and Lo-fi"), L("Пропусти аккорды через эффект «кассеты»/Lo-fi и ресэмпли на пэд 16 — получится характерный «пыльный» тембр. ", "Run the chords through the “cassette”/Lo-fi effect and resample to pad 16 — you get the characteristic “dusty” tone. ") + FX_NOTE),
            pattern(L("Вариация", "Variation"), "Pattern B", "B", L("Паттерн B: бочка на 16, хэт на 15 и открытый хэт на 16.", "Pattern B: a kick on 16, a hat on 15 and an open hat on 16."), [16, 15], "OPEN_HAT"),
            pattern(L("Филл", "Fill"), L("Снейр-хвост", "Snare tail"), "C", L("Паттерн C — один снейр на 15 перед повтором.", "Pattern C — one snare on 15 before the repeat."), [15], "SNARE"),
            pattern(L("Брейк", "Break"), L("Только аккорды и шум", "Only chords and noise"), "D", L("Паттерн D — барабаны уходят, остаются аккорды и винил.", "Pattern D — the drums leave, chords and vinyl remain."), [1, 9], "CHOP"),
            arrangement(L("A, A, B, A, C, D (брейк), A, B", "A, A, B, A, C, D (break), A, B"), L(" Лоу-фай треки часто короткие: 1,5–2 минуты.", " Lo-fi tracks are often short: 1.5–2 minutes.")),
            final(L("Играй A → B → C → D → A. Добавь пару нот поверх — и готов бит для учёбы.", "Play A → B → C → D → A. Add a couple of notes on top — and you have a beat to study to.")),
        ],
    )
    return {c["id"]: c for c in (FOOTWORK, JUNGLE, BREAKBEAT, HOUSE, HIPHOP, TECHNO, TRIPHOP, LOFIHOUSE, LOFIHIPHOP)}


class _Courses:
    """Course specs in the current language (built lazily, once per language)."""
    _cache: dict[str, dict[str, dict[str, Any]]] = {}

    def _d(self) -> dict[str, dict[str, Any]]:
        lang = get_lang()
        if lang not in self._cache:
            self._cache[lang] = _build()
        return self._cache[lang]

    def get(self, k, default=None):
        return self._d().get(k, default)

    def __getitem__(self, k):
        return self._d()[k]

    def __iter__(self):
        return iter(self._d())

    def __len__(self):
        return len(self._d())

    def items(self):
        return self._d().items()

    def values(self):
        return self._d().values()

    def keys(self):
        return self._d().keys()


COURSES = _Courses()
