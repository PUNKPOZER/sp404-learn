# Contributing

- Python engine: `python -m venv .venv && .venv/bin/pip install numpy scipy pytest`, then `npm run py:test`.
- Frontend: `npm install`, `npm run typecheck && npm run lint && npm test`.
- Run the app: `npm run tauri dev` (needs Rust). Browser-only UI work: run
  `cd python && ../.venv/bin/python -m sidecar.dev_http` plus `npm run dev` (dev bridge, localhost only).
- Keep modules small: new analysis ideas go behind the existing interfaces
  (`DrumClassifier`, `StemSeparator`, `BassAnalyzer`).
- Never commit copyrighted audio; tests must synthesize their material (`engine/synth.py`).
- Adding a dependency: check its license first and record it in `THIRD_PARTY_LICENSES.md`.
- SP-404MKII button names/workflow wording lives in `python/translator/sp404/text.py` — correct it there.
