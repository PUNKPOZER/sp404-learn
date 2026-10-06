import { setLoop, togglePlay } from "../lib/audio/preview";
import { setState, useStore } from "../state/store";
import { t } from "../lib/i18n";

const mmss = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

export function Transport() {
  const s = useStore((x) => x);
  const bpm = s.previewBpm ?? s.analysis?.grid.bpm ?? s.recipe?.bpm ?? 160;
  const audioMode = s.screen === "stems" || s.screen === "track";   // plays your audio, not the synth preview
  const patterns = audioMode || s.screen === "tutorial" || s.screen === "drums" || s.screen === "bass" ? [] : s.recipe?.patterns ?? [];
  const label = s.screen === "stems" ? `${t("СТЕМЫ", "STEMS")} ${mmss(s.stemTime)}` : s.screen === "track" ? `${t("ТРЕК", "TRACK")} ${mmss(s.stemTime)}`
    : s.screen === "bass" ? `${t("БАС · ТАКТ", "BASS · BAR")} ${s.currentBar + 1}` : s.screen === "drums" ? `${t("ТАКТ", "BAR")} ${s.currentBar + 1}` : s.screen === "tutorial" ? t(t("ШАГ УРОКА", "LESSON STEP"), "LESSON STEP") : `${t("ПАТТЕРН", "PATTERN")} ${s.activePattern}`;
  return (
    <footer className="transport" data-tour="transport">
      <button className={`btn big ${s.playing ? "on" : ""}`} onClick={togglePlay}>{s.playing ? t("■ Стоп", "■ Stop") : t("▶ Играть", "▶ Play")}</button>
      {!audioMode && <button className={`btn ${s.loop ? "on" : ""}`} aria-pressed={s.loop} onClick={() => setLoop(!s.loop)}>{t("Повтор", "Loop")}</button>}
      {!audioMode && (
        <div className="bpm">
          <span className="k">BPM</span>
          <button className="btn sm" onClick={() => setState({ previewBpm: Math.max(40, Math.round(bpm) - 1) })}>−</button>
          <b>{bpm.toFixed(bpm % 1 ? 1 : 0)}</b>
          <button className="btn sm" onClick={() => setState({ previewBpm: Math.min(240, Math.round(bpm) + 1) })}>+</button>
          {s.previewBpm != null && <button className="btn sm" title={t("Вернуть темп трека", "Back to the track tempo")} onClick={() => setState({ previewBpm: null })}>{t("Сброс", "Reset")}</button>}
        </div>
      )}
      <div className="grow" />
      <span className="k">{t("СЕЙЧАС", "NOW")}</span><b className="mono">{label}</b>
      {patterns.length > 0 && (
        <div className="seg">{patterns.map((p) => (
          <button key={p.name} className={`btn sm ${s.activePattern === p.name ? "on" : ""}`} onClick={() => setState({ activePattern: p.name })}>{p.name}</button>
        ))}</div>
      )}
      <span className="k">{audioMode ? t("ТВОЁ АУДИО · ЛОКАЛЬНО", "YOUR AUDIO · LOCAL") : t("ПРЕВЬЮ: СИНТЕЗАТОР", "PREVIEW: SYNTH")}</span>
    </footer>
  );
}
