import { useEffect, useRef } from "react";
import { t } from "../lib/i18n";
import { getState, setState, useStore } from "../state/store";

/** Top-bar search: typing opens the SEARCH screen; "/" focuses it from anywhere (not while typing in a field). */
export function SearchBox() {
  const q = useStore((s) => s.searchQuery);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(el.tagName) && !el.isContentEditable) { e.preventDefault(); ref.current?.focus(); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  const change = (v: string) => {
    const s = getState();
    setState({ searchQuery: v, ...(v && s.screen !== "search" ? { screen: "search" as const, searchBack: s.screen } : {}) });
  };
  return <input ref={ref} className="search-box" type="search" value={q} placeholder={t("Поиск по урокам…  /", "Search the library…  /")}
    aria-label={t("Поиск по библиотеке", "Search the library")} onChange={(e) => change(e.target.value)}
    onKeyDown={(e) => { if (e.key === "Escape") { setState({ searchQuery: "", screen: getState().screen === "search" ? getState().searchBack : getState().screen }); (e.target as HTMLInputElement).blur(); } }} />;
}
