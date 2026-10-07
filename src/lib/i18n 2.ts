/** UI language. Russian is the source language; English is given inline: t("Главная", "Home").
 *  The language is fixed per page load (changing it reloads the window), so t() can be used anywhere,
 *  including at module level, and is sent to the Python sidecar with every RPC call. */
export type Lang = "ru" | "en";
const KEY = "sp404learn.lang";

function detect(): Lang {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "ru" || v === "en") return v;
  } catch { /* storage unavailable */ }
  return typeof window === "undefined" ? "ru" : typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("ru") ? "ru" : "en";
}

export const lang: Lang = detect();

export function setLang(l: Lang) {
  try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
  location.reload();
}

/** Pick the string for the current language. If `en` is omitted the Russian text is used. */
export function t<T = string>(ru: T, en?: T): T {
  return lang === "en" && en !== undefined ? en : ru;
}
