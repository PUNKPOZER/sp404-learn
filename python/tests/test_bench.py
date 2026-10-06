"""Tests for the private benchmark harness (metrics + manifest parsing). No audio involved."""
import json

import pytest

from bench import manifest, metrics, taxonomy
from bench.run import score, summarize


def test_taxonomy_aliases_and_families():
    assert taxonomy.normalize("Jungle / DnB") == ["jungle", "drum_and_bass"]
    assert taxonomy.normalize("Хип-хоп") == ["hip_hop"]
    assert taxonomy.normalize("UK Garage") == ["uk_garage"] and taxonomy.normalize("nonsense") == []
    assert taxonomy.family("jungle") == taxonomy.family("drum_and_bass") == "uk_breaks"
    assert taxonomy.family("footwork") != taxonomy.family("house")


def test_manifest_both_spellings_and_validation(tmp_path):
    m = tmp_path / "m.json"
    m.write_text(json.dumps({"tracks": [
        {"path": "a.wav", "expected": ["jungle", "drum_and_bass"]},
        {"track": "/abs/b.wav", "expected": {"genre": "house", "bpm": 124, "meter": "4/4", "key": "F# minor"}},
        {"path": "c.wav", "expected": {"bpm": [168, 172]}},
    ]}))
    es = manifest.load(m)
    assert es[0].path == str(tmp_path / "a.wav") and es[0].truth.genre == ["jungle", "drum_and_bass"]
    assert es[1].truth.bpm == (124.0, 124.0) and es[1].truth.key == "F# minor" and es[1].path == "/abs/b.wav"
    assert es[2].truth.genre == [] and es[2].truth.bpm == (168.0, 172.0)
    m.write_text(json.dumps([{"path": "x", "expected": ["not-a-genre"]}]))
    with pytest.raises(manifest.ManifestError):
        manifest.load(m)


def test_genre_scores_top1_top3_family_and_confusion():
    preds = [
        {"candidates": [{"genre": "Jungle / DnB", "confidence": .7}, {"genre": "Breakbeat", "confidence": .2}]},   # expected jungle -> ok
        {"candidates": [{"genre": "House", "confidence": .4}, {"genre": "Techno", "confidence": .35}]},            # expected techno -> top3 only
        {"candidates": [{"genre": "breakbeat", "confidence": .9}]},                                                 # expected jungle: wrong, same family
        {"candidates": [{"genre": "hip_hop", "confidence": .8}]},                                                   # expected ambient: wrong
    ]
    truth = [["jungle"], ["techno"], ["jungle", "drum_and_bass"], ["ambient"]]
    r = metrics.genre_scores(preds, truth)
    assert r["n"] == 4 and r["top1"] == 0.25 and r["top3"] == 0.5 and r["family"] == 0.5
    assert r["per_genre"]["jungle"] == {"correct": 1, "total": 2, "accuracy": 0.5}
    assert r["confusion"]["techno"] == {"house": 1} and r["confusion"]["ambient"] == {"hip_hop": 1}
    assert {c["index"] for c in r["low_confidence"]} == {1, 2, 3}


def test_bpm_scores_octave_tolerance():
    assert metrics.bpm_scores(170, (168, 172)) == {"acc1": True, "acc2": True, "octave_error": None}
    r = metrics.bpm_scores(85, (168, 172))
    assert not r["acc1"] and r["acc2"] and r["octave_error"] == "double"
    assert metrics.bpm_scores(120, (168, 172))["acc2"] is False


def test_beat_key_drum_boundary_metrics():
    assert metrics.beat_fmeasure([0.5, 1.0, 1.5], [0.5, 1.0, 1.5])["f"] == 1.0
    assert metrics.beat_fmeasure([0.6, 1.1], [0.5, 1.0])["f"] == 0.0           # 100 ms off, window is 70 ms
    assert metrics.key_score("F# minor", "F# minor")["score"] == 1.0
    assert metrics.key_score("A major", "F# minor")["kind"] == "relative"
    assert metrics.key_score("C# minor", "F# minor")["kind"] == "fifth"
    assert metrics.key_score("F# major", "F# minor")["kind"] == "parallel"
    d = metrics.drum_prf([{"time": 1.0, "type": "KICK"}, {"time": 2.0, "type": "KICK"}], [{"time": 1.01, "type": "KICK"}, {"time": 3.0, "type": "KICK"}])
    assert d["KICK"]["precision"] == 0.5 and d["KICK"]["recall"] == 0.5
    b = metrics.boundary_errors([24.5, 60.0], [24.0, 48.0, 61.0])
    assert b["hit_rate"] == pytest.approx(2 / 3) and b["median_error"] == 1.0


def test_score_and_summarize_use_only_available_truth(tmp_path):
    e1 = manifest.parse_entry({"path": "a.wav", "expected": {"genre": ["jungle"], "bpm": [168, 172]}})
    e2 = manifest.parse_entry({"path": "b.wav", "expected": ["house"]})
    r1 = {"bpm": 85.0, "genre": {"candidates": [{"genre": "Jungle / DnB", "confidence": .6}]}, "seconds": 3.0}
    r2 = {"bpm": 124.0, "genre": {"candidates": [{"genre": "Techno", "confidence": .5}]}, "seconds": 5.0}
    r1["scores"], r2["scores"] = score(e1, r1), score(e2, r2)
    assert set(r1["scores"]) == {"bpm"} and r2["scores"] == {}
    s = summarize([e1, e2], [r1, r2])
    assert s["genre"]["top1"] == 0.5 and s["bpm"]["acc1"] == 0.0 and s["bpm"]["acc2"] == 1.0 and s["seconds"]["max"] == 5.0
