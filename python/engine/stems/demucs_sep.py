"""HT-Demucs (MIT code; weights published by Meta under MIT) via PyTorch.

Weights are NOT bundled: the user downloads them explicitly (``download_model``) into the model
directory. Runs on Apple MPS / CUDA when present, otherwise CPU."""
from __future__ import annotations

import os
import ssl
from pathlib import Path

import numpy as np

from engine.stems.base import StemResult, Progress

MODEL_NAME = "htdemucs"
MODEL_URL_HOST = "dl.fbaipublicfiles.com"
MODEL_SIZE_MB = 80


def models_dir() -> Path:
    p = Path(os.environ.get("SP404LEARN_MODELS") or Path.home() / ".sp404learn" / "models")
    p.mkdir(parents=True, exist_ok=True)
    return p


def _setup_env():
    os.environ.setdefault("TORCH_HOME", str(models_dir()))
    try:  # python.org builds ship without a CA bundle; use certifi's, never disable verification
        import certifi
        os.environ.setdefault("SSL_CERT_FILE", certifi.where())
        ssl._create_default_https_context = lambda: ssl.create_default_context(cafile=certifi.where())
    except Exception:
        pass


def weights_present() -> bool:
    return any((models_dir() / "hub" / "checkpoints").glob("955717e8-*.th")) if (models_dir() / "hub").exists() else False


def runtime_present() -> bool:
    import importlib.util
    return all(importlib.util.find_spec(m) for m in ("torch", "demucs"))


def device_name() -> str:
    import torch
    if torch.cuda.is_available():
        return "cuda"
    if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def download_model() -> None:
    _setup_env()
    from demucs.pretrained import get_model
    get_model(MODEL_NAME)


class DemucsSeparator:
    name = "htdemucs"

    def __init__(self):
        self._model = None

    def available(self) -> tuple[bool, str]:
        if not runtime_present():
            return False, "Среда разделения на стемы (PyTorch + Demucs) не установлена."
        if not weights_present():
            return False, "Модель стемов ещё не скачана (Настройки → Хранилище моделей → Скачать, ~80 МБ) — анализирую полный микс."
        return True, ""

    def _load(self):
        if self._model is None:
            _setup_env()
            from demucs.pretrained import get_model
            m = get_model(MODEL_NAME)
            m.eval()
            self._model = m
        return self._model

    def separate(self, audio: np.ndarray, sample_rate: int, progress: Progress | None = None) -> StemResult:
        import torch
        from demucs.apply import apply_model
        model = self._load()
        assert sample_rate == model.samplerate, "decode at the model sample rate"
        dev = device_name()
        x = torch.from_numpy(np.ascontiguousarray(audio, dtype=np.float32))
        ref = x.mean(0)
        x = (x - ref.mean()) / (ref.std() + 1e-8)

        inner = model.models[0] if hasattr(model, "models") else model
        seg_len = int(inner.segment * model.samplerate)
        total = x.shape[-1]

        def cb(d):
            if progress and d.get("state") == "end":
                progress(min(1.0, (d["segment_offset"] + seg_len) / total))

        with torch.no_grad():
            try:
                out = apply_model(model, x[None], device=dev, split=True, overlap=0.25, shifts=0, callback=cb)[0]
            except Exception:
                if dev == "cpu":
                    raise
                out = apply_model(model, x[None], device="cpu", split=True, overlap=0.25, shifts=0, callback=cb)[0]
        out = out * (ref.std() + 1e-8) + ref.mean()
        names = {"drums": "drums", "bass": "bass", "other": "lead", "vocals": "vocals"}
        stems = {names[s]: out[i].mean(0).cpu().numpy().astype(np.float32) for i, s in enumerate(model.sources)}
        return StemResult(stems=stems, sample_rate=sample_rate)
