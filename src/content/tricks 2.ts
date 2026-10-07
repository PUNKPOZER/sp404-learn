import { PLANNED, trickEntries } from "./load";

/** TRICKS (verified only), loaded from /content/tricks/**.trick.json in the UI language. */
export const TRICKS = trickEntries();
/** Planned topics (no lessons yet; never rendered as lessons). */
export const PLANNED_TOPICS = PLANNED.tricks;
