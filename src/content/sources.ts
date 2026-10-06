import type { Source } from "./types";

const D = "2026-10-06";
const MANUAL = "SP-404MK2 Reference Manual";
export const SRC: Record<string, Source> = {
  bus: { title: `${MANUAL} — Adding effects to a sample (BUS FX)`, url: "https://static.roland.com/manuals/sp-404mk2_reference_v4/en-US/7899047578463371.html", verifiedOn: D, note: "v4" },
  djfx: { title: `${MANUAL} — DJFX Looper`, url: "https://static.roland.com/manuals/sp-404mk2_reference_v4/en-US/7976359578551691.html", verifiedOn: D, note: "v4" },
  djfxArticle: { title: "Roland Articles — SP-404: DJFX LOOPER and How to Use It", url: "https://articles.roland.com/sp-404-djfx-looper-and-how-to-use-it/", verifiedOn: D, note: "about the SP-404SX; knob roles on the MK2 may differ" },
  filter: { title: `${MANUAL} — Filter+Drive`, url: "https://static.roland.com/manuals/sp-404mk2_reference_v200/eng/37138874.html", verifiedOn: D, note: "v2.00" },
  resonator: { title: `${MANUAL} — Resonator`, url: "https://static.roland.com/manuals/sp-404mk2_reference_v200/eng/37138873.html", verifiedOn: D, note: "v2.00" },
  isolator: { title: `${MANUAL} — Isolator`, url: "https://static.roland.com/manuals/sp-404mk2_reference/eng/17805582.html", verifiedOn: D, note: "original manual" },
  skipback: { title: `${MANUAL} — Sampling what you previously played (SKIP-BACK SAMPLING)`, url: "https://static.roland.com/manuals/sp-404mk2_reference_v4/en-US/7907879578474123.html", verifiedOn: D, note: "v4" },
  mute: { title: `${MANUAL} — Preventing samples from playing back at the same time (MUTE GROUP)`, url: "https://static.roland.com/manuals/sp-404mk2_reference_v4/en-US/7895796378459531.html", verifiedOn: D, note: "v4" },
  resample: { title: `${MANUAL} — Sampling a pattern (RESAMPLE)`, url: "https://static.roland.com/manuals/sp-404mk2_reference_v4/en-US/7923444378491019.html", verifiedOn: D, note: "v4" },
  trrec: { title: `${MANUAL} — Creating a new pattern (TR-REC)`, url: "https://static.roland.com/manuals/sp-404mk2_reference_v4/en-US/7921805978489483.html", verifiedOn: D, note: "v4" },
  chain: { title: `${MANUAL} — Playing back patterns in order (PATTERN CHAIN)`, url: "https://static.roland.com/manuals/sp-404mk2_reference_v500/en-US/7925133978493323.html", verifiedOn: D, note: "v5" },
  shortcuts: { title: "SP-404MK2 List of Shortcut Keys", url: "https://static.roland.com/assets/media/pdf/SP-404MK2_v4_shortcut_eng03_W.pdf", verifiedOn: D, note: "v4 (cited indirectly via the manual pages above)" },
};
