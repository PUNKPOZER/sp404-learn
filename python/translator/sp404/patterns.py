"""Reduce a transcribed track to a few playable 1-bar SP-404 patterns."""
from __future__ import annotations

from collections import defaultdict

from engine.model import DrumEvent, Section

VOICES = ["KICK", "SNARE", "CLAP", "CLOSED_HAT", "OPEN_HAT", "PERCUSSION"]


def consensus_bar(events: list[DrumEvent], bars: list[int], min_conf: float = 0.3,
                  presence: float = 0.4, resolution: int = 16) -> dict[str, list[int]]:
    """Per voice: steps (1-based) present in >= ``presence`` of the given bars."""
    if not bars:
        return {v: [] for v in VOICES}
    count: dict[str, dict[int, int]] = {v: defaultdict(int) for v in VOICES}
    bar_set = set(bars)
    seen: set[tuple[int, str, int]] = set()
    for e in events:
        if e.bar in bar_set and e.type in count and e.confidence >= min_conf:
            s16 = e.step * 16 // resolution          # fold any grid resolution onto the 16-step bar
            k = (e.bar, e.type, s16)
            if k not in seen:
                seen.add(k)
                count[e.type][s16] += 1
    need = max(1, round(presence * len(bars)))
    return {v: sorted(s + 1 for s, c in count[v].items() if c >= need and s < 16)
            for v in VOICES}


def build_patterns(events: list[DrumEvent], sections: list[Section], n_bars: int,
                   max_patterns: int = 4, resolution: int = 16) -> tuple[list[dict], list[dict]]:
    """Returns (patterns, arrangement). Patterns A..D come from section similarity clusters."""
    names = "ABCD"
    if not sections:
        sections = [Section("SECTION A", 0.0, 0.0, 0, max(1, n_bars), "A")]
    clusters: dict[str, list[Section]] = defaultdict(list)
    for s in sections:
        clusters[s.cluster].append(s)
    order = sorted(clusters, key=lambda c: min(s.start_bar for s in clusters[c]))[:max_patterns]
    patterns, cmap = [], {}
    for i, c in enumerate(order):
        bars = [b for s in clusters[c] for b in range(s.start_bar, s.end_bar)]
        steps = consensus_bar(events, bars, resolution=resolution)
        patterns.append({"name": names[i], "bars": 1, "steps": steps,
                         "source_bars": len(bars), "label": clusters[c][0].label})
        cmap[c] = names[i]
    arrangement = [{"label": s.label, "start": s.start, "end": s.end,
                    "start_bar": s.start_bar, "end_bar": s.end_bar,
                    "pattern": cmap.get(s.cluster, "A")} for s in sections]
    return patterns, arrangement


def fill_from_last_bar(events: list[DrumEvent], section: Section, base: dict[str, list[int]]) -> dict[str, list[int]] | None:
    """Last bar of a section if it differs enough from the base pattern → fill suggestion."""
    if section.end_bar - section.start_bar < 2:
        return None
    last = consensus_bar(events, [section.end_bar - 1], presence=1.0)
    diff = sum(len(set(last[v]) ^ set(base.get(v, []))) for v in VOICES)
    return last if diff >= 4 else None
