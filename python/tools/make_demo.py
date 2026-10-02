"""Write a synthetic footwork-style demo WAV (our own synth — no copyrighted audio)."""
import sys
import numpy as np
from engine import synth

def main(out: str, bpm: float = 160.0):
    a = synth.render_pattern(synth.FOOTWORK_DEMO, bpm, bars=8, lead_in=0.4)
    brk = synth.render_pattern({"KICK": [1, 9], "CLOSED_HAT": [1, 5, 9, 13]}, bpm, bars=4, lead_in=0.0)
    b = synth.render_pattern({**synth.FOOTWORK_DEMO, "KICK": [1, 4, 7, 10, 12, 16]}, bpm, bars=8, lead_in=0.0)
    n = int(60 / bpm * 16 / 4 * 4 * 22050)  # keep bar-aligned joins (trim tails)
    bar = int(round(60 / bpm * 4 * 22050))
    def trim(y, bars, lead=0): return y[: lead + bar * bars]
    lead = int(0.4 * 22050)
    y = np.concatenate([trim(a, 8, lead), trim(brk, 4), trim(b, 8)])
    synth.write_wav(out, y / np.abs(y).max() * 0.9)

if __name__ == "__main__":
    main(sys.argv[1])
