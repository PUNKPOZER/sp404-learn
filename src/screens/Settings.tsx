import { useEffect, useState } from "react";
import { api } from "../lib/sidecar";

export function Settings() {
  const [info, setInfo] = useState<{ bytes: number; path: string } | null>(null);
  const refresh = () => api.cacheInfo().then(setInfo).catch(() => setInfo(null));
  useEffect(() => { void refresh(); }, []);
  return (
    <div className="screen">
      <header className="screen-head"><h1>SETTINGS</h1></header>
      <section className="panel privacy"><h2>● LOCAL PROCESSING</h2><p>Your audio stays on this computer. Nothing is uploaded; there is no telemetry and no account.</p></section>
      <section className="panel"><h2>CACHE</h2>
        <p className="mono">{info ? `${(info.bytes / 1024).toFixed(1)} KB · ${info.path}` : "engine not reachable"}</p>
        <button className="btn" onClick={async () => { await api.cacheClear(); await refresh(); }}>CLEAR CACHE</button>
        <p className="hint">Cached analyses are keyed by the audio file’s content hash, so re-opening a track skips analysis.</p></section>
      <section className="panel"><h2>MODEL STORAGE</h2><p>No ML models installed. Stem separation and learned drum classification are optional future modules; the app is fully functional without them.</p></section>
    </div>
  );
}
