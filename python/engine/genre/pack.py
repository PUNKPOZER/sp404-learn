"""The optional **Genre Pack**: Discogs-EffNet (ONNX), ~18 MB, from the MTG's own server.

Licence: Essentia Models are CC BY-NC-SA 4.0 (non-commercial; a proprietary licence is available from MTG-UPF) — shown to the
user before download and never bundled in the app. Downloaded only on the user's explicit request, verified by SHA-256.
(The owner approved this pack on 2026-10-06; see GENRE_MODEL_RESEARCH.md decision D1.)"""
from __future__ import annotations

import hashlib
import os
import ssl
import urllib.request
from pathlib import Path
from typing import Callable

from engine.stems.demucs_sep import models_dir

PACK_ID = "discogs-effnet-bsdynamic-1"
LICENSE = "CC BY-NC-SA 4.0 (non-commercial; MTG-UPF, https://essentia.upf.edu/models.html)"
BASE_URLS = [
    "https://essentia.upf.edu/models/feature-extractors/discogs-effnet/",
    "https://github.com/PUNKPOZER/noesis/releases/download/models-v1/",   # the owner's mirror of the same files
]
FILES = {   # name -> sha256 (checked against the MTG files by the owner's `noesis` project; verified again on download)
    "discogs-effnet-bsdynamic-1.onnx": "a280825b334797cf677939db8cd5762c0392aedd0ca6415dbc1cd083f045e43c",
    "discogs-effnet-bsdynamic-1.json": "a2e85b2e7372d5f8e0f35bdd6aeae1139f101087d183d0b2fb60b0ea0f01a0ff",
}
SIZE_MB = 18


def pack_dir() -> Path:
    p = Path(os.environ.get("SP404LEARN_GENRE_PACK") or models_dir() / "genre-pack")
    p.mkdir(parents=True, exist_ok=True)
    return p


def _sha(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for c in iter(lambda: f.read(1 << 20), b""):
            h.update(c)
    return h.hexdigest()


def runtime_present() -> bool:
    import importlib.util
    return importlib.util.find_spec("onnxruntime") is not None


def files_present() -> bool:
    d = pack_dir()
    return all((d / n).exists() for n in FILES)


def status() -> dict:
    rt, have = runtime_present(), files_present()
    return {"id": PACK_ID, "runtime": rt, "installed": bool(rt and have), "filesPresent": have, "sizeMb": SIZE_MB, "license": LICENSE,
            "path": str(pack_dir()), "sources": BASE_URLS}


def download(progress: Callable[[float], None] | None = None) -> dict:
    """Fetch + verify the pack (user-initiated). Tries the MTG server first, then the mirror. Raises on checksum mismatch."""
    try:
        import certifi
        ctx = ssl.create_default_context(cafile=certifi.where())
    except Exception:
        ctx = ssl.create_default_context()
    d = pack_dir()
    names = list(FILES)
    for k, name in enumerate(names):
        dest = d / name
        if dest.exists() and _sha(dest) == FILES[name]:
            continue
        errors = []
        for base in BASE_URLS:
            tmp = dest.with_suffix(dest.suffix + ".part")
            try:
                with urllib.request.urlopen(base + name, context=ctx, timeout=60) as r, open(tmp, "wb") as f:
                    total = int(r.headers.get("Content-Length") or 0)
                    got = 0
                    while chunk := r.read(1 << 20):
                        f.write(chunk)
                        got += len(chunk)
                        if progress and total:
                            progress((k + got / total) / len(names))
                if _sha(tmp) != FILES[name]:
                    raise RuntimeError("checksum mismatch")
                tmp.replace(dest)
                break
            except Exception as e:  # try the next source
                tmp.unlink(missing_ok=True)
                errors.append(f"{base}: {e}")
        else:
            raise RuntimeError(f"could not download {name}: " + " | ".join(errors))
    if progress:
        progress(1.0)
    return status()
