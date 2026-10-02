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
      <header className="screen-head"><h1>Settings</h1></header>
      <section className="panel privacy"><h2>● Local processing</h2><p>Your audio stays on this computer. Nothing is uploaded; there is no telemetry and no account.</p></section>
      <section className="panel">
        <h2>Model storage · stem separation</h2>
        {!model ? <p className="hint">Engine not reachable.</p> : !model.runtime ? (
          <p>The separation runtime (PyTorch + Demucs) isn’t part of this build. The app still works on the full mix.</p>
        ) : (
          <>
            <div className="row2"><span>HT-Demucs <span className="dim">· drums / bass / lead / vocals</span></span>
              <span className={`chip ${model.weights ? "" : "soft"}`}>{model.weights ? "installed" : "not downloaded"}</span></div>
            <p className="mono dim">{model.path} · {mb(model.bytes)} · runs on {model.device.toUpperCase()}</p>
            {!model.weights && (
              <>
                <p className="hint">One-time download of ~{model.size_mb} MB from {model.host}. This is the only network request the app ever makes, and only when you press the button.
                  After that, separation runs fully offline.</p>
                <button className="btn primary" disabled={dl === "busy"} onClick={async () => {
                  setDl("busy"); setErr("");
                  try { setModel(await api.modelsDownload()); setDl("idle"); } catch (e) { setErr((e as Error).message); setDl("err"); }
                }}>{dl === "busy" ? "Downloading…" : `Download model (${model.size_mb} MB)`}</button>
                {dl === "err" && <div className="err">{err}</div>}
              </>
            )}
            {model.weights && <p className="hint">New analyses will separate stems automatically. Tracks analyzed earlier without stems are re-analyzed the next time you open them.</p>}
          </>
        )}
      </section>
      <section className="panel"><h2>Cache</h2>
        <p className="mono">{cache ? `${mb(cache.bytes)} · ${cache.path}` : "engine not reachable"}</p>
        <button className="btn" onClick={async () => { await api.cacheClear(); refresh(); }}>Clear cache</button>
        <p className="hint">Cached analyses and stems are keyed by the audio file’s content hash, so re-opening a track skips the work.</p></section>
    </div>
  );
}
