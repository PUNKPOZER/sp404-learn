import { DRUM_TYPES } from "../lib/types";
import { deleteEvent, updateEvent } from "../state/actions";
import { useStore } from "../state/store";
import { VOICE_LABELS } from "../lib/voices";
import { padOf } from "../lib/kit";
import { t } from "../lib/i18n";

/** Details of the drum hit selected on the grid (only shown on the Drums screen). */
export function Inspector() {
  const s = useStore((x) => x);
  const ev = s.analysis?.events.find((e) => e.id === s.selectedEventId);
  return (
    <aside className="inspector" data-tour="inspector">
      <h3>{t("ВЫБРАННЫЙ УДАР", "SELECTED HIT")}</h3>
      {ev ? (
        <div className="fields">
          <label>{t("ИНСТРУМЕНТ", "INSTRUMENT")}
            <select value={ev.type} onChange={(e) => updateEvent(ev.id, { type: e.target.value as typeof ev.type })}>
              {[...DRUM_TYPES, "UNKNOWN" as const].map((t) => <option key={t} value={t}>{VOICE_LABELS[t]}</option>)}
            </select>
          </label>
          <div className="row2"><span className="k">{t("ВРЕМЯ", "TIME")}</span><b className="mono">{ev.time.toFixed(3)} {t("с", "s")}</b></div>
          <div className="row2"><span className="k">{t("ТАКТ / ШАГ", "BAR / STEP")}</span><b className="mono">{ev.bar + 1} / {Math.floor((ev.step * 16) / (s.analysis?.resolution ?? 16)) + 1}</b></div>
          <div className="row2"><span className="k">{t("УВЕРЕННОСТЬ", "CONFIDENCE")}</span>
            <b className={`mono ${ev.confidence < 0.5 ? "warn" : ""}`}>{ev.manual ? t(t("ВРУЧНУЮ", "MANUAL"), "MANUAL") : `${(ev.confidence * 100).toFixed(0)}%`}</b></div>
          <div className="meter"><i style={{ width: `${ev.confidence * 100}%` }} /></div>
          <label>{t("ГРОМКОСТЬ", "VOLUME")} {(ev.velocity * 100).toFixed(0)}
            <input type="range" min={10} max={100} value={ev.velocity * 100} onChange={(e) => updateEvent(ev.id, { velocity: +e.target.value / 100 })} />
          </label>
          <div className="row2"><span className="k">{t("СМЕЩЕНИЕ ОТ СЕТКИ", "OFF-GRID OFFSET")}</span><b className="mono">{ev.manual ? "0.0" : (ev.timing_offset * 1000).toFixed(1)} {t("мс", "ms")}</b></div>
          <div className="row2"><span className="k">{t("ПЭД НА SP", "PAD ON SP")}</span><b className="mono">{padOf(ev.type, s.kit) ?? "—"}</b></div>
          <button className="btn danger" onClick={() => deleteEvent(ev.id)}>{t("Удалить удар", "Delete hit")}</button>
        </div>
      ) : (
        <div className="empty-inspector">
          <p><b>{t("Здесь — настройки одного удара.", "Settings of one hit live here.")}</b></p>
          <p className="hint">{t("Кликни по цветной клетке на сетке слева: появятся инструмент, громкость, уверенность и смещение. Их можно менять или удалить удар.", "Click a coloured cell on the grid on the left: instrument, volume, confidence and offset appear. You can change them or delete the hit.")}</p>
          {s.analysis && <p className="hint">{t(`В треке ${s.analysis.events.length} ударов; ${s.analysis.events.filter((e) => e.confidence < 0.5 && !e.manual).length} из них алгоритм считает неуверенными.`, `The track has ${s.analysis.events.length} hits; the algorithm is unsure about ${s.analysis.events.filter((e) => e.confidence < 0.5 && !e.manual).length} of them.`)}</p>}
        </div>
      )}
    </aside>
  );
}
