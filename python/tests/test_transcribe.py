import numpy as np
from engine import synth
from engine.audio import spectro
from engine.tempo import tempo
from engine.drums import transcribe

BPM = 160.0


def _analyse(pattern, bars=8, bpm=BPM, lead=0.37):
    y = synth.render_pattern(pattern, bpm, bars=bars, lead_in=lead)
    S = spectro.magnitude(y)
    g, env = tempo.estimate_grid(y, S)
    raw = transcribe.raw_events(S)
    g = tempo.refine_with_onsets(g, np.array([r[0] for r in raw if r[1] == "KICK"]))
    g = tempo.pick_downbeat(g, S)
    return g, raw, transcribe.to_events(raw, g)


def test_tempo_found_synthetic_footwork():
    g, *_ = _analyse(synth.FOOTWORK_DEMO)
    ratios = [g.bpm / BPM] + [c / BPM for c in g.candidates]
    assert abs(g.bpm - BPM) < 1.0 or min(abs(r - 1) for r in ratios) < 0.01


def test_kick_snare_clap_steps_recovered():
    g, raw, ev = _analyse(synth.FOOTWORK_DEMO)
    assert abs(g.bpm - BPM) < 1.0, g
    got = {}
    for e in ev:
        if e.bar == 2:
            got.setdefault(e.type, set()).add(e.step + 1)
    # grid origin may be rotated by a beat; compare as a rotation-invariant check
    def rot(s, k): return {((x - 1 + k) % 16) + 1 for x in s}
    want = {k: set(v) for k, v in synth.FOOTWORK_DEMO.items()}
    best = None
    for k in range(16):
        score = sum(len(rot(want["KICK"], k) & got.get("KICK", set())) for _ in [0])
        if best is None or score > best[0]:
            best = (score, k)
    k = best[1]
    assert k % 4 == 0   # grid is beat-aligned
    assert got.get("KICK", set()) == rot(want["KICK"], k)
    assert got.get("SNARE", set()) == rot(want["SNARE"], k)
    assert rot(want["CLAP"], k) <= got.get("CLAP", set()) | got.get("SNARE", set())
    assert len(got.get("CLOSED_HAT", set()) & rot(want["CLOSED_HAT"], k)) >= 4


def test_wav_decode_without_ffmpeg(tmp_path, monkeypatch):
    from engine.audio import decode
    wav = str(tmp_path / "t.wav")
    synth.write_wav(wav, synth.render_pattern(synth.FOOTWORK_DEMO, 160, bars=2))
    monkeypatch.setattr(decode, "find_tool", lambda n: (_ for _ in ()).throw(decode.AudioError("x")))
    y = decode.decode(wav, 22050)
    assert abs(len(y) / 22050 - decode.probe(wav).duration) < 0.01 and y.dtype == np.float32


def test_bass_notes_recovered():
    from engine.bass import pitch
    from engine.model import Grid
    notes = [(29, 1, 5), (29, 7, 3), (27, 12, 4)]     # F1, F1, Eb1
    y = synth.render_bass(notes, 160, bars=4, lead_in=0.5)
    got = pitch.analyze(y, Grid(bpm=160, origin=0.5))
    first_bar = [(n.midi, n.step + 1) for n in got if n.bar == 1]
    assert first_bar == [(29, 1), (29, 7), (27, 12)], first_bar
    assert all(n.confidence > 0.6 for n in got)
