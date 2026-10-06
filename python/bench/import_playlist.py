"""Build a benchmark manifest from a DJ-software playlist export (private use; nothing here ships in the app).

Inputs: an .m3u8 playlist (file paths, one per track, in order) and optionally a Rekordbox-style text export
(tab-separated, UTF-16, header row) whose rows are in the SAME order. Genre truth comes from the parent folder name
via --map; BPM and Camelot key from the export are stored as *reference readings* (`bpm_ref`, `key_ref`), NOT truth:
DJ software reports half/double and wrong readings too. Reports measure agreement with them, separately.

  .venv/bin/python -m bench.import_playlist PLAYLIST.m3u8 --txt EXPORT.txt --out bench/local/benchmark.json \
        --map 'Footwork=footwork,juke' --map 'DNB=drum_and_bass,jungle' ..."""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

from bench import taxonomy

CAMELOT = {  # Camelot wheel -> "Tonic mode"
    "1A": "G# minor", "2A": "D# minor", "3A": "A# minor", "4A": "F minor", "5A": "C minor", "6A": "G minor", "7A": "D minor", "8A": "A minor",
    "9A": "E minor", "10A": "B minor", "11A": "F# minor", "12A": "C# minor",
    "1B": "B major", "2B": "F# major", "3B": "C# major", "4B": "G# major", "5B": "D# major", "6B": "A# major", "7B": "F major", "8B": "C major",
    "9B": "G major", "10B": "D major", "11B": "A major", "12B": "E major",
}


def read_playlist(path: str) -> list[str]:
    return [l.strip() for l in Path(path).read_text(encoding="utf-8").splitlines() if l.strip() and not l.startswith("#")]


def read_export(path: str) -> list[dict]:
    raw = Path(path).read_bytes()
    text = raw.decode("utf-16") if raw[:2] in (b"\xff\xfe", b"\xfe\xff") else raw.decode("utf-8")
    rows = [l.split("\t") for l in text.splitlines() if l.strip()]
    out = []
    for r in rows[1:]:
        try:
            bpm = float(r[1].replace(",", "."))
        except (IndexError, ValueError):
            bpm = None
        out.append({"bpm": bpm, "camelot": r[2].strip() if len(r) > 2 else ""})
    return out


def build(playlist: str, txt: str | None, folder_map: dict[str, list[str]]) -> list[dict]:
    files = read_playlist(playlist)
    ref = read_export(txt) if txt else []
    if ref and len(ref) != len(files):
        raise SystemExit(f"playlist has {len(files)} tracks but the export has {len(ref)} rows — refusing to guess the alignment")
    tracks = []
    for i, f in enumerate(files):
        folder = Path(f).parent.name
        genres = folder_map.get(folder, [])
        for g in genres:
            if g not in taxonomy.GENRES:
                raise SystemExit(f"unknown genre id {g!r} for folder {folder!r}")
        exp: dict = {"genre": genres}
        if ref and ref[i]["bpm"]:
            exp["bpm_ref"] = ref[i]["bpm"]
        if ref and CAMELOT.get(ref[i]["camelot"]):
            exp["key_ref"] = CAMELOT[ref[i]["camelot"]]
        tracks.append({"id": f"{i + 1:02d} {Path(f).stem}"[:90], "path": f, "expected": exp, "notes": f"genre = parent folder '{folder}' (owner's own sorting, not verified)"})
    return tracks


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("playlist")
    ap.add_argument("--txt")
    ap.add_argument("--out", required=True)
    ap.add_argument("--map", action="append", default=[], help="FOLDER=genre,genre (taxonomy ids)")
    a = ap.parse_args(argv)
    fm = {k: v.split(",") for k, v in (m.split("=", 1) for m in a.map)}
    tracks = build(a.playlist, a.txt, fm)
    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    Path(a.out).write_text(json.dumps({"tracks": tracks}, ensure_ascii=False, indent=1))
    by: dict[str, int] = {}
    for t in tracks:
        k = Path(t["path"]).parent.name
        by[k] = by.get(k, 0) + 1
    print(f"wrote {a.out}: {len(tracks)} tracks", by)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
