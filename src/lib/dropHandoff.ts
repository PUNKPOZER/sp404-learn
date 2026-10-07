/** "Prepare in DROP": after a SUCCESSFUL save, open that exact .spsystem in SP404 DROP; if DROP cannot be launched, show the file in Finder instead.
 *  The save itself is never reported as failed because of the handoff. Kept free of Tauri imports so it can be tested with real path values. */
export interface HandoffDeps {
  openInDrop: (path: string) => Promise<void>;
  reveal: (path: string) => Promise<void>;
}
export type Handoff = { via: "drop" } | { via: "finder"; reason: string } | { via: "none"; reason: string };

export async function handOffToDrop(path: string, deps: HandoffDeps): Promise<Handoff> {
  try {
    await deps.openInDrop(path);
    return { via: "drop" };                                   // DROP launched: Finder is NOT opened as well
  } catch (e) {
    const reason = String((e as Error)?.message ?? e);
    try { await deps.reveal(path); return { via: "finder", reason }; }
    catch { return { via: "none", reason }; }                   // the file is saved either way
  }
}

/** Run the export first; only when it resolves is the handoff attempted (a save conflict or any export error rejects here and DROP is never launched). */
export async function prepareAndHandOff<R extends { path: string }>(exportFn: () => Promise<R>, deps: HandoffDeps): Promise<{ saved: R; handoff: Handoff }> {
  const saved = await exportFn();
  return { saved, handoff: await handOffToDrop(saved.path, deps) };
}
