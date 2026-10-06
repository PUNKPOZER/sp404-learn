# HARDWARE_PRACTICE_PLAN — practising on the real SP-404MKII (future, NOT implemented)

Status 2026-10-07: **design only.** Phase 7 shipped Practice Mode with on-screen pads and the computer keyboard. This file records what is *known* about the SP-404MKII's MIDI behaviour (from Roland's official manual), what is *not known*, and how a MIDI input adapter would plug into the existing code. No MIDI code exists and none should be written before the open questions are answered on a real unit.

## 1. What the manual says (checked 2026-10-07)

Sources: SP-404MK2 Reference Manual v4 — *MIDI implementation chart* (`…/8010996378593163.html`) and *MIDI note map* (`…/8012353178593931.html`). The pages were read through a page-summarising tool, so every item marked ⚠ must be re-read in the original before relying on it.

| Topic | What the manual states | Confidence |
|---|---|---|
| Note messages | **Transmitted: Note On only** (the chart lists "Note On/Off: transmitted … Note On only"); **recognised: yes** | ⚠ re-read; the chart row is terse |
| Note range, "MIDI mode A" | notes 35–51 (B1–E♭3) | ⚠ |
| Note range, "MIDI mode B" | notes 0, 12–91 (C-1, C0–G6) | ⚠ |
| Channels | five primary channels: **CH 1 = BUS 1, CH 2 = BUS 2, CH 3 = BUS 3, CH 4 = BUS 4, CH 5 = INPUT**; **CH 16** = chromatic mode, **CH 11** = vocoder input | ⚠ |
| Control Change | transmitted CC 7, 8, 20–27; recognised CC 7, 8, 16–19, 20–27, 80–83, 85–91 | ⚠ |
| Program Change | not transmitted; recognised (patterns 1–16) | ⚠ |
| Pitch bend | not transmitted; recognised only for Vocoder on CH 11 | ⚠ |
| Clock / Start / Stop | transmitted and recognised (clock out needs *MIDI Sync Out* ON and no external tempo input) | ⚠ |
| Remark | "All samples stop playing back when the MIDI cable is unplugged" | ⚠ |
| Note map | a table maps note numbers to **bank + pad**; the summarising tool returned a table that looked plausible but was internally inconsistent (e.g. note 35 labelled "EXT SOURCE", unreadable bank cells), so **no mapping is stated here** | ⚠ **not usable until read in the original and verified on a unit** |

## 2. What is NOT known (must be answered on a real unit before any code)

1. **Do the SP's own pads send MIDI notes when you play them** (over the 5-pin MIDI OUT and/or USB), and on which channel? The chart says Note On is *transmitted*, but nothing found says *under which conditions* (MIDI mode, pad vs. pattern playback, bank).
2. **What are "MIDI mode A" and "mode B"?** The note-map page does not define them in what I could read; they are probably a System setting. Find the setting name and default.
3. **Exact note ↔ pad ↔ bank mapping** in each mode (the table must be read in the original, then **verified by pressing pads and watching a MIDI monitor**).
4. **Velocity**: does a pad hit send a usable velocity (needed for dynamics exercises)?
5. **Timing**: latency of USB-MIDI vs. 5-pin; Web MIDI timestamps vs. our `AudioContext` clock.
6. **Note Off**: absent ("Note On only") — fine for taps, but gate-style exercises (hold a pad) cannot be judged by duration.
7. **Does playing a pad over USB also keep the SP sounding**, i.e. what the learner hears (the unit itself, not our synth)? This changes the metronome design (the click must then come from the app *and* be heard together with the unit).
8. **Browser/WebView support**: Web MIDI works in Chromium; Tauri's macOS WKWebView does **not** implement Web MIDI → a native path (Rust `midir` + a Tauri command/event) is required for the desktop app. Needs a spike.

## 3. How it will plug in (design)

The Practice code already isolates input behind an interface (`src/lib/practice.ts`):

```ts
interface PracticeHit { pad?: number; voice?: string; velocity?: number }
interface PracticeInput { name: string; start(onHit: (h: PracticeHit) => void): () => void }
```

* Today: `keyboardInput` and the on-screen `PadGrid` call `engine.hit(voice)`.
* A `MidiInput` would implement `PracticeInput`, translate *(channel, note)* → pad through a **mapping table kept in data (JSON), generated from the verified note map**, and call the same `hit`. Nothing else changes: scoring (`judge`), the phases (LISTEN → WATCH → COPY → PLAY), and the visibility modes (SHOW ALL / HIDE STEPS / MEMORY) are input-agnostic.
* Timing: the engine places a tap at `AudioContext.currentTime − outputLatency`. For MIDI the event's own timestamp must be converted to the same clock (calibrate once with a "tap to the click" test and store a per-device offset).
* A visible **"Use my SP-404MKII" toggle** in Practice, off by default, with a connection status and a calibration step. If no device is found, the app behaves exactly as today.

## 4. Planned learner flow (only after §2 is resolved)

```
LEARN:  PRESS PAD 7
         (the pad lights on the on-screen grid)
User presses pad 7 on the physical SP        → LEARN: ✓   (or "pad 5 — try 7")
```

* A *PRESS PAD n* drill checks the note → pad mapping first ("Which pad is this? press it").
* Pattern exercises then run exactly as in Practice Mode, with the learner's physical taps judged.
* A mapping/diagnostic screen shows the last received message (channel, note, velocity) — useful for both support and for verifying this plan.

## 5. Spike plan (small, reversible)

1. On a real SP-404MKII: connect via USB, open a MIDI monitor (e.g. MIDI Monitor on macOS), press pads in each bank and in both MIDI modes; record channel/note/velocity; note which System setting switches the mode. **Output: a verified mapping table (JSON) + screenshots/log.**
2. In the browser (Chromium) read the same events with Web MIDI; measure jitter against a click.
3. Tauri spike: `midir` in Rust → emit events to the WebView; confirm macOS permissions and latency.
4. Only then write `MidiInput`, its mapping JSON and tests (mapping, calibration maths); keep it behind the toggle.

## 6. Non-goals

* Sending MIDI **to** the SP (pattern selection, program change, CC remote control) — not needed for learning.
* Recording or editing the learner's patterns on the unit.
* Any behaviour that depends on the unverified items in §2.
