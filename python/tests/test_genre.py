"""Genre Engine 2.0 pieces that do not need the model, plus pack-dependent checks that skip when the pack is absent."""
import json
import math

import numpy as np
import pytest

from engine.genre import aggregate, effnet_onnx, evidence, fusion, pack

HAVE_PACK = pack.status()["installed"]


def test_mapping_is_wellformed_and_classes_exist_in_the_400():
    m = aggregate.load_mapping()
    assert {"footwork", "jungle", "drum_and_bass", "breakbeat", "uk_garage", "house", "techno", "hip_hop", "ambient"} <= set(m)
    for g, spec in m.items():
        assert spec["classes"], g
        assert all("---" in c for c in spec["classes"]), g
    if pack.files_present():
        classes = json.loads((pack.pack_dir() / "discogs-effnet-bsdynamic-1.json").read_text())["classes"]
        for g, spec in m.items():
            missing = [c for c in spec["classes"] if c not in classes]
            assert not missing, (g, missing)
            for h, cl in spec.get("hints", {}).items():
                assert all(c in classes for c in cl), (g, h)


def test_aggregate_takes_the_max_over_a_labels_classes():
    classes = ["Electronic---Juke", "Electronic---Ghetto", "Electronic---House", "Electronic---Jungle"] + [f"x---{i}" for i in range(396)]
    a = np.zeros((3, 400), np.float32)
    a[:, 0], a[:, 1], a[:, 2] = 0.6, 0.2, 0.1
    r = aggregate.aggregate(a, classes)
    assert r["labels"]["footwork"] == pytest.approx(0.6) and r["labels"]["house"] == pytest.approx(0.1) and r["labels"]["jungle"] == 0.0
    assert r["hints"]["juke"] == pytest.approx(0.6)


def test_mel_frontend_shapes_and_patching():
    y = np.random.default_rng(0).standard_normal(16000 * 5).astype(np.float32) * 0.1
    mel = effnet_onnx.log_mel(y)
    assert mel.shape[1] == 96 and mel.shape[0] == 1 + 16000 * 5 // 256 + 1 - 1 or abs(mel.shape[0] - 5 * 62.5) < 3
    p = effnet_onnx.patches(mel)
    assert p.shape[1:] == (128, 96) and len(p) == (mel.shape[0] - 128) // 62 + 1
    assert effnet_onnx.patches(mel[:100]).shape[0] == 0           # shorter than one patch → no patches, like Essentia


def test_tempo_likelihood_is_soft_and_octave_aware():
    rd = evidence.readings(80.0, [160.0])                        # engine says 80 but 160 is a candidate
    assert evidence.tempo_likelihood("footwork", rd) > evidence.tempo_likelihood("house", rd)
    assert evidence.tempo_likelihood("footwork", evidence.readings(160, [])) > 0.95
    for g in evidence.TEMPO_MODES:                                # floor: nothing is ever impossible
        assert evidence.tempo_likelihood(g, evidence.readings(37.0, [])) >= evidence.FLOOR - 1e-9


def _cfg(**kw):
    return {**fusion.load_config(), **kw}


def test_fusion_model_dominates_a_single_weak_heuristic():
    model = {"jungle": 0.7, "drum_and_bass": 0.15, "breakbeat": 0.08, "house": 0.02, "footwork": 0.05}
    p = fusion.fuse(model, 128.0, [64.0, 256.0], {"four_on_floor": 0.9, "syncopation": 0.1, "hat_density": 6}, cfg=_cfg())
    assert p["candidates"][0]["genre"] == "jungle"             # house-like tempo/pattern alone cannot flip a strong model prediction


def test_fusion_rhythm_breaks_a_model_tie():
    model = {"footwork": 0.40, "jungle": 0.40, "drum_and_bass": 0.1, "breakbeat": 0.1}
    f = fusion.fuse(model, 160.0, [80.0], {}, cfg=_cfg(use_pattern=False))
    d = fusion.fuse(model, 174.0, [87.0], {}, cfg=_cfg(use_pattern=False))
    assert f["candidates"][0]["genre"] == "footwork" and d["candidates"][0]["genre"] in ("drum_and_bass", "jungle")


def test_fusion_without_model_is_capped_and_never_confident():
    p = fusion.fuse(None, 160.0, [80.0], {"four_on_floor": 0.1, "syncopation": 0.5}, cfg=_cfg())
    assert p["primaryConfidence"] <= _cfg()["rhythm_only_confidence_cap"] + 1e-9 and p["status"] != "confident"
    assert p["sources"] == {"model": False, "rhythm": True}


def test_fusion_reports_hybrid_and_unknown_instead_of_guessing():
    tie = fusion.fuse({"breakbeat": 0.34, "uk_garage": 0.33, "jungle": 0.33}, 135.0, [], {}, cfg=_cfg(w_rhythm=0.0))
    assert tie["status"] in ("hybrid", "unknown") and len(tie["candidates"]) >= 3
    flat = fusion.fuse({g: 0.1 for g in evidence.TEMPO_MODES}, None, None, None, cfg=_cfg())
    assert flat["status"] == "unknown" and flat["primaryGenre"] == "unknown"
    assert math.isclose(sum(c["confidence"] for c in fusion.fuse({"house": 0.5, "techno": 0.5}, 128, [], {}, cfg=_cfg())["candidates"]), 1.0, abs_tol=0.5)


def test_pack_status_shape_and_licence_is_stated():
    s = pack.status()
    assert s["sizeMb"] == 18 and "CC BY-NC-SA" in s["license"] and s["sources"][0].startswith("https://essentia.upf.edu/")
    assert set(pack.FILES) == {"discogs-effnet-bsdynamic-1.onnx", "discogs-effnet-bsdynamic-1.json"}


def test_corrections_are_appended_not_overwritten(tmp_path, monkeypatch):
    from engine.genre import corrections
    monkeypatch.setenv("SP404LEARN_CORRECTIONS", str(tmp_path / "g.jsonl"))
    corrections.record("abc", {"primaryGenre": "jungle"}, "drum_and_bass")
    corrections.record("abc", {"primaryGenre": "jungle"}, None)
    rows = [json.loads(l) for l in (tmp_path / "g.jsonl").read_text().splitlines()]
    assert len(rows) == 2 and rows[0]["raw"]["primaryGenre"] == "jungle" and rows[0]["user"] == "drum_and_bass" and rows[1]["user"] is None


def test_bpm_corrections_go_to_their_own_file_and_survive_the_model(tmp_path, monkeypatch):
    from engine.genre import corrections
    monkeypatch.setenv("SP404LEARN_CORRECTIONS", str(tmp_path / "g.jsonl"))
    corrections.record("abc", 87.0, 174.0, kind="bpm")
    row = json.loads((tmp_path / "bpm.jsonl").read_text())
    assert row["kind"] == "bpm" and row["raw"] == 87.0 and row["user"] == 174.0 and not (tmp_path / "g.jsonl").exists()
    from engine.model import Grid, TrackAnalysis
    a = TrackAnalysis(path="/x/a.wav", filename="a.wav", duration=6.0, sample_rate=44100, channels=2, audio_hash="abc",
                      grid=Grid(bpm=174, origin=0.0, confidence=.9), corrections={"bpm": {"raw": 87, "user": 174}})
    assert TrackAnalysis.from_dict(a.to_dict()).corrections["bpm"] == {"raw": 87, "user": 174}


@pytest.mark.skipif(not HAVE_PACK, reason="Genre Pack not installed")
def test_embedding_runs_and_predict_degrades_gracefully(tmp_path):
    from engine.genre import embed, predict
    y = np.random.default_rng(1).standard_normal(16000 * 8).astype(np.float32) * 0.05
    r = embed.embed_audio(y)
    assert r["embeddings"].shape[1] == 1280 and r["activations"].shape[1] == 400 and len(r["embeddings"]) >= 5
    assert float(r["activations"].min()) >= 0.0 and float(r["activations"].max()) <= 1.0     # sigmoid activations
    out = predict.predict({"path": "/nonexistent.wav", "audio_hash": "none", "grid": {"bpm": 120, "candidates": []}, "characteristics": {}}, str(tmp_path))
    assert out["available"] and "error" in out                 # audio missing and no cached embedding → a reported error, not a crash
