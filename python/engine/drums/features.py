"""Per-onset spectral/temporal features used by classifiers."""
from __future__ import annotations

import numpy as np

from engine.audio import spectro

EDGES = [35, 100, 200, 400, 800, 1600, 3200, 6000, 10500]


def band_energies(S: np.ndarray, frame: int, sr: int = spectro.SR) -> np.ndarray:
    """Distribution of *new* energy at the onset (post minus what was already ringing),
    so a kick tail under a hat does not make the hat look like a kick."""
    pre = S[max(0, frame - 4):max(1, frame - 1)].max(axis=0) if frame > 1 else np.zeros(S.shape[1])
    post = S[frame:frame + 5].max(axis=0)
    new = np.maximum(0.0, post - pre) ** 2
    out = [new[spectro.band_slice(lo, hi, sr)].sum() for lo, hi in zip(EDGES[:-1], EDGES[1:])]
    e = np.array(out) + 1e-12
    return e / e.sum()


def extract(S: np.ndarray, frame: int, sr: int = spectro.SR) -> dict[str, float]:
    fps = sr / spectro.HOP
    n = len(S)
    a, b = max(0, frame - 1), min(n, frame + int(0.06 * fps))
    e = band_energies(S, frame, sr)
    freqs = np.linspace(0, sr / 2, S.shape[1])
    mag = S[a:b].mean(axis=0) + 1e-9
    centroid = float((freqs * mag).sum() / mag.sum())
    flat = float(np.exp(np.log(mag[3:]).mean()) / mag[3:].mean())

    def decay(lo, hi, floor_db=-10.0):
        """Seconds until the band envelope drops 10 dB below its peak, or until another hit
        interrupts it (envelope rising again)."""
        sl = spectro.band_slice(lo, hi, sr)
        env = S[frame: min(n, frame + int(0.45 * fps)), sl].sum(axis=1)
        if len(env) < 3 or env.max() <= 0:
            return 0.0
        k = int(env.argmax())
        env = env[k:] / env[k]
        run_min = 1.0
        for i, v in enumerate(env):
            if v < 10 ** (floor_db / 20):
                return float(i / fps)
            if v > run_min * 1.6 and i > 2:       # cut short by the next hit: can't call it "open"
                return float(min(i / fps, 0.06))
            run_min = min(run_min, v)
        return float(len(env) / fps)

    # roughness: number of separate amplitude bumps in first 40 ms of the 900-4500 Hz band
    sl = spectro.band_slice(900, 4500, sr)
    env = S[frame: min(n, frame + int(0.04 * fps)), sl].sum(axis=1)
    bumps = 0
    if len(env) > 4:
        d = np.diff(env)
        bumps = int(((d[:-1] > 0) & (d[1:] <= 0) & (env[1:-1] > 0.35 * env.max())).sum())
    return {
        "sub": float(e[0]), "low": float(e[1]), "lowmid": float(e[2]), "mid": float(e[3]),
        "himid": float(e[4]), "upper": float(e[5]), "high": float(e[6]), "air": float(e[7]),
        "centroid": centroid, "flatness": flat,
        "decay_high": decay(6000, 10500), "decay_mid": decay(160, 1400), "bumps": float(bumps),
    }
