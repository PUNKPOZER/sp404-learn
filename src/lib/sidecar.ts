// Transport to the local Python engine. In the desktop app this is Tauri IPC → child process
// (JSON lines). In a plain browser (dev only) it talks to python/sidecar/dev_http.py on localhost.
import type { TrackAnalysis, Recipe, Course, StageInfo, ModelStatus } from "./types";

export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
const DEV_BRIDGE = "http://127.0.0.1:8404";

type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void; onEvent?: (d: StageInfo) => void };
const pending = new Map<number, Pending>();
let nextId = 1;
let ready: Promise<void> | null = null;

async function startTauri(): Promise<void> {
  const { invoke } = await import("@tauri-apps/api/core");
  const { listen } = await import("@tauri-apps/api/event");
  await listen<string>("sidecar-msg", (e) => {
    let m: { id?: number; event?: string; data?: StageInfo; result?: unknown; error?: { message: string; cancelled?: boolean } };
    try { m = JSON.parse(e.payload); } catch { return; }
    if (m.id == null) return;
    const p = pending.get(m.id);
    if (!p) return;
    if (m.event === "stage") { p.onEvent?.(m.data as StageInfo); return; }
    pending.delete(m.id);
    if (m.error) p.reject(Object.assign(new Error(m.error.message), { cancelled: !!m.error.cancelled }));
    else p.resolve(m.result);
  });
  await listen("sidecar-exit", () => {
    for (const [, p] of pending) p.reject(new Error("Analysis engine stopped unexpectedly."));
    pending.clear(); ready = null;
  });
  await invoke("sidecar_start");
}

export async function rpc<T>(method: string, params: object = {}, onEvent?: (d: StageInfo) => void): Promise<T> {
  const id = nextId++;
  if (!isTauri) {
    const r = await fetch(`${DEV_BRIDGE}/rpc`, { method: "POST", body: JSON.stringify({ id, method, params }) });
    const m = await r.json();
    for (const ev of m.events ?? []) onEvent?.(ev);
    if (m.error) throw Object.assign(new Error(m.error.message), { cancelled: !!m.error.cancelled });
    return m.result as T;
  }
  ready ??= startTauri();
  await ready;
  const { invoke } = await import("@tauri-apps/api/core");
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject, onEvent });
    invoke("sidecar_send", { line: JSON.stringify({ id, method, params }) }).catch((e) => {
      pending.delete(id); reject(new Error(String(e)));
    });
  });
}

export const api = {
  ping: () => rpc<{ ok: boolean }>("ping"),
  probe: (path: string) => rpc<{ duration: number; sample_rate: number; channels: number; peaks: number[][] }>("probe", { path }),
  analyze: (path: string, onEvent: (s: StageInfo) => void, use_cache = true) =>
    rpc<TrackAnalysis>("analyze", { path, use_cache }, onEvent),
  cancel: () => rpc("cancel"),
  regrid: (analysis: TrackAnalysis, grid: { bpm?: number; origin?: number }, resolution?: number) =>
    rpc<TrackAnalysis>("regrid", { analysis, grid, resolution }),
  recipe: (analysis: TrackAnalysis, kit: Record<number, string>, overrides: object, min_confidence: number) =>
    rpc<Recipe>("recipe", { analysis, kit, overrides, min_confidence }),
  course: (kit?: Record<number, string>) => rpc<Course>("course", { name: "footwork", kit }),
  modelsStatus: () => rpc<ModelStatus>("models_status"),
  modelsDownload: () => rpc<ModelStatus>("models_download"),
  chopPlan: (p: { path: string; mode: string; bars?: number; grid: { bpm: number; origin: number }; sensitivity?: number }) =>
    rpc<{ regions: { start: number; end: number }[]; duration: number }>("chop_plan", p),
  exportChops: (p: { path: string; regions: { start: number; end: number }[]; outdir: string; basename: string; normalize: boolean }) =>
    rpc<{ files: string[]; outdir: string }>("export_chops", p),
  cacheInfo: () => rpc<{ bytes: number; path: string }>("cache_info"),
  cacheClear: () => rpc("cache_clear"),
};

/** Raw bytes of a stem WAV (desktop: Rust command limited to the cache dir; dev: localhost bridge). */
export async function readStem(path: string): Promise<ArrayBuffer> {
  if (isTauri) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<ArrayBuffer>("read_stem_file", { path });
  }
  return (await fetch(`${DEV_BRIDGE}/file?path=${encodeURIComponent(path)}`)).arrayBuffer();
}
