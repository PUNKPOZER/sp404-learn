"""Beat-relative quantizer. Original timing is always preserved alongside the grid position."""
from __future__ import annotations

from dataclasses import dataclass

VALID_RESOLUTIONS = (4, 8, 16, 32)   # steps per bar (1/4 .. 1/32 notes in 4/4)


@dataclass
class Quantized:
    bar: int
    step: int               # 0-based within bar at the *requested* resolution
    quantized_time: float
    timing_offset: float    # original - quantized, seconds


def quantize_time(t: float, bpm: float, origin: float, resolution: int = 16,
                  beats_per_bar: int = 4) -> Quantized:
    if resolution not in VALID_RESOLUTIONS:
        raise ValueError(f"resolution must be one of {VALID_RESOLUTIONS}")
    if bpm <= 0:
        raise ValueError("bpm must be positive")
    bar_dur = 60.0 / bpm * beats_per_bar
    step_dur = bar_dur / resolution
    n = round((t - origin) / step_dur)
    qt = origin + n * step_dur
    return Quantized(bar=n // resolution, step=n % resolution, quantized_time=qt,
                     timing_offset=t - qt)


def step_to_time(bar: int, step: int, bpm: float, origin: float, resolution: int = 16,
                 beats_per_bar: int = 4) -> float:
    return origin + (bar * resolution + step) * (60.0 / bpm * beats_per_bar / resolution)
