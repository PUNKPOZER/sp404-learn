import { BrandMark } from "./BrandMark";
import { Icon } from "./Icon";
import { setState, TRACK_LAB_SCREENS, useStore, type Screen } from "../state/store";

const AREAS: { id: Screen; label: string; sub?: string; icon: string; also?: Screen[] }[] = [
  { id: "home", label: "Главная", sub: "Практика и уроки", icon: "learn" },
  { id: "courses", label: "Курсы", icon: "courses" },
  { id: "fxlab", label: "FX Lab", icon: "fx", also: ["fx"] },
  { id: "tricks", label: "Tricks", icon: "tricks", also: ["trick"] },
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
  const item = (on: boolean, icon: string, label: string, onClick: () => void, tour: string, sub?: string) => (
    <button key={tour} data-tour={tour} className={`nav ${on ? "on" : ""}`} aria-current={on ? "page" : undefined} onClick={onClick}>
      <Icon name={icon} /><span className="nav-label"><span>{label}</span>{sub && on && <small>{sub}</small>}</span>
    </button>
  );
  return (
    <nav className="sidebar" data-tour="sidebar" aria-label="Разделы">
      <button className="logo" aria-label="SP-404 LEARN — на главную" onClick={() => setState({ screen: "home" })}><BrandMark className="brand-mark" /></button>
      {AREAS.map((a) => item(effective === a.id || !!a.also?.includes(effective), a.icon, a.label, () => setState({ screen: a.id }), `nav-${a.id}`, a.sub))}
      {item(inLab, "tracklab", "Track Lab", () => setState({ screen: has ? "track" : "tracklab" }), "nav-tracklab")}
      {(inLab || has) && (
        <div className="nav-subgroup">
          {name && <div className="trackname" title={name}>{name}</div>}
          {LAB.map((i) => (
            <button key={i.id} data-tour={`nav-${i.id}`} className={`nav sub ${effective === i.id ? "on" : ""}`} disabled={!has} onClick={() => setState({ screen: i.id })}>{i.label}</button>
          ))}
        </div>
      )}
      {item(effective === "reference", "reference", "Reference", () => setState({ screen: "reference" }), "nav-reference")}
      <div className="grow" />
      {item(effective === "settings", "settings", "Настройки", () => setState({ screen: "settings" }), "nav-settings")}
      <div className="local">● Локально</div>
    </nav>
  );
}
