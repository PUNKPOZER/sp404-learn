# SP SYSTEM — design system (as implemented in SP-404 LEARN)

SP SYSTEM is the internal name for the visual language shared by **SP404 DROP** and **SP-404 LEARN**. This document describes what is **actually in this repository**.
Concept: **precision hardware UI + playful printed vector graphics.** The working UI is calm, rectangular and structured; the illustrations are simple, slightly imperfect screen-print shapes.

Source files: `src/styles/tokens.css` (tokens), `src/styles.css` (components), `src/components/*` (React), `src/assets/` (brand + genre art), `design-reference/brand-logo.svg` (brand source of truth).

## 1. Palette
Paper + Ink carry almost everything. Red / Blue / Green are accents that must communicate something.

| Token | Hex | Role |
|---|---|---|
| `--sp-paper` | `#F2F1EC` | page background |
| `--sp-ink` | `#191918` | text, borders, inverted/selected states |
| `--sp-red` | `#FF2A1A` | performance / record / **highlighted pad**; DJ-style "action now" |
| `--sp-blue` | `#1265F5` | **LEARN navigation focus & primary action**, progress, FX parameters |
| `--sp-green` | `#718A35` | success / "ok" state, moss accent |
| derived | `--sp-white #FBFAF7`, `--sp-paper-2 #E8E6DE`, `--sp-paper-3 #DAD7CB`, `--sp-rule #C4C1B4`, `--sp-ink-2 #4A4944`, `--sp-ink-3 #66645D` | hierarchy only |
| text-safe accents | `--sp-red-ink #B8140A`, `--sp-green-ink #566A27`, `--sp-blue-hover #0E52C9` | accents used as **text** on paper (≥ 5:1) |

Contrast checked: ink on paper 15.6:1 · `--sp-ink-2` 9:1 · `--sp-ink-3` 5.2:1 · paper on blue 4.9:1 · ink on red 5.9:1 (paper on red is only 3.3:1 — never used for small text).
**Not used:** gradients (the only `linear-gradient` is the hatch pattern for low-confidence drum hits), glass, glow, heavy shadows (the only shadow is a hard 4–6 px ink offset on menus/tour cards), fake-metal textures.
Colour is never the only cue: pads/cells/knobs/buttons that are highlighted also get a `●` marker or a thick outline; rows and sections always carry text labels.

Domain palettes are restricted to the same four colours: drum voices (kick/bass ink, snare/clap red, hats blue, perc/vocal/chop green), stems (drums red, bass ink, lead blue, vocals green), sections (INTRO blue, DROP red, BREAK green, OUTRO grey-ink).

## 2. Typography
Two roles + a restrained mono. **No web fonts** (the app is offline-first); stacks fall back to system faces.

| Role | Token | Stack | Use |
|---|---|---|---|
| Display / hardware | `--sp-font-display` | Avenir Next, Futura, Century Gothic, Helvetica Neue (heavy 800 weight, as on the board) | headings, BPM, numbers, lesson numbers, pad numbers — bold, uppercase |
| UI / information | `--sp-font-ui` | system sans (SF Pro Text / Segoe UI / Inter) | controls, paragraphs, metadata |
| Technical | `--sp-font-mono` | ui-monospace, SF Mono, Menlo, Consolas | times, URLs, controls' printed names, device display |

Sizes: `--sp-text-2xs 10` · `xs 11` · `sm 12` · `md 14` · `lg 16` · `xl 22` · `2xl 32` · `display clamp(34px, 5vw, 56px)`. Buttons/labels: bold, uppercase, `--sp-tracking-caps .06em`.
No pixel font anywhere (device-like type appears only in the mono display of the device diagram).

## 3. Spacing, radius, borders, controls, motion
- **Spacing** (4 px base): `--sp-space-1…7` = 4 · 8 · 12 · 16 · 24 · 32 · 48.
- **Radius** (restrained, board-soft): `0 · 3 · 6 · 8 px`; cards use 8 px with a 1 px `--sp-card-line`; `--sp-radius-pill` exists but is unused in LEARN. Panels/tiles/pads use 2–4 px.
- **Borders**: `--sp-border-w 2px` (components), `thin 1px` (rules), `heavy 3px` (drop zones, continue card).
- **Controls**: `--sp-control-h 40px`, `--sp-control-h-sm 32px`, minimum hit area 28–40 px (compact buttons are 28 px).
- **Pads**: `--sp-pad-gap 8px`, `--sp-pad-size 72px`, `--sp-pad-radius 4px`.
- **Motion** (hardware: fast, direct): `--sp-dur-fast 70ms`, `--sp-dur 130ms`, `--sp-ease cubic-bezier(.2,0,0,1)`; used for state changes, press feedback, progress width, tour spotlight. `prefers-reduced-motion` collapses all durations.
- **z-index**: `base 1 · sticky 10 · overlay 20 · toast 30 · tour 100`. **Focus**: `3px solid var(--sp-focus)` (blue), offset 2 px, on every interactive element.

## 4. Components
| Component | File | Notes |
|---|---|---|
| **PadGrid** (canonical 4×4) | `components/SP404PadGrid.tsx` | one CSS-grid cell per pad, pad 1 bottom-left; props: `kit`, `labels`, `highlighted` (red + ●), `selected`, `active` (blue underline), `steps` (LED), `bank`, `onPad`. Used by Recipe, lessons, DeviceDiagram, mini inspector. **No other pad grid exists.** |
| **DeviceDiagram** | `components/DeviceDiagram.tsx` | schematic SP-404MKII: display, CTRL 1–3, VALUE, effect buttons, key buttons, 16 pads. `highlightPads`, `highlightControls`. Only controls that appear in verified Roland procedures. Captioned "simplified — not to scale". |
| **Knob** | `components/Knob.tsx` | display-only rotary (explains a control; never simulates audio) |
| **StepSequencer** | `components/StepSequencer.tsx` | 16 steps in 4 beat groups, confidence hatch, selection/highlight outlines |
| **Waveform / SectionStrip / ChopPanel** | `components/` | colours from the four-colour palette; sections labelled |
| **CourseCard**, **GenreArt** | `components/` | one genre symbol + name + descriptor + real progress |
| **Buttons** `.btn` (`primary` blue, `record` red, `on` ink, `sm`, `xs`, `tab`), **chips**, **panels**, **tabs**, **seg** | `styles.css` | rectangular, 2 px ink border |
| **Tour** | `components/Tour.tsx` | spotlight onboarding; hard-shadow card |
| **BrandMark / Logo** | `components/` | see §6 |

## 5. Icons and glyphs
LEARN uses text glyphs (▶ ■ ◀ → ✓ ✎ ↓) in labelled buttons, plus the brand mark and genre art as inline SVG. There is no icon font. (SP404 DROP replaces its Unicode glyphs with an SVG sprite — see that repository's `web/assets/icons.svg`; the same 24×24, 2 px, square-cap rules apply when LEARN needs a sprite.)

## 6. Logo usage
- **Master symbol:** the cow sitting on a chair, supplied as `LOGO.svg` → `design-reference/brand-logo.svg` (single path, 947×1072). `src/assets/brand-logo.svg` is a byte-identical copy; a test fails if they differ.
- **Never redrawn, recoloured by gradient, distorted or replaced.** It is scaled uniformly (aspect 947:1072) and only the **fill** changes (`currentColor`: Ink on paper, Paper on ink, Red/Paper on red).
- **® removed:** the supplied artwork ends with a ® built from its **last four subpaths**. Product UI omits them (`BrandMark.tsx` / `scripts/make-icons.py` drop those four subpaths at render time; no other coordinate changes). Pass `keepRegistered` / `--keep-registered` if a context explicitly requires it.
- Sidebar: red cow mark on the ink sidebar (blue active item with icon + sublabel) under an ink top strip "SP SYSTEM / LEARN … FOR SP-404MKII". No Roland marks in the chrome; the product is described as *unofficial* in docs.
- Monochrome small contexts: favicon (`public/favicon.svg`) and 16–32 px icon use the same geometry with the ® omitted.

## 7. App icon usage
Generated by `scripts/make-icons.py` (numpy only) from the brand path → `src-tauri/icons/source.png` → `npx tauri icon`.
- **LEARN icon: Ink field + Red cow**, as on the SP SYSTEM reference board (the same red cow is the sidebar mark). Ink+Paper (contrast 15.6:1 vs 4.7:1 for red) stays available via `--variant ink-paper` if 16 px legibility ever matters more than board fidelity.
- **DROP icon (other repository): Signal Red field + Paper cow.** Both icons share the same cow, inset (5.5 %), corner radius (22.5 %) and scale (cow = 60 % of height), so they read as one family.

## 8. Genre SVG rules (`src/assets/genres/*.svg`)
**One genre → one idea → one SVG** (13 genres; style follows the board's top row). No decoration around the symbol (no stars, splashes, notes, scenery, text).
- Canvas `viewBox="0 0 200 200"`, shapes centred, ≥ 8 px margin; editable paths only — **no** bitmaps, base64, filters, patterns or gradients (a test enforces this).
- Colour via `currentColor` (the card sets the genre colour); one extra token colour allowed only where the brief asks (Ambient's waveform line uses `--sp-green`).
- Two languages that share weight and level of simplification: **Style A** — filled silhouette with slightly organic outline; **Style B** — technical line graphic (4 px strokes, square caps).
- Used at 56–180 px; each must be readable at 56 px.

| Genre (course id) | Idea | Style | Colour |
|---|---|---|---|
| Footwork / Juke (`footwork`) | two sneakers mid-step | A | red |
| Jungle (`jungle`) | one palm tree | A | green |
| UK Garage (`ukgarage`) | clock tower | A | blue |
| Hip-Hop (`hiphop`) | graffiti crown tag with drips | A | ink |
| House (`house`) | one house | A | red |
| Techno (`techno`) | factory with saw-tooth roof | A | ink |
| Breakbeat (`breakbeat`) | record broken in two | A | red |
| Ambient (`ambient`) | perspective floor + one waveform | B | blue (+ green line) |
| IDM (`idm`) | board-style symbol | A | green |
| Dub (`dub`) | board-style symbol | A | blue |
| Trip-Hop (`triphop`) | crescent moon | A | ink |
| Lo-Fi House (`lofihouse`) | cassette tape | A | green |
| Lo-Fi Hip-Hop (`lofihiphop`) | headphones | A | blue |

To add a genre: draw one SVG with these rules → add its colour to `GENRE_COLOR` in `GenreArt.tsx` → add the course spec (`python/translator/sp404/courses.py`). Assets without a course are committed but not shown.

## 9. Interaction & accessibility
Hardware feel: no decorative animation; press feedback ≤ 70 ms. Keyboard: all controls are real `<button>`/`<input>`; visible blue focus ring; tour supports ← → Enter Esc; lists and sidebar use `aria-current`; progress bars expose `role="progressbar"`; icon-only/short controls carry `aria-label`; pads announce their number, label and highlight state.
Known gaps: the waveform/step grid are pointer-first (keyboard selection exists for cells but not waveform seeking); canvas drawings have no text alternative beyond their section labels.

## 10. Content rule (learning material)
FX LAB, TRICKS and REFERENCE show **only** items with `status: "verified"`, each with Roland `sources` and a check date (enforced by `src/content/content.test.ts`). Anything unverified stays `todo` and is never rendered as a lesson. Button names in generated tutorials come from `python/translator/sp404/text.py` and match the official TR-REC procedure.

## 11. Relationship to SP404 DROP and future work
DROP shares the tokens (`web/sp-system.css`, same `--sp-*` names), the 4×4 pad geometry and the brand mark. Interchange between the apps is specified in `SP_SYSTEM_INTERCHANGE.md` (not implemented). A shared npm/CSS package is **not** created yet; the token files are intentionally identical so they can be extracted later. A React migration of DROP is documented as a possible future phase only.

## 12. Languages (RU / EN)
Russian is the source language, English is inline: `t("Курсы", "Courses")` (`src/lib/i18n.ts`) in the UI and `L(ru, en)` (`python/translator/sp404/i18n.py`) in generated lessons. The choice (RU/EN switch in the top strip, stored in `localStorage`, default from the system language) reloads the window; the frontend sends `lang` with every sidecar request. Analysis notes cached by the engine stay Russian and are mapped at display time (`src/lib/engineText.ts`, `sectionName`). Course covers are the genre cards of §8 (number, symbol, name + arrow).
