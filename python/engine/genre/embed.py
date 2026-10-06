"""Run the Genre Pack on a track: per-patch (~1 s) embeddings + Discogs style activations, cached per file hash."""
from __future__ import annotations

import json
import threading
import time
from pathlib import Path

import numpy as np

from engine.audio import decode
from engine.genre import effnet_onnx, pack

SR = effnet_onnx.SR
HOP_SEC = effnet_onnx.PATCH_HOP * effnet_onnx.HOP / SR        # 0.992 s between patches
MAX_SECONDS = 900.0
EMBED_VERSION = "1"

_lock = threading.Lock()
_state: dict = {}


class PackMissing(RuntimeError):
    pass


def _load():
    with _lock:
        if _state:
            return _state
        if not pack.status()["installed"]:
            raise PackMissing("Genre Pack is not installed (Settings → Genre Pack)")
        d = pack.pack_dir()
        meta = json.loads((d / "discogs-effnet-bsdynamic-1.json").read_text())
        _state.update(model=effnet_onnx.EffnetOnnx(str(d / "discogs-effnet-bsdynamic-1.onnx")), classes=meta["classes"])
        return _state


def classes() -> list[str]:
    return _load()["classes"]


def embed_audio(y16k: np.ndarray) -> dict:
    m = _load()
    t = time.time()
    emb, act = m["model"].run(y16k[: int(MAX_SECONDS * SR)])
    if not len(emb):
        raise ValueError("audio too short for the genre model (need ≥ ~3 s)")
    return {"embeddings": emb, "activations": act, "seconds": time.time() - t, "hop": HOP_SEC}


def embed_file(path: str, audio_hash: str | None = None, cache_dir: str | Path | None = None) -> dict:
    """Decode to 16 kHz mono, embed, and cache `<cache>/embed/<hash>-v1.npz` (fp16 embeddings, fp16 activations)."""
    f = None
    if cache_dir and audio_hash:
        f = Path(cache_dir) / "embed" / f"{audio_hash}-v{EMBED_VERSION}.npz"
        if f.exists():
            z = np.load(f)
            return {"embeddings": z["emb"].astype(np.float32), "activations": z["act"].astype(np.float32), "seconds": 0.0, "hop": HOP_SEC, "cached": True}
    y = decode.decode(path, SR, mono=True)
    r = embed_audio(y)
    if f is not None:
        f.parent.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(f, emb=r["embeddings"].astype(np.float16), act=r["activations"].astype(np.float16))
    return r
