"""Measured musical characteristics first; a style guess is only a hint derived from them."""
from __future__ import annotations

import numpy as np

from engine.model import DrumEvent, Grid


def measure(events: list[DrumEvent], grid: Grid, n_bars: int) -> dict[str, float]:
    n = max(1, n_bars)
    def dens(*types): return sum(1 for e in events if e.type in types) / n
    kicks = [e for e in events if e.type == "KICK"]
    backs = [e for e in events if e.type in ("KICK", "SNARE", "CLAP")]
    off = [e for e in backs if e.step % 4 != 0]
    ks = [e.step for e in kicks]
    four_floor = float(np.mean([any(e.step == s and e.bar == b for e in kicks) for b in
                                set(e.bar for e in kicks) or [0] for s in (0, 4, 8, 12)])) if kicks else 0.0
    return {
        "bpm": grid.bpm,
        "kick_density": dens("KICK"), "snare_density": dens("SNARE", "CLAP"),
        "hat_density": dens("CLOSED_HAT", "OPEN_HAT"), "perc_density": dens("PERCUSSION"),
        "syncopation": (len(off) / len(backs)) if backs else 0.0,
        "four_on_floor": four_floor,
        "timing_variation_ms": float(np.std([e.timing_offset for e in events]) * 1000) if events else 0.0,
        "kick_on_one": float(np.mean([e.step == 0 for e in kicks])) if kicks else 0.0,
        "snare_on_backbeat": float(np.mean([e.step in (4, 12) for e in events if e.type in ("SNARE", "CLAP")]))
        if any(e.type in ("SNARE", "CLAP") for e in events) else 0.0,
    }


def likely_styles(c: dict[str, float]) -> list[dict]:
    bpm, sync, ff = c["bpm"], c["syncopation"], c["four_on_floor"]
    hats = c["hat_density"]
    cand = []
    def add(name, score, why):
        cand.append({"style": name, "score": round(float(max(0, min(1, score))), 2), "why": why})
    foot = (0.5 if 145 <= bpm <= 175 else 0.0) + 0.35 * min(1, sync * 1.5) + (0.15 if hats >= 6 else 0)
    add("Footwork / Juke", foot, f"{bpm:.0f} BPM, syncopation {sync:.0%}")
    add("House", (0.5 if 115 <= bpm <= 132 else 0.0) + 0.5 * ff, f"four-on-floor {ff:.0%}")
    add("Techno", (0.4 if 125 <= bpm <= 150 else 0.0) + 0.5 * ff, f"four-on-floor {ff:.0%}")
    add("Jungle / DnB", (0.5 if 160 <= bpm <= 182 else 0.0) + 0.3 * min(1, sync * 1.5) + 0.2 * min(1, hats / 12),
        f"{bpm:.0f} BPM, busy hats")
    add("Hip-Hop", (0.5 if 70 <= bpm <= 100 else 0.0) + 0.3 * c["snare_on_backbeat"], "slow tempo, backbeat")
    add("Breakbeat", (0.4 if 110 <= bpm <= 140 else 0.0) + 0.4 * min(1, sync * 1.5), "syncopated mid tempo")
    return sorted(cand, key=lambda d: -d["score"])[:3]
