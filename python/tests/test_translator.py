import json
from engine.model import DrumEvent, Grid, Section, TrackAnalysis
from translator.sp404 import pads, patterns
from translator.sp404.recipe import build_recipe, SP404Recipe
import pytest


def _analysis():
    ev = []
    i = 0
    for bar in range(4):
        for t, steps in {"KICK": [1, 4, 7, 11, 16], "SNARE": [8, 15], "CLAP": [5, 13],
                         "CLOSED_HAT": [1, 3, 5, 7, 9, 11, 13, 15]}.items():
            for s in steps:
                ev.append(DrumEvent(id=f"e{i}", time=bar * 1.5 + s * .09, type=t, confidence=0.9,
                                    velocity=.8, bar=bar, step=s - 1))
                i += 1
    return TrackAnalysis(path="/x/a.wav", filename="a.wav", duration=6.0, sample_rate=44100,
                         channels=2, audio_hash="abc", grid=Grid(bpm=160, origin=0.0, confidence=.9),
                         events=ev, sections=[Section("SECTION A", 0, 6, 0, 4, "A")])


def test_pad_layout_is_4x4_physical():
    assert pads.PAD_ROWS == [[13, 14, 15, 16], [9, 10, 11, 12], [5, 6, 7, 8], [1, 2, 3, 4]]
    assert sorted(p for r in pads.PAD_ROWS for p in r) == list(range(1, 17))
    assert pads.pad_for("KICK") == 1 and pads.pad_for("CLOSED_HAT") == 4 and pads.pad_for("PERCUSSION") == 6


def test_kit_validation():
    with pytest.raises(ValueError):
        pads.validate_kit({17: "KICK"})
    assert pads.normalize_kit({"2": "KICK"}) == {2: "KICK"}


def test_pattern_generation_consensus():
    a = _analysis()
    pats, arr = patterns.build_patterns(a.events, a.sections, a.n_bars)
    assert pats[0]["steps"]["KICK"] == [1, 4, 7, 11, 16]
    assert pats[0]["steps"]["SNARE"] == [8, 15] and pats[0]["steps"]["CLAP"] == [5, 13]
    assert arr[0]["pattern"] == "A"


def test_recipe_tutorial_mentions_pad_and_steps():
    r = build_recipe(_analysis())
    kick = [s for s in r.tutorial_steps if s["voice"] == "KICK" and s["highlight"]]
    assert kick and kick[0]["pad"] == 1 and kick[0]["highlight"] == [1, 4, 7, 11, 16]
    assert "1 / 4 / 7 / 11 / 16" in kick[0]["text"]
    assert all(s["total"] == len(r.tutorial_steps) for s in r.tutorial_steps)


def test_recipe_and_analysis_serialization_roundtrip():
    a = _analysis()
    a2 = TrackAnalysis.from_dict(json.loads(json.dumps(a.to_dict())))
    assert a2.to_dict() == a.to_dict()
    r = build_recipe(a)
    r2 = SP404Recipe.from_dict(json.loads(json.dumps(r.to_dict())))
    assert r2.to_dict() == r.to_dict()


def test_bass_notes_flow_into_pattern_and_tutorial():
    from engine.model import BassNote
    a = _analysis()
    for bar in range(4):
        for st, midi in ((0, 29), (6, 29), (11, 27)):
            a.bass.append(BassNote(time=bar * 1.5, duration=.2, midi=midi, confidence=.9, bar=bar, step=st))
    r = build_recipe(a)
    p = r.patterns[0]
    assert p["steps"]["BASS"] == [1, 7, 12] and p["notes"]["BASS"] == {"1": 29, "7": 29, "12": 27}
    bass = [s for s in r.tutorial_steps if s["voice"] == "BASS" and s["highlight"]]
    assert bass and bass[0]["pad"] == 7 and "F1: шаг 1 / 7" in bass[0]["text"] and "Eb1: шаг 12" in bass[0]["text"]


def test_user_added_bass_step_gets_default_note():
    from engine.model import BassNote
    a = _analysis()
    for bar in range(4):
        a.bass.append(BassNote(time=bar * 1.5, duration=.2, midi=27, confidence=.9, bar=bar, step=0))
    r = build_recipe(a, overrides={"A": {"KICK": [1], "BASS": [1, 9]}})
    assert r.patterns[0]["notes"]["BASS"] == {"1": 27, "9": 27}
