import { setState, useStore, type Screen } from "../state/store";

const ITEMS: { id: Screen; label: string; needsTrack: boolean }[] = [
  { id: "track", label: "Track", needsTrack: true }, { id: "stems", label: "Stems", needsTrack: true }, { id: "drums", label: "Drums", needsTrack: true },
  { id: "bass", label: "Bass", needsTrack: true }, { id: "structure", label: "Structure", needsTrack: true },
  { id: "recipe", label: "SP Recipe", needsTrack: true }, { id: "learn", label: "Learn", needsTrack: false },
];

export function Sidebar() {
  const screen = useStore((s) => s.screen);
  const has = useStore((s) => !!s.analysis);
  const name = useStore((s) => s.trackName);
  return (
    <nav className="sidebar">
      <button className="logo" onClick={() => setState({ screen: "home" })}>SP-404<br /><span>LEARN</span></button>
      {name && <div className="trackname" title={name}>{name}</div>}
      {ITEMS.map((i) => (
        <button key={i.id} className={`nav ${screen === i.id || (i.id === "learn" && screen === "tutorial") ? "on" : ""}`}
          disabled={i.needsTrack && !has} onClick={() => setState({ screen: i.id })}>{i.label}</button>
      ))}
      <div className="grow" />
      <button className={`nav ${screen === "settings" ? "on" : ""}`} onClick={() => setState({ screen: "settings" })}>Settings</button>
      <div className="local">● Local processing</div>
    </nav>
  );
}
