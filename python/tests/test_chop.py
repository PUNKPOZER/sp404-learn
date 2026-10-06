import numpy as np
from scipy.io import wavfile
from engine.stems import chop

SR = 44100


def _bursts(starts, length=0.4, total=8.0):
    y = np.zeros(int(total * SR), dtype=np.float32)
    t = np.arange(int(length * SR)) / SR
    for s in starts:
        y[int(s * SR): int(s * SR) + len(t)] += 0.5 * np.sin(2 * np.pi * 440 * t) * np.exp(-t * 4)
    return y


def test_phrases_split_on_silence():
    y = np.concatenate([_bursts([0.1], 0.6, 1.0), np.zeros(SR), _bursts([0.1], 0.6, 1.0)])
    r = chop.plan_phrases(y, SR)
    assert len(r) == 2 and r[0][0] < 0.15 and 1.9 < r[1][0] < 2.2


def test_hits_one_region_per_stab():
    starts = [0.5, 1.5, 2.5, 3.5]
    r = chop.plan_hits(_bursts(starts, 0.4, 5.0), SR)
    assert len(r) == 4
    for (a, _), s in zip(r, starts):
        assert abs(a - s) < 0.03


def test_bars_skip_silent_and_align_to_grid():
    bpm, origin = 120.0, 0.5               # bar = 2 s
    y = _bursts([0.5 + 2 * 1.0, 0.5 + 2 * 3.0], 0.3, 12.0)   # sound only in bars 1 and 3 (0-based)
    r = chop.plan_bars(y, SR, bpm, origin, n_bars=1)
    assert [round(a, 2) for a, _ in r] == [2.5, 6.5]
    assert all(abs((b - a) - 2.0) < 1e-6 for a, b in r)


def test_whole_and_export_format(tmp_path):
    y = _bursts([0.2], 1.0, 2.0)
    regs = chop.plan(y, SR, "whole", 120, 0)
    assert regs == [(0.0, 2.0)]
    files = chop.export_regions(y, SR, regs, str(tmp_path), "Track: bass!")
    assert len(files) == 1 and files[0].endswith("Track_ bass_.wav")
    sr, d = wavfile.read(files[0])
    assert sr == 48000 and d.dtype == np.int16 and d.ndim == 1 and abs(len(d) / sr - 2.0) < 0.01
    many = chop.export_regions(y, SR, [(0, 0.5), (0.5, 1.0)], str(tmp_path / "m"), "v", normalize=True)
    assert [f.split("/")[-1] for f in many] == ["v_01.wav", "v_02.wav"]
    assert wavfile.read(many[0])[1].max() > 25000        # normalised near full scale


def test_torch_import_is_serialised_across_threads():
    """Regression: concurrent first-time torch imports from sidecar request threads must not race."""
    import threading
    from engine.stems import demucs_sep
    if not demucs_sep.runtime_present():
        return
    errs = []
    def work():
        try: demucs_sep.device_name()
        except Exception as e: errs.append(e)
    ts = [threading.Thread(target=work) for _ in range(4)]
    [t.start() for t in ts]; [t.join() for t in ts]
    assert not errs, errs
