# SP SYSTEM — local interchange schema (proposal)

**Status: design only. Nothing in this document is implemented yet.** It prepares a future **OPEN IN LEARN** action in SP404 DROP (and, symmetrically,
"send these chops to DROP" from LEARN) without merging the two applications, without a cloud or accounts, and without touching the `.sp404learn` project format.

## Goals and non-goals
- Two separate apps exchange a **small JSON manifest + audio files on disk**. Both stay offline.
- **Do not** replace or rename `.sp404learn`; **do not** introduce a shared database or service; **do not** duplicate DROP's converter inside LEARN or LEARN's Python analysis inside DROP.
- LEARN's existing stem/chop export (16-bit / 48 kHz mono WAV, `<track>_stems/<track>_<part>_NN.wav`) is already compatible with the *files* part of this schema.

## Transport
1. The producing app writes a folder: `<name>/` containing the audio files and **`<name>.spsystem.json`** (the manifest).
2. The consuming app opens the manifest (file dialog, drag-and-drop of the manifest or of the folder, or an OS "open with" association registered later).
3. Audio is referenced by **relative path** inside the folder. Absolute paths are never required (this deliberately avoids the cache-path coupling noted in `PROJECT_AUDIT.md` §12.1).
4. No sockets, no URLs, no accounts. A future `sp-system://` URL scheme may only carry the **path to a local manifest**, never audio or metadata.

## Manifest v1

```jsonc
{
  "format": "sp-system.interchange",
  "version": 1,                      // integer, bumped only on breaking changes
  "createdBy": { "app": "sp404-drop", "version": "1.1.0" },
  "createdAt": "2026-10-06T12:00:00Z",

  "source": {
    "filename": "break_loop.wav",    // display name only
    "durationSec": 12.4,
    "sha256": "12e3…",               // optional, first 32 hex chars is enough; lets LEARN reuse its analysis cache
    "channels": 2, "sampleRate": 44100
  },

  "tempo": {                          // optional; omit when unknown
    "bpm": 160.0,
    "beatOffsetSec": 0.953,           // time of a bar's first beat (same meaning as LEARN's grid.origin)
    "beatsPerBar": 4,
    "confidence": 0.9,                // 0..1, producer's own estimate
    "halfDouble": [80.0, 320.0]       // alternative readings the user may switch to
  },

  "slices": [                         // regions of `source` that were cut
    { "index": 0, "startSec": 0.000, "endSec": 0.421, "file": "break_loop_01.wav", "label": null }
  ],

  "padMapping": [                     // optional; pad 1 = bottom-left, 16 = top-right (SP-404MKII physical order)
    { "bank": "A", "pad": 1, "slice": 0 }
  ],

  "files": [                          // every audio file the manifest refers to
    { "path": "break_loop_01.wav", "role": "slice",
      "format": { "container": "wav", "bitDepth": 16, "sampleRate": 48000, "channels": 1 } },
    { "path": "break_loop_bass.wav", "role": "stem", "part": "bass",
      "format": { "container": "wav", "bitDepth": 16, "sampleRate": 48000, "channels": 1 } }
  ],

  "analysis": {                       // optional, LEARN-origin only; free-form but versioned by `analysis.schema`
    "schema": 1,
    "sections": [ { "label": "ДРОП", "startSec": 18.0, "endSec": 30.0, "startBar": 12, "endBar": 20 } ],
    "stems": { "model": "htdemucs", "parts": ["drums", "bass", "lead", "vocals"] }
  }
}
```

### Field rules
| Field | Rule |
|---|---|
| `format`, `version` | Required. Consumers **must refuse** unknown `format` and **warn but try** on a higher `version` (ignoring unknown fields). |
| `source` | Required. `filename` is display-only; consumers never open it. `sha256` optional. |
| `tempo` | Optional. If present `bpm > 0`. `beatOffsetSec` may be negative or beyond the first slice. |
| `slices[].startSec/endSec` | Seconds on the `source` timeline, `0 ≤ start < end ≤ durationSec`. Slices may overlap or leave gaps (no implied contiguity). |
| `slices[].file` | Relative path of the rendered slice file, or `null` if the producer did not render it (consumer may re-cut from `source` if it has the audio). |
| `padMapping` | Optional. `pad ∈ 1..16`, `bank` is a letter A–J; each `(bank,pad)` maps to at most one slice; more than 16 slices ⇒ multiple banks. |
| `files[].path` | Relative, forward slashes, no `..`, no absolute paths, no drive letters. Consumers must reject anything else. |
| `files[].format` | Informational. Producers should write what the SP-404MKII loads directly: PCM WAV, 16-bit, 48 kHz. |

## How it maps to what exists today
| Manifest | DROP (web app) | LEARN (`TrackAnalysis` / `.sp404learn`) |
|---|---|---|
| `source.filename/duration` | loaded file (`state.fileName`, `audioBuffer.duration`) | `filename`, `duration` |
| `tempo.bpm`, `beatOffsetSec` | `state.grid.bpm`, `state.grid.offset` | `grid.bpm`, `grid.origin` |
| `slices[]` | `segments()` from `markers[]` | `chop_plan` regions (`{start,end}`) |
| `padMapping` | new (4×4 slice pad preview, banks of 16) | `kit` (pad → voice) is a different concept: LEARN maps *instruments* to pads |
| `files[]` | exported `sample_NN.wav` | stem/chop exports in `<track>_stems/` |
| `analysis.sections` | — | `sections[]` |

## Opening in LEARN (future behaviour, for design review)
1. DROP: **Chop / Loop → "Open in LEARN"** writes the folder + manifest next to the exported samples and asks the OS to open the manifest.
2. LEARN: registers `.spsystem.json`; on open it validates the manifest, resolves `source` (if the original audio is available beside it) and creates a **new, normal `.sp404learn` session** (no new project format):
   - `tempo` → pre-fills `grid` (still editable, still shows ÷2 / ×2),
   - `slices` → become chop regions in the Stems/Chop panel,
   - `padMapping` → shown as a labelled pad bank in Track Lab.
3. Nothing is uploaded; LEARN keeps its content-hash cache keyed by `source.sha256` when present.

## Security and privacy notes
- Treat manifests as **untrusted input**: validate types, clamp numbers, reject absolute/`..` paths, cap file counts and sizes, never execute anything.
- Audio never leaves the machine; the manifest contains file names, so it can reveal track titles — do not post manifests publicly by default.

## Open questions (to decide before implementation)
1. File extension/registration: `.spsystem.json` vs a dedicated extension (the latter needs OS association work on both platforms).
2. Should DROP embed the manifest in its ZIP exports (`SP404-DROP-<name>.zip`) so users can hand it over unchanged?
3. Bi-directional flow ("Send to DROP" from LEARN's chop panel) — same schema, `createdBy.app = "sp404-learn"`.
4. Bank letters vs numeric banks, once the SP-404MKII pad/bank behaviour has been verified against Roland's manual.
