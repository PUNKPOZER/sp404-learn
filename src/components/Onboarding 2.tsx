import { useEffect, useState } from "react";
import { markSeen } from "../lib/tours";
import { t } from "../lib/i18n";
import { GenreArt } from "./GenreArt";
import { Icon } from "./Icon";
import { setState, useStore } from "../state/store";

const KEY = "sp404learn.onboarded";
const done = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return true; } };
const finish = () => { try { localStorage.setItem(KEY, "1"); } catch { /* storage unavailable */ } markSeen("welcome"); setState({ onboarding: false }); };
export const startOnboarding = () => setState({ onboarding: true });
export const shouldOnboard = () => !done();

interface Slide { icon: "learn" | "courses" | "fx" | "tricks" | "tracklab" | "reference"; art?: string; title: string; text: string; points: string[] }
const slides = (): Slide[] => [
  { icon: "learn", art: "footwork", title: t("Добро пожаловать в SP404 LEARN", "Welcome to SP404 LEARN"), text: t("Учебник по SP-404MKII, который работает на твоём компьютере: без аккаунта, без интернета, аудио никуда не уходит.", "A study companion for the SP-404MKII that runs on your computer: no account, no internet, your audio never leaves it."),
    points: [t("Учись по шагам — кнопки подсвечиваются на схеме устройства", "Learn step by step — buttons light up on the device diagram"), t("Практикуй ритмы с таймингом", "Practise rhythms with timing feedback"), t("Разбирай свои треки", "Break down your own tracks")] },
  { icon: "courses", art: "jungle", title: t("Курсы и жанры", "Courses and genres"), text: t("«SP-404 с нуля», средний уровень и по 10 уроков на жанр: от Footwork и Jungle до House, Techno и Ambient.", "“SP-404 from zero”, an intermediate path and 10 lessons per genre — from Footwork and Jungle to House, Techno and Ambient."),
    points: [t("Каждый курс заканчивается маленьким своим треком", "Every course ends with a small track of your own"), t("Прогресс сохраняется на этом компьютере", "Progress is saved on this computer")] },
  { icon: "fx", art: "dub", title: t("FX Lab", "FX Lab"), text: t("Все 46 эффектов SP-404MKII: что делает, параметры, как попробовать, где применять.", "All 46 SP-404MKII effects: what each does, its parameters, how to try it and where to use it."),
    points: [t("Фильтры по категориям и сложности", "Filter by category and difficulty"), t("Шаги проверены по руководству Roland", "Steps checked against Roland's manual")] },
  { icon: "tricks", art: "breakbeat", title: t("Tricks и практика", "Tricks and practice"), text: t("Короткие приёмы на несколько шагов — нарезка, ресэмплинг, грув, переходы. И упражнения: слушай, смотри, повторяй, играй.", "Short multi-step tricks — chopping, resampling, groove, transitions — plus exercises: listen, watch, copy, play."),
    points: [t("Паттерн можно скрыть и играть по памяти", "Hide the pattern and play it from memory"), t("Играй на экранных пэдах или клавишами Z X C V…", "Play on the on-screen pads or with Z X C V…")] },
  { icon: "tracklab", art: "ukgarage", title: t("Track Lab: разбери свой трек", "Track Lab: take your track apart"), text: t("Перетащи трек: темп, сетка, структура, ударные, бас, стемы и жанр. А «Учить этот трек» превращает разбор в план уроков.", "Drop a track: tempo, grid, structure, drums, bass, stems and genre. “Learn this track” turns the analysis into a lesson plan."),
    points: [t("Жанр — подсказка, а не вердикт: его всегда можно поправить", "Genre is a hint, not a verdict — you can always correct it"), t("Для точного жанра есть необязательный Genre Pack в Настройках", "The optional Genre Pack in Settings gives more reliable genre detection")] },
  { icon: "reference", art: "techno", title: t("Reference и поиск", "Reference and search"), text: t("Короткие ответы про кнопки и понятия. А поиск сверху (клавиша «/») ищет по урокам, приёмам, эффектам и справке сразу.", "Short answers about buttons and concepts. The search box on top (press “/”) searches lessons, tricks, effects and reference at once."),
    points: [t("Подсказки по любому экрану — кнопка «? Подсказки»", "Tips for any screen — the “? Tips” button"), t("Эту экскурсию можно повторить в Настройках", "You can replay this tour in Settings")] },
];

/** First-launch walkthrough of what the app does. Skippable at any step; replayable from Settings. */
export function Onboarding() {
  const open = useStore((s) => s.onboarding);
  const [i, setI] = useState(0);
  useEffect(() => { if (shouldOnboard()) setState({ onboarding: true }); }, []);
  useEffect(() => {
    if (!open) return;
    setI(0);
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") finish(); else if (e.key === "ArrowRight") setI((n) => Math.min(n + 1, slides().length - 1)); else if (e.key === "ArrowLeft") setI((n) => Math.max(0, n - 1)); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);
  if (!open) return null;
  const all = slides(), s = all[i], last = i === all.length - 1;
  return (
    <div className="onb-scrim" role="dialog" aria-modal="true" aria-label={t("Знакомство с приложением", "App introduction")}>
      <div className="onb">
        <div className="onb-art">{s.art && <GenreArt id={s.art} />}</div>
        <div className="onb-body">
          <span className="k"><Icon name={s.icon} size={16} /> {t("Шаг", "Step")} {i + 1} / {all.length}</span>
          <h2>{s.title}</h2>
          <p>{s.text}</p>
          <ul>{s.points.map((p) => <li key={p}>{p}</li>)}</ul>
          <div className="onb-dots" aria-hidden="true">{all.map((_, n) => <i key={n} className={n === i ? "on" : ""} />)}</div>
          <div className="onb-actions">
            <button className="link" onClick={finish}>{t("Пропустить", "Skip")}</button>
            <span className="grow" />
            {i > 0 && <button className="btn" onClick={() => setI(i - 1)}>{t("Назад", "Back")}</button>}
            <button className="btn primary" onClick={() => (last ? finish() : setI(i + 1))}>{last ? t("Начать", "Get started") : t("Далее", "Next")} <Icon name="arrow" size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
