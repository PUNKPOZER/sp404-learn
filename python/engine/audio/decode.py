"""Audio decoding via FFmpeg. The original file is never modified."""
from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

import numpy as np

SUPPORTED = {".wav", ".aif", ".aiff", ".mp3", ".flac", ".m4a"}


class AudioError(RuntimeError):
    pass


def find_tool(name: str) -> str:
    p = shutil.which(name)
    if p:
        return p
    for base in ("/opt/homebrew/bin", "/usr/local/bin", "/usr/bin"):
        cand = Path(base) / name
        if cand.exists():
            return str(cand)
    raise AudioError(f"{name} not found. Install FFmpeg (e.g. `brew install ffmpeg`).")


@dataclass
class AudioInfo:
    duration: float
    sample_rate: int
    channels: int


def _wav_fallback(path: str):
    """PCM WAV can be read without FFmpeg (scipy); everything else needs FFmpeg."""
    from scipy.io import wavfile
    sr, data = wavfile.read(path)
    if data.dtype.kind == "i":
        data = data.astype(np.float32) / float(np.iinfo(data.dtype).max)
    elif data.dtype.kind == "u":
        data = (data.astype(np.float32) - 128.0) / 128.0
    else:
        data = data.astype(np.float32)
    return sr, (data if data.ndim == 2 else data[:, None])


def _have(name: str) -> bool:
    try:
        find_tool(name)
        return True
    except AudioError:
        return False


def probe(path: str) -> AudioInfo:
    if not _have("ffprobe"):
        if path.lower().endswith(".wav"):
            sr, d = _wav_fallback(path)
            return AudioInfo(len(d) / sr, sr, d.shape[1])
        raise AudioError("FFmpeg is required for this file type. Install it (e.g. `brew install ffmpeg`).")
    out = subprocess.run(
        [find_tool("ffprobe"), "-v", "error", "-select_streams", "a:0",
         "-show_entries", "stream=sample_rate,channels:format=duration",
         "-of", "json", path],
        capture_output=True, text=True)
    if out.returncode != 0:
        raise AudioError(out.stderr.strip() or "ffprobe failed")
    j = json.loads(out.stdout)
    if not j.get("streams"):
        raise AudioError("No audio stream found")
    s = j["streams"][0]
    return AudioInfo(float(j["format"]["duration"]), int(s["sample_rate"]), int(s["channels"]))


def decode(path: str, sr: int = 22050, mono: bool = True) -> np.ndarray:
    """Decode to float32 PCM at a predictable sample rate. Shape (n,) or (2, n)."""
    ch = 1 if mono else 2
    if not _have("ffmpeg"):
        if path.lower().endswith(".wav"):
            from scipy.signal import resample_poly
            from math import gcd
            src, d = _wav_fallback(path)
            d = d.mean(axis=1) if mono else d.T
            if src != sr:
                g = gcd(src, sr)
                d = resample_poly(d, sr // g, src // g, axis=-1)
            return np.ascontiguousarray(d, dtype=np.float32)
        raise AudioError("FFmpeg is required for this file type. Install it (e.g. `brew install ffmpeg`).")
    p = subprocess.run(
        [find_tool("ffmpeg"), "-v", "error", "-i", path, "-vn", "-ac", str(ch), "-ar", str(sr),
         "-f", "f32le", "-"], capture_output=True)
    if p.returncode != 0:
        raise AudioError(p.stderr.decode(errors="replace").strip() or "ffmpeg failed")
    a = np.frombuffer(p.stdout, dtype=np.float32)
    return a if mono else a.reshape(-1, 2).T.copy()


def file_hash(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()[:32]


def peaks(y: np.ndarray, n: int = 2000) -> list[list[float]]:
    """Min/max envelope for waveform drawing: n buckets of [min, max]."""
    if len(y) == 0:
        return []
    edges = np.linspace(0, len(y), n + 1).astype(int)
    out = []
    for a, b in zip(edges[:-1], edges[1:]):
        seg = y[a:max(b, a + 1)]
        out.append([round(float(seg.min()), 4), round(float(seg.max()), 4)])
    return out
