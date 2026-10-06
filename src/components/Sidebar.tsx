import { Logo } from "./Logo";
import { setState, TRACK_LAB_SCREENS, useStore, type Screen } from "../state/store";

const AREAS: { id: Screen; label: string; also?: Screen[] }[] = [
  { id: "home", label: "Главная" },
  { id: "courses", label: "Курсы", also: [] },
  { id: "fxlab", label: "FX Lab", also: ["fx"] },
  { id: "tricks", label: "Tricks", also: ["trick"] },
];
const LAB: { id: Screen; label: string }[] = [
  { id: "track", label: "Трек" }, { id: "stems", label: "Стемы" }, { id: "drums", label: "Ударные" }, { id: "bass", label: "Бас" },
  { id: "structure", label: "Структура" }, { id: "recipe", label: "Рецепт SP" },
];

export function Sidebar() {
  const screen = useStore((s) => s.screen);
  const has = useStore((s) => !!s.analysis);
  const name = useStore((s) => s.trackName);
  const tutorialBack = useStore((s) => s.tutorial?.back);
  const effective: Screen = screen === "tutorial" ? tutorialBack ?? "courses" : screen;
  const inLab = TRACK_LAB_SCREENS.includes(effective);
  return (
    <nav className="sidebar" data-tour="sidebar" aria-label="Разделы">
      <button className="logo" aria-label="SP-404 LEARN — на главную" onClick={() => setState({ screen: "home" })}><Logo /></button>
      {AREAS.map((a) => (
        <button key={a.id} data-tour={`nav-${a.id}`} className={`nav ${effective === a.id || a.also?.includes(effective) ? "on" : ""}`} aria-current={effective === a.id ? "page" : undefined}
          onClick={() => setState({ screen: a.id })}>{a.label}</button>
      ))}
      <button data-tour="nav-tracklab" className={`nav ${inLab ? "on" : ""}`} onClick={() => setState({ screen: has ? "track" : "tracklab" })}>Track Lab</button>
      {(inLab || has) && (
        <>
          {name && <div className="trackname" title={name}>{name}</div>}
          {LAB.map((i) => (
            <button key={i.id} data-tour={`nav-${i.id}`} className={`nav sub ${effective === i.id ? "on" : ""}`} disabled={!has} onClick={() => setState({ screen: i.id })}>{i.label}</button>
          ))}
        </>
      )}
      <button data-tour="nav-reference" className={`nav ${effective === "reference" ? "on" : ""}`} onClick={() => setState({ screen: "reference" })}>Reference</button>
      <div className="grow" />
      <button data-tour="nav-settings" className={`nav ${effective === "settings" ? "on" : ""}`} onClick={() => setState({ screen: "settings" })}>Настройки</button>
      <div className="local">● Локальная обработка</div>
    </nav>
  );
}
