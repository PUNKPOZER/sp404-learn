import { Logo } from "./Logo";
import { setState, useStore, type Screen } from "../state/store";

const ITEMS: { id: Screen; label: string; needsTrack: boolean }[] = [
  { id: "track", label: "Трек", needsTrack: true }, { id: "stems", label: "Стемы", needsTrack: true }, { id: "drums", label: "Ударные", needsTrack: true },
  { id: "bass", label: "Бас", needsTrack: true }, { id: "structure", label: "Структура", needsTrack: true },
  { id: "recipe", label: "Рецепт SP", needsTrack: true }, { id: "learn", label: "Обучение", needsTrack: false },
];

export function Sidebar() {
  const screen = useStore((s) => s.screen);
  const has = useStore((s) => !!s.analysis);
  const name = useStore((s) => s.trackName);
  return (
    <nav className="sidebar" data-tour="sidebar">
      <button className="logo" aria-label="На главную" onClick={() => setState({ screen: "home" })}><Logo /></button>
      {name && <div className="trackname" title={name}>{name}</div>}
      {ITEMS.map((i) => (
        <button key={i.id} data-tour={`nav-${i.id}`} className={`nav ${screen === i.id || (i.id === "learn" && screen === "tutorial") ? "on" : ""}`}
          disabled={i.needsTrack && !has} onClick={() => setState({ screen: i.id })}>{i.label}</button>
      ))}
      <div className="grow" />
      <button data-tour="nav-settings" className={`nav ${screen === "settings" ? "on" : ""}`} onClick={() => setState({ screen: "settings" })}>Настройки</button>
      <div className="local">● Локальная обработка</div>
    </nav>
  );
}
