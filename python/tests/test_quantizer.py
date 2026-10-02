import pytest
from translator.quantizer import quantize_time, step_to_time
from engine.tempo.tempo import normalize_bpm

BPM = 160.0
STEP = 60 / BPM / 4


def test_synthetic_kick_steps_recovered():
    wanted = [1, 4, 7, 11, 16]            # 1-based, as shown to the user
    for s in wanted:
        t = 0.5 + (s - 1) * STEP + 0.004  # 4 ms human jitter
        q = quantize_time(t, BPM, 0.5)
        assert q.bar == 0 and q.step == s - 1
        assert abs(q.timing_offset - 0.004) < 1e-9


def test_offset_sign_and_original_preserved():
    t = 0.5 + 10 * STEP - 0.018
    q = quantize_time(t, BPM, 0.5)
    assert q.step == 10 and q.timing_offset == pytest.approx(-0.018)
    assert q.quantized_time == pytest.approx(0.5 + 10 * STEP)


def test_bar_rollover_and_resolutions():
    t = step_to_time(2, 5, BPM, 0.0)
    q = quantize_time(t, BPM, 0.0)
    assert (q.bar, q.step) == (2, 5)
    assert quantize_time(0.0 + 60 / BPM, BPM, 0.0, resolution=4).step == 1
    assert quantize_time(0.0 + 60 / BPM, BPM, 0.0, resolution=32).step == 8
    with pytest.raises(ValueError):
        quantize_time(1, BPM, 0, resolution=12)


def test_bpm_normalization():
    assert normalize_bpm(80) == 80 and normalize_bpm(40) == 80
    assert normalize_bpm(320) == 160 and normalize_bpm(174) == 174
    with pytest.raises(ValueError):
        normalize_bpm(0)
