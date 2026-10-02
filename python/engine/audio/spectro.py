"""STFT helpers (numpy/scipy only)."""
from __future__ import annotations

import numpy as np
from scipy.signal import stft

SR = 22050
N_FFT = 1024
HOP = 128


def magnitude(y: np.ndarray, sr: int = SR, n_fft: int = N_FFT, hop: int = HOP) -> np.ndarray:
    """Magnitude spectrogram, shape (frames, bins)."""
    _, _, Z = stft(y, fs=sr, nperseg=n_fft, noverlap=n_fft - hop, window="hann",
                   boundary="even", padded=True)
    return np.abs(Z).T.astype(np.float32)


def band_slice(lo: float, hi: float, sr: int = SR, n_fft: int = N_FFT) -> slice:
    f = sr / n_fft
    return slice(max(1, int(lo / f)), max(2, int(hi / f)))


def frame_times(n: int, sr: int = SR, hop: int = HOP) -> np.ndarray:
    return np.arange(n) * hop / sr
