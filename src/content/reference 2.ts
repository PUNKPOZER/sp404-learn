import { t } from "../lib/i18n";
import { referenceEntries } from "./load";
import type { RefEntry } from "./types";

/** REFERENCE entries (verified only), loaded from /content/reference/*.ref.json. */
export const REFERENCE: RefEntry[] = referenceEntries().map((r) => ({ ...r, id: r.id.replace(/^ref-/, "") }));

export const CATEGORY_LABELS: Record<string, string> = { controls: t("Кнопки и ручки", "Buttons and knobs"), concepts: t("Понятия", "Concepts"), shortcuts: t("Сочетания", "Combos"), effects: t("Эффекты", "Effects"), workflow: t("Рабочий процесс", "Workflow") };

/** Plain filter: matches term and answer, case-insensitive, optional category. */
export function searchReference(entries: RefEntry[], query: string, category?: string | null): RefEntry[] {
  const q = query.trim().toLowerCase();
  return entries.filter((e) => e.status === "verified" && (!category || e.category === category)
    && (!q || e.term.toLowerCase().includes(q) || e.answer.toLowerCase().includes(q)));
}
