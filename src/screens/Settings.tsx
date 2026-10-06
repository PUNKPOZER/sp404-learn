import { useEffect, useState } from "react";
import { api } from "../lib/sidecar";
import type { ModelStatus } from "../lib/types";
import { t } from "../lib/i18n";

const mb = (b: number) => `${(b / 1048576).toFixed(1)} MB`;

export function Settings() {
  const [cache, setCache] = useState<{ bytes: number; path: string } | null>(null);
  const [model, setModel] = useState<ModelStatus | null>(null);
  const [dl, setDl] = useState<"idle" | "busy" | "err">("idle");
  const [err, setErr] = useState("");
  const refresh = () => {
    api.cacheInfo().then(setCache).catch(() => setCache(null));
    api.modelsStatus().then(setModel).catch(() => setModel(null));
  };
  useEffect(refresh, []);
  return (
    <div className="screen narrow">
      <header className="screen-head"><h1>{t("Настройки", "Settings")}</h1></header>
      <section className="panel privacy"><h2>● {t("Локальная обработка", "Local processing")}</h2><p>{t("Твоё аудио остаётся на этом компьютере. Ничего не загружается, нет телеметрии и аккаунта.", "Your audio stays on this computer. Nothing is uploaded; there is no telemetry or account.")}</p></section>
      <section className="panel">
        <h2>{t("Хранилище моделей · разделение на стемы", "Model storage · stem separation")}</h2>
        {!model ? <p className="hint">{t("Движок недоступен.", "The engine is unavailable.")}</p> : !model.runtime ? (
          <p>{t("Среда разделения (PyTorch + Demucs) не входит в эту сборку. Приложение работает по полному миксу.", "The separation runtime (PyTorch + Demucs) is not part of this build. The app works on the full mix.")}</p>
        ) : (
          <>
            <div className="row2"><span>HT-Demucs <span className="dim">· {t("ударные / бас / лид / вокал", "drums / bass / lead / vocals")}</span></span>
              <span className={`chip ${model.weights ? "" : "soft"}`}>{model.weights ? t("установлена", "installed") : t("не скачана", "not downloaded")}</span></div>
            <p className="mono dim">{model.path} · {mb(model.bytes)} · {t("работает на", "runs on")} {model.device.toUpperCase()}</p>
            {!model.weights && (
              <>
                <p className="hint">{t(`Разовая загрузка ~${model.size_mb} МБ с ${model.host}. Это единственный сетевой запрос приложения, и только по нажатию кнопки. После этого разделение работает полностью офлайн.`, `One-time download of ~${model.size_mb} MB from ${model.host}. This is the app's only network request, and only when you press the button. After that, separation works fully offline.`)}</p>
                <button className="btn primary" disabled={dl === "busy"} onClick={async () => {
                  setDl("busy"); setErr("");
                  try { setModel(await api.modelsDownload()); setDl("idle"); } catch (e) { setErr((e as Error).message); setDl("err"); }
                }}>{dl === "busy" ? t("Загрузка…", "Downloading…") : t(`Скачать модель (${model.size_mb} МБ)`, `Download the model (${model.size_mb} MB)`)}</button>
                {dl === "err" && <div className="err">{err}</div>}
              </>
            )}
            {model.weights && <p className="hint">{t("Новые анализы будут делить трек на стемы автоматически. Треки, проанализированные раньше без стемов, пересчитаются при следующем открытии.", "New analyses will split the track into stems automatically. Tracks analysed earlier without stems are recomputed the next time you open them.")}</p>}
          </>
        )}
      </section>
      <section className="panel"><h2>{t("Кэш", "Cache")}</h2>
        <p className="mono">{cache ? `${mb(cache.bytes)} · ${cache.path}` : t("движок недоступен", "engine unavailable")}</p>
        <button className="btn" onClick={async () => { await api.cacheClear(); refresh(); }}>{t("Очистить кэш", "Clear cache")}</button>
        <p className="hint">{t("Кэш анализа и стемов привязан к хэшу содержимого файла, поэтому повторное открытие трека не пересчитывает его.", "The analysis and stem cache is keyed by the file's content hash, so reopening a track doesn't recompute it.")}</p></section>
    </div>
  );
}
