import { useEffect, useState } from "react";
import { api } from "../lib/sidecar";
import type { ModelStatus } from "../lib/types";

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
      <header className="screen-head"><h1>Настройки</h1></header>
      <section className="panel privacy"><h2>● Локальная обработка</h2><p>Твоё аудио остаётся на этом компьютере. Ничего не загружается, нет телеметрии и аккаунта.</p></section>
      <section className="panel">
        <h2>Хранилище моделей · разделение на стемы</h2>
        {!model ? <p className="hint">Движок недоступен.</p> : !model.runtime ? (
          <p>Среда разделения (PyTorch + Demucs) не входит в эту сборку. Приложение работает по полному миксу.</p>
        ) : (
          <>
            <div className="row2"><span>HT-Demucs <span className="dim">· ударные / бас / лид / вокал</span></span>
              <span className={`chip ${model.weights ? "" : "soft"}`}>{model.weights ? "установлена" : "не скачана"}</span></div>
            <p className="mono dim">{model.path} · {mb(model.bytes)} · работает на {model.device.toUpperCase()}</p>
            {!model.weights && (
              <>
                <p className="hint">Разовая загрузка ~{model.size_mb} МБ с {model.host}. Это единственный сетевой запрос приложения, и только по нажатию кнопки.
                  После этого разделение работает полностью офлайн.</p>
                <button className="btn primary" disabled={dl === "busy"} onClick={async () => {
                  setDl("busy"); setErr("");
                  try { setModel(await api.modelsDownload()); setDl("idle"); } catch (e) { setErr((e as Error).message); setDl("err"); }
                }}>{dl === "busy" ? "Загрузка…" : `Скачать модель (${model.size_mb} МБ)`}</button>
                {dl === "err" && <div className="err">{err}</div>}
              </>
            )}
            {model.weights && <p className="hint">Новые анализы будут делить трек на стемы автоматически. Треки, проанализированные раньше без стемов, пересчитаются при следующем открытии.</p>}
          </>
        )}
      </section>
      <section className="panel"><h2>Кэш</h2>
        <p className="mono">{cache ? `${mb(cache.bytes)} · ${cache.path}` : "движок недоступен"}</p>
        <button className="btn" onClick={async () => { await api.cacheClear(); refresh(); }}>Очистить кэш</button>
        <p className="hint">Кэш анализа и стемов привязан к хэшу содержимого файла, поэтому повторное открытие трека не пересчитывает его.</p></section>
    </div>
  );
}
