"""SP SYSTEM interchange, LEARN side (Phase 2A). Uses REAL DROP-made fixtures plus attack archives built here."""
from __future__ import annotations

import hashlib
import io
import json
import os
import shutil
import struct
import zipfile
from pathlib import Path

import pytest

from engine.model import BassNote, DrumEvent, Grid, Section, TrackAnalysis
from engine.spsystem import Conflict, Project, SpError, adapters, fsio, open_bytes, open_path, zipio
from engine.spsystem.jsonio import stringify
from engine.spsystem import schemas

FX = Path(__file__).parent / "fixtures" / "spsystem"
DROP_CREATED, AFTER_LEARN_DROP = FX / "drop-created.spsystem", FX / "after-learn-and-drop.spsystem"
UUID = "6f1c2b9e-3a44-4d0a-9b1e-2c7d5a8f0e11"


def raw_entries(path) -> dict[str, tuple]:
    """name -> (crc, usize, csize, method, raw compressed bytes) straight from the archive."""
    res = open_path(str(path))
    src = res.package.src
    return {e.name: (e.crc, e.usize, e.csize, e.method, zipio.read_raw(src, e)) for e in res.package.entries}


def track(**kw) -> TrackAnalysis:
    ev = [DrumEvent(id=f"e{i}", time=i * 0.5, type="KICK" if i % 2 == 0 else "SNARE", confidence=0.8, velocity=0.7, bar=i // 8, step=i % 8) for i in range(6)]
    a = TrackAnalysis(path="/x/a.wav", filename="a.wav", duration=1.5, sample_rate=44100, channels=1, audio_hash="1c5fedc1feaceba165ad442ce24714f6",
                      grid=Grid(bpm=120.0, origin=0.02, confidence=0.7, candidates=[60.0, 240.0]), events=ev,
                      sections=[Section("INTRO", 0.0, 0.8, 0, 2), Section("DROP", 0.8, 1.5, 2, 4, "B", 0.7)],
                      bass=[BassNote(0.0, 0.25, 36, 0.6, 0, 0)], characteristics={"syncopation": 0.6, "vocal_activity": 0.2}, **kw)
    return a


# ----------------------------------------------------------------------------------------------------------- reading real DROP files
def test_reads_the_real_drop_fixtures():
    r = open_path(str(DROP_CREATED))
    assert r.level == "VALID" and r.manifest["id"] == UUID and r.manifest["revision"] == 1 and r.manifest["createdBy"] == "sp404-drop"
    assert [m for m, v in r.package.modules.items() if v.status == "ok"] == ["chops", "samples", "pads", "loops"]
    r2 = open_path(str(AFTER_LEARN_DROP))
    assert r2.level == "VALID_WITH_WARNINGS" and [i.code for i in r2.issues] == ["W_UNKNOWN_FILE"] and r2.manifest["revision"] == 3
    assert all(r2.package.modules[m].status == "ok" for m in ("analysis", "recipe", "progress", "requirements"))


def test_canonical_schemas_validate_the_spec_examples():
    root = Path(__file__).resolve().parents[2] / "sp-system-spec" / "examples"
    for pkg in root.iterdir():
        for rel, name in (("manifest.json", "manifest"), ("project/chops.json", "chops"), ("project/pads.json", "pads"), ("project/samples.json", "samples"),
                          ("project/loops.json", "loops"), ("analysis/track.json", "analysis"), ("learn/recipe.json", "recipe")):
            f = pkg / rel
            if f.exists():
                assert schemas.validate(name, json.loads(f.read_text())) == [], f


# ----------------------------------------------------------------------------------------------------------- the round trip
def test_learn_adds_analysis_recipe_progress_and_everything_survives(tmp_path):
    f = tmp_path / "p.spsystem"
    shutil.copy(DROP_CREATED, f)
    before = raw_entries(f)
    res, proj = fsio.open_project(str(f))
    imported = adapters.import_from_drop(proj)
    assert imported["hints"]["tempoTrust"] == "high" and len(imported["chops"]) == 3 and len(imported["samples"]) == 3 and len(imported["pads"]) == 3
    adapters.apply_analysis(proj, track().to_dict(), app_version="0.3.0", now=1760000000)
    proj.set_module("recipe", adapters.recipe_from_plan({"genre": "house", "steps": [{"n": 1, "id": "rhythm", "title": "Build the rhythm", "why": "four on the floor",
                                                                                       "items": [{"type": "lesson", "id": "hs-02-drums"}, {"type": "track", "id": "recipe"}]}]}))
    proj.set_module("progress", adapters.progress_doc({"hs-01-what": 1760000000000}))
    proj.set_module("requirements", adapters.requirements_doc("jg-05-chops", [{"type": "break-chop", "count": 3}]))
    out = fsio.save_file(proj, str(f), "save", now=1760000100, version="0.3.0")
    assert out["ok"] and out["revision"] == 2 and proj.revision == 2 and out["backup"] and Path(out["backup"]).exists()
    after = raw_entries(f)
    r = open_path(str(f))
    assert r.level == "VALID" and r.manifest["id"] == UUID and r.manifest["revision"] == 2 and r.manifest["modifiedBy"] == "sp404-learn"
    # DROP-owned entries and the source audio are byte-identical (compressed bytes, crc, method) — they were never re-serialised
    for n in ("project/chops.json", "project/samples.json", "project/pads.json", "project/loops.json", "audio/source.wav", "samples/sample-01.wav",
              "samples/sample-02.wav", "samples/sample-03.wav"):
        assert after[n] == before[n], n
    for n in ("analysis/track.json", "learn/recipe.json", "learn/progress.json", "learn/requirements.json"):
        assert n in after and n not in before
    assert r.manifest["extensions"] == {"x-sp404-drop": {"ids": {"chop": 3, "sample": 3}}}            # DROP's private bag survives
    assert r.manifest["modules"]["analysis"]["owner"] == "sp404-learn" and r.manifest["modules"]["chops"]["owner"] == "sp404-drop"
    a = r.package.modules["analysis"].data
    assert a["tempo"]["raw"]["evidence"][0]["source"] == "sp404-drop"                                  # DROP's BPM kept as imported evidence
    recipe = r.package.modules["recipe"].data
    assert [i["type"] for i in recipe["steps"][0]["items"]] == ["lesson"]                              # internal pseudo item not exported


def test_unknown_files_and_fields_survive_a_learn_save(tmp_path):
    f = tmp_path / "p.spsystem"
    shutil.copy(AFTER_LEARN_DROP, f)
    before = raw_entries(f)
    res, proj = fsio.open_project(str(f))
    # LEARN re-analyses: merge keeps the unknown x-learn-private bag, the candidate DROP/user state, and replaces raw
    existing = proj.data("analysis")
    existing["chopCandidates"][0]["state"] = "accepted"
    existing["chopCandidates"][0]["acceptedChopId"] = "chop-02"
    existing["tempo"]["userOverride"] = {"bpm": 118}
    proj.module("analysis").data = existing
    adapters.apply_analysis(proj, track().to_dict(), app_version="0.3.0", now=1760000000)
    fsio.save_file(proj, str(f), "save", now=1760000100)
    after = raw_entries(f)
    assert after["x-future/notes.bin"] == before["x-future/notes.bin"] and after["x-future/notes.bin"][4] == bytes([0, 1, 2, 3, 0xFA, 0xFB, 0xFC, 0xFD])
    for n in ("learn/recipe.json", "learn/progress.json", "learn/requirements.json", "project/chops.json"):
        assert after[n] == before[n], n                                    # LEARN modules it did not touch are byte-identical, incl. unknown x-future-field
    assert json.loads(zipio.read_entry(open_path(str(f)).package.src, open_path(str(f)).package.entry("learn/recipe.json")))["x-future-field"] is True
    a = open_path(str(f)).package.modules["analysis"].data
    assert a["x-learn-private"] == {"weights": [0.1, 0.2]}
    assert a["tempo"]["userOverride"] == {"bpm": 118} and a["tempo"]["raw"]["bpm"] == 120
    assert a["chopCandidates"][0]["state"] == "accepted" and a["chopCandidates"][0]["acceptedChopId"] == "chop-02"
    assert adapters.effective(a["tempo"]) == {"bpm": 118}
    assert open_path(str(f)).level == "VALID_WITH_WARNINGS"                 # W_UNKNOWN_FILE only


# ----------------------------------------------------------------------------------------------------------- raw vs user override
def test_bpm_correction_keeps_the_engine_reading_in_raw():
    a = track(corrections={"bpm": {"raw": 87.0, "user": 174.0}})
    a.grid.bpm = 174.0                                                      # the grid already carries the user's value
    out = adapters.analysis_from_track(a.to_dict())
    assert out["tempo"]["raw"]["bpm"] == 87.0 and out["tempo"]["userOverride"] == {"bpm": 174.0}
    assert adapters.effective(out["tempo"]) == {"bpm": 174.0}
    assert schemas.validate("analysis", out) == []


def test_genre_user_override_is_separate_and_survives_reanalysis():
    gp = {"available": True, "status": "confident", "primaryGenre": "jungle", "subgenre": None, "model": "x",
          "candidates": [{"genre": "jungle", "confidence": 0.8}, {"genre": "drum_and_bass", "confidence": 0.1}]}
    first = adapters.analysis_from_track(track(genre=gp, genre_user="drum_and_bass").to_dict())
    assert first["genre"]["raw"]["primary"] == "jungle" and first["genre"]["userOverride"] == {"genre": "drum_and_bass"}
    # a later run WITHOUT the user in the loop (e.g. DROP→LEARN re-analysis) must not erase the override
    gp2 = dict(gp, primaryGenre="breakbeat", candidates=[{"genre": "breakbeat", "confidence": 0.7}])
    second = adapters.merge_analysis(first, adapters.analysis_from_track(track(genre=gp2).to_dict()))
    assert second["genre"]["raw"]["primary"] == "breakbeat" and second["genre"]["userOverride"] == {"genre": "drum_and_bass"}
    assert schemas.validate("analysis", second) == []


def test_candidates_stay_suggestions_and_never_enter_chops(tmp_path):
    f = tmp_path / "p.spsystem"
    shutil.copy(DROP_CREATED, f)
    _, proj = fsio.open_project(str(f))
    chops_before = proj.data("chops")
    cands = adapters.candidates_from_regions([{"start": 0.2, "end": 0.9, "confidence": 0.7}], "drum-break")
    doc = adapters.analysis_from_track(track().to_dict())
    doc["chopCandidates"] = cands
    proj.set_module("analysis", doc)
    with pytest.raises(SpError) as e:
        proj.set_module("chops", {"schemaVersion": 1, "chops": []})        # LEARN does not own chops
    assert e.value.code == "E_NOT_OWNER"
    fsio.save_file(proj, str(f))
    r = open_path(str(f))
    assert r.package.modules["chops"].data == chops_before and r.package.modules["analysis"].data["chopCandidates"][0]["state"] == "suggested"
    # re-analysis keeps decisions made in DROP, replaces still-suggested ones
    old = [{"id": "cand-01", "kind": "drum-break", "startSeconds": 0, "endSeconds": 1, "state": "accepted", "acceptedChopId": "chop-04"},
           {"id": "cand-02", "kind": "vocal", "startSeconds": 1, "endSeconds": 2, "state": "suggested"}]
    new = [{"id": "cand-01", "kind": "drum-break", "startSeconds": 0.1, "endSeconds": 1.1, "state": "suggested"},
           {"id": "cand-03", "kind": "vocal", "startSeconds": 1, "endSeconds": 2, "state": "suggested"}]
    merged = adapters.merge_candidates(old, new)
    assert [(c["id"], c["state"]) for c in merged] == [("cand-01", "accepted"), ("cand-03", "suggested")]


# ----------------------------------------------------------------------------------------------------------- UUID / revision / copy
def test_new_project_revision_uuid_and_copy(tmp_path):
    p = Project.new("Learn made", app_version="0.3.0", now=1760000000)
    assert p.revision == 0 and p.manifest["createdBy"] == "sp404-learn"
    p.set_module("analysis", adapters.analysis_from_track(track().to_dict()))
    f = tmp_path / "n.spsystem"
    assert fsio.save_file(p, str(f), "save", now=1760000000)["revision"] == 1                    # first successful save -> 1
    pid = p.id
    p.set_module("progress", adapters.progress_doc({"a": 1}))
    assert fsio.save_file(p, str(f), "save")["revision"] == 2 and p.id == pid
    r = open_path(str(f))
    assert r.manifest["id"] == pid and r.manifest["revision"] == 2 and r.level == "VALID"
    c = tmp_path / "copy.spsystem"
    out = fsio.save_file(p, str(c), "copy")
    cr = open_path(str(c))
    assert out["copy"] and cr.manifest["id"] != pid and cr.manifest["revision"] == 1 and cr.manifest["extensions"]["x-sp404-learn"]["derivedFrom"] == pid
    assert p.revision == 2 and open_path(str(f)).manifest["id"] == pid


def test_set_user_tempo_follows_the_manifest_tempo_rule(tmp_path):
    f = tmp_path / "p.spsystem"
    shutil.copy(DROP_CREATED, f)
    _, proj = fsio.open_project(str(f))
    proj.set_user_tempo(172.0, now=1760000000)
    fsio.save_file(proj, str(f))
    t = open_path(str(f)).manifest["tempo"]
    assert t["bpm"] == 172.0 and t["origin"] == "user" and t["setBy"] == "sp404-learn" and t["beatOffsetSeconds"] == 0.02 and t["confidence"] == 0.8


# ----------------------------------------------------------------------------------------------------------- conflict + atomic save
def test_conflict_when_the_file_changed_on_disk(tmp_path):
    f = tmp_path / "p.spsystem"
    shutil.copy(DROP_CREATED, f)
    _, a = fsio.open_project(str(f))
    _, b = fsio.open_project(str(f))
    a.set_module("progress", adapters.progress_doc({"x": 1}))
    fsio.save_file(a, str(f))
    snapshot = f.read_bytes()
    b.set_module("progress", adapters.progress_doc({"y": 2}))
    with pytest.raises(Conflict) as e:
        fsio.save_file(b, str(f))
    assert e.value.extra["reason"] == "changed" and e.value.extra["disk"]["revision"] == 2
    assert f.read_bytes() == snapshot and not list(tmp_path.glob(".*.tmp"))                      # nothing written, no leftovers
    os.unlink(f)
    with pytest.raises(Conflict) as e2:
        fsio.save_file(b, str(f))
    assert e2.value.extra["reason"] == "deleted"


@pytest.mark.parametrize("hook", ["after_write", "after_fsync", "before_backup", "before_rename"])
def test_original_survives_a_crash_at_every_step(tmp_path, hook):
    f = tmp_path / "p.spsystem"
    shutil.copy(AFTER_LEARN_DROP, f)
    original = f.read_bytes()
    _, proj = fsio.open_project(str(f))
    proj.set_module("progress", adapters.progress_doc({"z": 1}))

    def boom(_):
        raise RuntimeError("simulated crash")

    with pytest.raises(RuntimeError):
        fsio.save_file(proj, str(f), hooks={hook: boom})
    assert f.read_bytes() == original and open_path(str(f)).level == "VALID_WITH_WARNINGS"
    assert not list(tmp_path.glob(".*.tmp")) and not (tmp_path / "p.spsystem.lock").exists()
    assert proj.revision == 3                                                                      # the in-memory baseline did not advance
    fsio.save_file(proj, str(f))                                                                   # and a retry works
    assert open_path(str(f)).manifest["revision"] == 4


def test_validation_failure_leaves_the_original_alone(tmp_path):
    f = tmp_path / "p.spsystem"
    shutil.copy(DROP_CREATED, f)
    original = f.read_bytes()
    _, proj = fsio.open_project(str(f))
    with pytest.raises(SpError) as e:
        proj.set_module("progress", {"progressVersion": 1, "lessonsDone": {"a": "not a number"}})
    assert e.value.code == "E_INVALID_MODULE_DATA" and f.read_bytes() == original


def test_lock_blocks_a_second_writer_and_stale_locks_are_cleared(tmp_path):
    f = tmp_path / "p.spsystem"
    shutil.copy(DROP_CREATED, f)
    _, proj = fsio.open_project(str(f))
    (tmp_path / "p.spsystem.lock").write_text(json.dumps({"pid": os.getpid(), "at": int(__import__("time").time() * 1000), "host": __import__("socket").gethostname()}))
    with pytest.raises(SpError) as e:
        fsio.save_file(proj, str(f))
    assert e.value.code == "E_LOCKED"
    (tmp_path / "p.spsystem.lock").write_text(json.dumps({"pid": 2 ** 22 + 7, "at": 1, "host": "x"}))        # old + foreign
    assert fsio.save_file(proj, str(f))["ok"] and not (tmp_path / "p.spsystem.lock").exists()


def test_recover_reports_and_cleans_leftovers(tmp_path):
    f = tmp_path / "p.spsystem"
    shutil.copy(DROP_CREATED, f)
    (tmp_path / ".p.spsystem.abc123.tmp").write_bytes(b"x")
    (tmp_path / "p.spsystem.bak.tmp").write_bytes(b"x")
    info = fsio.recover(str(f))
    assert len(info["temps"]) == 2 and not info["canonicalMissing"]
    fsio.recover(str(f), cleanup=True)
    assert not list(tmp_path.glob(".*.tmp")) and not (tmp_path / "p.spsystem.bak.tmp").exists() and f.exists()


# ----------------------------------------------------------------------------------------------------------- source handling
def test_source_resolution_portable_and_lightweight(tmp_path):
    _, proj = fsio.open_project(str(DROP_CREATED))
    r = adapters.resolve_source(proj, str(tmp_path / "cache"))
    assert r["state"] == "embedded" and Path(r["path"]).read_bytes()[:4] == b"RIFF"
    assert adapters.resolve_source(proj, str(tmp_path / "cache"))["path"] == r["path"]               # content-addressed, no overwrite
    ext = tmp_path / "ext.wav"
    ext.write_bytes(Path(r["path"]).read_bytes())
    h = hashlib.sha256(ext.read_bytes()).hexdigest()
    proj.manifest["source"] = {"mode": "lightweight", "externalSource": {"path": str(ext), "hash": h, "sizeBytes": ext.stat().st_size}}
    assert adapters.resolve_source(proj, str(tmp_path))["state"] == "external-ok"
    ext.write_bytes(b"RIFF" + b"x" * 100)
    assert adapters.resolve_source(proj, str(tmp_path))["state"] == "external-changed"
    ext.unlink()
    assert adapters.resolve_source(proj, str(tmp_path))["state"] == "external-moved"


# ----------------------------------------------------------------------------------------------------------- security
def zip_with(entries: dict, manifest=True, **kw) -> bytes:
    buf = io.BytesIO()
    m = {"format": "sp-system", "formatVersion": 1, "id": UUID, "createdBy": "x", "createdAt": "2026-10-07T09:00:00Z"}
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        if manifest:
            z.writestr("manifest.json", json.dumps(m))
        for n, d in entries.items():
            if isinstance(d, zipfile.ZipInfo):
                z.writestr(d, b"data")
            else:
                z.writestr(n, d)
    return buf.getvalue()


@pytest.mark.parametrize("name,code", [("../evil.json", "E_PATH_UNSAFE"), ("/abs.json", "E_PATH_UNSAFE"), ("a\\b.json", "E_PATH_UNSAFE"), ("C:/x.json", "E_PATH_UNSAFE"),
                                       ("a/../../b.json", "E_PATH_UNSAFE"), ("x/run.sh", "E_FORBIDDEN_TYPE"), ("tool.EXE", "E_FORBIDDEN_TYPE"), ("a/x.py", "E_FORBIDDEN_TYPE")])
def test_hostile_entry_names_are_rejected(name, code):
    r = open_bytes(zip_with({name: b"x"}))
    assert r.level == "CORRUPTED" and r.code == code


def test_duplicate_case_collision_symlink_and_not_a_zip():
    assert open_bytes(zip_with({"x/a.txt": b"1", "x/A.TXT": b"2"})).code == "E_CASE_COLLISION"
    zi = zipfile.ZipInfo("link")
    zi.create_system, zi.external_attr = 3, (0o120777 << 16)
    assert open_bytes(zip_with({"link": zi})).code == "E_SYMLINK"
    assert open_bytes(b"not a zip at all, definitely not").code == "E_NOT_ZIP"
    assert open_bytes(b"").code == "E_NOT_ZIP"
    assert open_bytes(zip_with({}, manifest=False)).code == "E_NO_MANIFEST"


def test_duplicate_names_are_rejected():
    import warnings
    buf = io.BytesIO()
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        with zipfile.ZipFile(buf, "w") as z:
            z.writestr("manifest.json", json.dumps({"format": "sp-system", "formatVersion": 1, "id": UUID, "createdBy": "x", "createdAt": "2026-10-07T09:00:00Z"}))
            z.writestr("a.txt", "1")
            z.writestr("a.txt", "2")
    assert open_bytes(buf.getvalue()).code == "E_DUP_NAME"


def test_zip_bomb_bad_crc_truncation_and_manifest_problems():
    assert open_bytes(zip_with({"samples/zeros.wav": b"RIFF" + b"\0" * (3 * 1024 * 1024)})).code == "E_RATIO"
    good = zip_with({"learn/progress.json": json.dumps({"progressVersion": 1})})
    assert open_bytes(good).ok
    assert open_bytes(good[:-40]).level == "CORRUPTED"                       # truncated: end-of-central-directory gone
    # a flipped byte inside a STORED entry is caught by the CRC when the entry is read
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_STORED) as z:
        z.writestr("manifest.json", json.dumps({"format": "sp-system", "formatVersion": 1, "id": UUID, "createdBy": "x", "createdAt": "2026-10-07T09:00:00Z"}))
        z.writestr("learn/progress.json", json.dumps({"progressVersion": 1, "lessonsDone": {}}))
    raw = bytearray(buf.getvalue())
    i = raw.find(b"progressVersion")
    raw[i] ^= 0x01
    r = open_bytes(bytes(raw))
    assert r.package.modules["progress"].status == "invalid" and "W_MODULE_INVALID" in [x.code for x in r.issues]
    assert r.level == "VALID_WITH_WARNINGS"                                  # a damaged optional module never rejects the project
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("manifest.json", json.dumps({"format": "other"}))
    assert open_bytes(buf.getvalue()).code == "E_MANIFEST_INVALID"
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("manifest.json", json.dumps({"format": "sp-system", "formatVersion": 2, "id": UUID, "createdBy": "x", "createdAt": "2026-10-07T09:00:00Z"}))
    r = open_bytes(buf.getvalue())
    assert r.level == "UNSUPPORTED_VERSION" and r.code == "E_UNSUPPORTED_VERSION"


def test_executable_content_in_an_audio_entry_and_wrong_extension_are_rejected():
    assert open_bytes(zip_with({"samples/a.wav": b"MZ\x90\x00" + b"\0" * 20})).code == "E_FORBIDDEN_TYPE"
    assert open_bytes(zip_with({"samples/a.wav": b"not a wav at all......"})).code == "E_SNIFF_MISMATCH"
    assert open_bytes(zip_with({"samples/a.wav": b"RIFF\x00\x00\x00\x00WAVEfmt "})).ok


def test_newer_or_invalid_modules_never_reject_the_project_and_stay_read_only():
    newer = zip_with({"analysis/track.json": json.dumps({"analysisVersion": 9, "future": True})})
    r = open_bytes(newer)
    assert r.level == "UNSUPPORTED_VERSION"            # LEARN would have to edit it and cannot understand it: read-only, never rewritten
    drop_newer = zip_with({"project/chops.json": json.dumps({"schemaVersion": 7, "chops": []})})
    r2 = open_bytes(drop_newer)
    assert r2.level == "VALID_WITH_WARNINGS" and [i.code for i in r2.issues] == ["W_MODULE_NEWER"]
    invalid = zip_with({"learn/recipe.json": json.dumps({"recipeVersion": 1, "steps": "nope"})})
    r3 = open_bytes(invalid)
    assert r3.level == "VALID_WITH_WARNINGS" and r3.package.modules["recipe"].status == "invalid"
    p = Project.from_open(r3)
    with pytest.raises(SpError) as e:
        p.set_module("recipe", {"recipeVersion": 1, "steps": []})
    assert e.value.code == "E_MODULE_READONLY"


def test_proto_keys_are_dropped_only_from_files_learn_rewrites():
    evil = json.dumps({"progressVersion": 1, "lessonsDone": {}, "__proto__": {"x": 1}, "nested": {"constructor": 1}})
    r = open_bytes(zip_with({"learn/progress.json": evil}))
    assert "W_PROTO_KEY_DROPPED" in [i.code for i in r.issues] and "__proto__" not in r.package.modules["progress"].data


def test_stale_analysis_and_dangling_references_warn_but_open():
    pads = {"schemaVersion": 1, "assignments": [{"bank": "A", "pad": 1, "sampleId": "ghost"}, {"bank": "A", "pad": 1, "sampleId": None}]}
    samples = {"schemaVersion": 1, "samples": [{"id": "s1", "file": "samples/missing.wav", "durationSeconds": 1, "sampleRate": 48000, "bitDepth": 16, "channels": 1, "sourceChopId": "nope"}]}
    chops = {"schemaVersion": 1, "chops": [{"id": "c1", "startSeconds": 2, "endSeconds": 1, "type": "manual"}]}
    an = {"analysisVersion": 1, "audioSha256": "0" * 32}
    data = zip_with({"project/pads.json": json.dumps(pads), "project/samples.json": json.dumps(samples), "project/chops.json": json.dumps(chops), "analysis/track.json": json.dumps(an)})
    z = zipfile.ZipFile(io.BytesIO(data))
    m = json.loads(z.read("manifest.json"))
    m["source"] = {"mode": "portable", "audio": "audio/source.wav", "sha256": "1" * 64}
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as o:
        o.writestr("manifest.json", json.dumps(m))
        for n in z.namelist():
            if n != "manifest.json":
                o.writestr(n, z.read(n))
    codes = sorted({i.code for i in open_bytes(buf.getvalue()).issues})
    assert codes == ["W_BAD_RANGE", "W_DANGLING_REF", "W_DUP_PAD", "W_MISSING_FILE", "W_STALE_ANALYSIS"]


# ----------------------------------------------------------------------------------------------------------- backward compatibility
def test_sp404learn_project_format_is_unchanged_and_independent():
    a = track()
    d = a.to_dict()
    assert TrackAnalysis.from_dict(d).to_dict() == d                    # round trip of LEARN's own model, untouched by this phase
    assert "corrections" in d and "genre_user" in d
    assert not hasattr(a, "spsystem")                                   # the .sp404learn model does not know about .spsystem


# ----------------------------------------------------------------------------------------------------------- fixture for DROP + real DROP
def test_learn_mutated_fixture_is_a_valid_real_learn_save(tmp_path):
    sys_path = str(Path(__file__).resolve().parents[1] / "tools")
    import sys
    sys.path.insert(0, sys_path)
    import make_spsystem_fixture as mk
    out = mk.build(tmp_path / "learn-mutated.spsystem")
    r = open_path(str(out))
    assert r.level == "VALID_WITH_WARNINGS" and r.manifest["revision"] == 4 and r.manifest["id"] == UUID
    assert r.package.modules["analysis"].data["x-learn-private"] == {"weights": [0.1, 0.2]}
    committed = FX / "learn-mutated.spsystem"
    if committed.exists():
        c = open_path(str(committed))
        assert c.manifest["id"] == UUID and c.manifest["revision"] == 4 and set(raw_entries(out)) == set(raw_entries(committed))


DROP_REPO = Path(os.environ.get("SP404_DROP_REPO", Path.home() / "Desktop" / "sp404-toolkit"))
NODE = shutil.which("node")


@pytest.mark.skipif(not NODE or not (DROP_REPO / "mac" / "app" / "spsystem-fs.js").exists(), reason="DROP repo / node not available")
def test_real_drop_reads_and_saves_a_learn_file_and_learn_reads_it_back(tmp_path):
    """DROP-created -> LEARN (real) -> DROP (real reader + real save, pad 4 changed) -> LEARN (real). Everything must survive."""
    import subprocess
    f = tmp_path / "rt.spsystem"
    shutil.copy(DROP_CREATED, f)
    _, proj = fsio.open_project(str(f))
    adapters.apply_analysis(proj, track().to_dict(), app_version="0.3.0", now=1760000000)
    proj.set_module("recipe", adapters.recipe_from_plan({"genre": "house", "steps": [{"n": 1, "id": "rhythm", "title": "Rhythm"}]}))
    proj.set_module("progress", adapters.progress_doc({"l1": 1760000000000}))
    proj.set_module("requirements", adapters.requirements_doc("jg-05-chops", [{"type": "break-chop", "count": 3}]))
    fsio.save_file(proj, str(f), now=1760000100)
    learn_bytes = raw_entries(f)
    js = """
const fs=require(process.argv[1]); (async()=>{
  const o=await fs.open(process.argv[2]);
  if(!o.project){console.log(JSON.stringify({ok:false,level:o.result.level,code:o.result.code}));process.exit(1);}
  o.project.setPad('A',4,'sample-03','moved by DROP');
  const r=await fs.saveFile(o.project,process.argv[2],{version:'1.2.0'});
  console.log(JSON.stringify(r));
})().catch(e=>{console.log(JSON.stringify({ok:false,err:String(e)}));process.exit(1);});"""
    out = subprocess.run([NODE, "-e", js, str(DROP_REPO / "mac" / "app" / "spsystem-fs.js"), str(f)], capture_output=True, text=True, timeout=60)
    res = json.loads(out.stdout.strip().splitlines()[-1])
    assert res["ok"] and res["revision"] == 3, out.stdout + out.stderr
    r = open_path(str(f))
    after = raw_entries(f)
    assert r.level == "VALID" and r.manifest["id"] == UUID and r.manifest["revision"] == 3 and r.manifest["modifiedBy"] == "sp404-drop"
    for n in ("analysis/track.json", "learn/recipe.json", "learn/progress.json", "learn/requirements.json"):
        assert after[n] == learn_bytes[n], n                                  # DROP copied LEARN's files through untouched
    for n in ("audio/source.wav", "samples/sample-01.wav", "samples/sample-02.wav", "samples/sample-03.wav", "project/chops.json", "project/loops.json"):
        assert after[n] == learn_bytes[n], n
    assert [a for a in r.package.modules["pads"].data["assignments"] if a["pad"] == 4][0]["sampleId"] == "sample-03"
    # and LEARN can save again on top of DROP's save (revision keeps counting, nothing is lost)
    _, p2 = fsio.open_project(str(f))
    p2.set_module("progress", adapters.progress_doc({"l2": 1760000500000}, existing=p2.data("progress")))
    assert fsio.save_file(p2, str(f))["revision"] == 4
    r2 = open_path(str(f))
    assert r2.package.modules["progress"].data["lessonsDone"] == {"l1": 1760000000000, "l2": 1760000500000}
    assert [a for a in r2.package.modules["pads"].data["assignments"] if a["pad"] == 4][0]["sampleId"] == "sample-03"


# ----------------------------------------------------------------------------------------------------------- FINAL real cross-app round trip
REAL_DROP = FX / "drop-after-real-learn.spsystem"
REAL_DROP_SHA256 = "2047871547dbc6bb5e53cf9c824f1c045c520679fc4b200bd27d5f6d0466a49f"
DROP_OWNED = ("project/chops.json", "project/samples.json", "project/loops.json", "project/pads.json")
BINARY_PAYLOADS = ("audio/source.wav", "samples/sample-01.wav", "samples/sample-02.wav", "samples/sample-03.wav", "x-future/notes.bin")
LEARN_OWNED = ("analysis/track.json", "learn/recipe.json", "learn/requirements.json", "learn/progress.json")


def payloads(path) -> dict[str, bytes]:
    r = open_path(str(path))
    return {e.name: zipio.read_entry(r.package.src, e) for e in r.package.entries}


def test_real_drop_after_real_learn_final_round_trip(tmp_path):
    """REAL_DROP_FIXTURE -> LEARN read -> LEARN mutation (progress) -> LEARN write -> LEARN read. ZIP timestamps are NOT compared:
    entry names, uncompressed payload bytes and canonical values are."""
    assert hashlib.sha256(REAL_DROP.read_bytes()).hexdigest() == REAL_DROP_SHA256            # the fixture is exactly the one DROP produced
    # ---- 1. validate
    r = open_path(str(REAL_DROP))
    assert r.level == "VALID_WITH_WARNINGS" and not [i for i in r.issues if i.severity == "error"]
    assert [(i.code, i.where) for i in r.issues] == [("W_UNKNOWN_FILE", "x-future/notes.bin")]
    m = r.manifest
    assert (m["formatVersion"], m["id"], m["revision"], m["modifiedBy"]) == (1, UUID, 5, "sp404-drop")
    assert {n: x.status for n, x in r.package.modules.items()} == {k: "ok" for k in ("chops", "samples", "pads", "loops", "analysis", "recipe", "progress", "requirements")}
    # ---- 2. the DROP mutation reached LEARN
    pads = {(a["bank"], a["pad"]): a["sampleId"] for a in r.package.modules["pads"].data["assignments"]}
    assert pads[("A", 5)] == "sample-01" and pads[("A", 4)] == "sample-03"
    # ---- 3. LEARN's earlier data is present, valid, and its state can be rebuilt from the files alone
    mods = r.package.modules
    for name in ("analysis", "recipe", "requirements", "progress"):
        assert schemas.validate(mods[name].schema, mods[name].data) == []
    an = mods["analysis"].data
    assert adapters.effective(an["tempo"]) == {"bpm": 118.0} and an["tempo"]["raw"]["bpm"] == 120.0                 # raw kept beside the user's value
    assert an["chopCandidates"][0]["state"] == "suggested" and an["x-learn-private"] == {"weights": [0.1, 0.2]}
    assert [s["id"] for s in mods["recipe"].data["steps"]] and mods["requirements"].data["needs"] and mods["progress"].data["lessonsDone"]["hs-01-what"] == 1760000100000
    assert (m["tempo"]["bpm"], m["tempo"]["origin"], m["tempo"]["setBy"]) == (118, "user", "sp404-learn")
    assert m["x-learn-note"] == {"keep": "me"} and m["extensions"] == {"x-sp404-drop": {"ids": {"chop": 3, "sample": 3}}}   # unknown manifest data survived LEARN->DROP
    # ---- 4. payloads
    before = payloads(REAL_DROP)
    assert before["audio/source.wav"][:4] == b"RIFF" and all(f"samples/sample-0{i}.wav" in before for i in (1, 2, 3))
    assert before["x-future/notes.bin"] == bytes([0, 1, 2, 3, 0xFA, 0xFB, 0xFC, 0xFD])
    assert all(n in before for n in DROP_OWNED + LEARN_OWNED)
    assert [c["id"] for c in mods["chops"].data["chops"]] == ["chop-01", "chop-02", "chop-03"] and mods["loops"].data["loops"] == []

    # ---- 5. one deterministic LEARN-owned mutation, real writer
    f = tmp_path / "learn-after-real-drop.spsystem"
    shutil.copy(REAL_DROP, f)
    _, proj = fsio.open_project(str(f))
    assert proj.revision == 5
    proj.set_module("progress", adapters.progress_doc({"hs-02-drums": 1791549000000}, existing=proj.data("progress")))
    out = fsio.save_file(proj, str(f), "save", now=1791549000, version="0.3.0")
    assert out["ok"] and out["revision"] == 6 and proj.revision == 6

    # ---- 6-7. everything DROP-owned and unknown survived LEARN's save
    r2 = open_path(str(f))
    after = payloads(f)
    assert r2.level == "VALID_WITH_WARNINGS" and not [i for i in r2.issues if i.severity == "error"] and [i.code for i in r2.issues] == ["W_UNKNOWN_FILE"]
    assert (r2.manifest["id"], r2.manifest["revision"], r2.manifest["modifiedBy"], r2.manifest["modifiedByVersion"]) == (UUID, 6, "sp404-learn", "0.3.0")
    assert set(after) == set(before)
    for n in DROP_OWNED + BINARY_PAYLOADS:
        assert after[n] == before[n], n                                                      # not rebuilt, not normalised
    for n in ("analysis/track.json", "learn/recipe.json", "learn/requirements.json"):
        assert after[n] == before[n], n                                                      # LEARN modules it did not touch
    pads2 = {(a["bank"], a["pad"]): a["sampleId"] for a in r2.package.modules["pads"].data["assignments"]}
    assert pads2 == pads and pads2[("A", 5)] == "sample-01" and pads2[("A", 4)] == "sample-03"
    # raw (compressed) bytes of the DROP-owned entries are identical too — copied, never re-encoded
    ra, rb = raw_entries(REAL_DROP), raw_entries(f)
    for n in DROP_OWNED + BINARY_PAYLOADS + ("analysis/track.json", "learn/recipe.json", "learn/requirements.json"):
        assert ra[n] == rb[n], n
    # ---- the LEARN mutation is there, nothing else in progress moved
    prog = r2.package.modules["progress"].data
    assert prog["lessonsDone"] == {"l1": 1760000000000, "hs-01-what": 1760000100000, "hs-02-drums": 1791549000000}
    # manifest: only the save bookkeeping changed; module declarations and unknown keys intact
    changed = {k for k in set(m) | set(r2.manifest) if m.get(k) != r2.manifest.get(k)}
    assert changed == {"revision", "modifiedAt", "modifiedBy", "modifiedByVersion"}          # `modules` is identical: LEARN's declarations were already canonical
    assert r2.manifest["x-learn-note"] == {"keep": "me"} and r2.manifest["tempo"] == m["tempo"] and r2.manifest["extensions"] == m["extensions"]
    # semantic timestamps move forward only (the fixture is pinned to a realistic time after DROP's 2026-10-09T12:00:00Z)
    assert r2.manifest["modifiedAt"] == "2026-10-09T12:30:00Z" > m["modifiedAt"]

    # ---- 8. the committed final fixture is the same semantic state
    final = FX / "learn-after-real-drop.spsystem"
    if final.exists():
        rf = open_path(str(final))
        assert (rf.manifest["id"], rf.manifest["revision"], rf.manifest["modifiedBy"]) == (UUID, 6, "sp404-learn")
        assert payloads(final) == after


def test_semantic_timestamps_use_the_real_clock_unless_pinned(tmp_path):
    """Guards the 'Oct 2025' finding: fixtures were generated with a pinned `now`; the writer itself uses the current clock."""
    import time
    f = tmp_path / "p.spsystem"
    shutil.copy(DROP_CREATED, f)
    _, proj = fsio.open_project(str(f))
    proj.set_user_tempo(121.0)
    adapters.apply_analysis(proj, track().to_dict())
    fsio.save_file(proj, str(f))
    r = open_path(str(f))
    year = str(time.gmtime().tm_year)
    assert r.manifest["modifiedAt"].startswith(year) and r.manifest["tempo"]["setAt"].startswith(year)
    assert r.package.modules["analysis"].data["producedAt"].startswith(year)
    zi = zipfile.ZipFile(f).getinfo("manifest.json")
    assert zi.date_time[0] == time.localtime().tm_year                                  # ZIP entry time = DOS time of the save, not project state


# ----------------------------------------------------------------------------------------------------------- LEARN -> DROP export (PREPARE IN DROP)
def _audio(tmp_path):
    import wave
    w = tmp_path / "track.wav"
    with wave.open(str(w), "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(22050)
        f.writeframes(b"\x00\x01" * 22050)
    return w


def test_export_new_package_embeds_the_source_and_suggests_sections(tmp_path):
    from engine.spsystem.export import export_for_drop
    w = _audio(tmp_path)
    a = track().to_dict()
    a["path"], a["filename"], a["audio_hash"] = str(w), "track.wav", hashlib.sha256(w.read_bytes()).hexdigest()[:32]      # LEARN's cache key = sha256 prefix of the same file
    out = export_for_drop(a, str(tmp_path / "t.spsystem"), app_version="0.3.0", now=1791549000)
    assert out["embedded"] and not out["updated"] and out["revision"] == 1 and out["candidates"] == 2
    r = open_path(out["path"])
    assert r.level == "VALID" and r.manifest["source"]["mode"] == "portable" and r.manifest["source"]["sha256"] == hashlib.sha256(w.read_bytes()).hexdigest()
    assert r.manifest["tempo"]["bpm"] == 120.0 and r.manifest["tempo"]["setBy"] == "sp404-learn" and r.manifest["meter"] == {"beatsPerBar": 4}
    assert r.package.modules["chops"].status == "absent"                                   # suggestions are NOT chops
    an = r.package.modules["analysis"].data
    assert an["audioSha256"] == hashlib.sha256(w.read_bytes()).hexdigest()[:32] and all(c["state"] == "suggested" for c in an["chopCandidates"])
    assert not [i for i in r.issues if i.code == "W_STALE_ANALYSIS"]                       # source hash and analysis hash agree


def test_export_lightweight_when_not_embeddable(tmp_path):
    from engine.spsystem.export import export_for_drop
    w = tmp_path / "x.wma"
    w.write_bytes(b"not embeddable")
    a = track().to_dict()
    a["path"], a["filename"], a["audio_hash"] = str(w), "x.wma", hashlib.sha256(w.read_bytes()).hexdigest()[:32]
    out = export_for_drop(a, str(tmp_path / "l.spsystem"))
    r = open_path(out["path"])
    assert not out["embedded"] and r.manifest["source"]["mode"] == "lightweight" and r.manifest["source"]["externalSource"]["path"] == str(w)
    assert r.level == "VALID"


def test_export_onto_an_existing_drop_project_keeps_drop_data_and_decisions(tmp_path):
    from engine.spsystem.export import export_for_drop
    f = tmp_path / "p.spsystem"
    shutil.copy(REAL_DROP, f)
    before = payloads(f)
    a = track().to_dict()
    out = export_for_drop(a, str(f), app_version="0.3.0", now=1791549000)
    assert out["updated"] and out["revision"] == 6 and out["id"] == UUID
    after = payloads(f)
    for n in DROP_OWNED + BINARY_PAYLOADS:
        assert after[n] == before[n], n
    an = open_path(str(f)).package.modules["analysis"].data
    assert an["x-learn-private"] == {"weights": [0.1, 0.2]} and an["tempo"]["userOverride"] == {"bpm": 118.0}   # the user's override is not lost
    assert {c["id"] for c in an["chopCandidates"]} >= {"cand-01", "cand-02"}


def test_export_refuses_an_existing_file_that_is_not_a_project(tmp_path):
    from engine.spsystem.export import export_for_drop
    f = tmp_path / "notes.spsystem"
    f.write_bytes(b"hello")
    with pytest.raises(SpError) as e:
        export_for_drop(track().to_dict(), str(f))
    assert e.value.code == "E_NOT_USABLE" and f.read_bytes() == b"hello"


# ----------------------------------------------------------------------------------------------------------- DROP -> LEARN: open pipeline (session)
def _probe(f):
    import wave
    with wave.open(f) as w:
        return {"duration": w.getnframes() / w.getframerate(), "sample_rate": w.getframerate(), "channels": w.getnchannels()}


def _open(path, cache):
    from engine.spsystem import session
    return session.load(str(path), str(cache), probe=_probe, peaks=lambda f: [[-0.5, 0.5]] * 4)


def test_open_is_read_only_and_loads_everything_drop_sent(tmp_path):
    f = tmp_path / "p.spsystem"
    shutil.copy(DROP_CREATED, f)
    before_bytes = f.read_bytes()
    proj, pl = _open(f, tmp_path / "cache")
    assert f.read_bytes() == before_bytes and sorted(os.listdir(tmp_path)) == ["cache", "p.spsystem"]       # nothing written, not even a lock/bak
    assert pl["ok"] and pl["level"] == "VALID" and pl["path"] == str(f)
    assert pl["project"]["id"] == UUID and pl["project"]["revision"] == 1 and pl["project"]["formatVersion"] == 1 and pl["project"]["createdBy"] == "sp404-drop"
    assert proj.revision == 1 and proj.id == UUID and proj.path == str(f) and not proj.manifest_dirty
    assert pl["source"]["state"] == "embedded" and Path(pl["source"]["path"]).read_bytes()[:4] == b"RIFF" and pl["source"]["peaks"]
    assert str(tmp_path / "cache") in pl["source"]["path"]                                                  # played from the project, not from DROP's original path
    assert pl["project"]["tempo"]["bpm"] == 120 and pl["project"]["meter"] is None
    assert [c["id"] for c in pl["chops"]] == ["chop-01", "chop-02", "chop-03"] and len(pl["samples"]) == 3 and len(pl["pads"]) == 3 and pl["loops"] == []
    assert pl["hasAnalysis"] is False and pl["track"] is None                                               # no auto-analysis; the UI offers it
    assert pl["tempo"] == {"effective": 120, "raw": 120}


def test_open_a_project_with_learn_data_restores_it_without_overwriting(tmp_path):
    f = tmp_path / "p.spsystem"
    shutil.copy(REAL_DROP, f)
    raw0 = raw_entries(f)
    proj, pl = _open(f, tmp_path / "cache")
    assert pl["level"] == "VALID_WITH_WARNINGS" and [i["code"] for i in pl["issues"]] == ["W_UNKNOWN_FILE"]
    assert pl["hasAnalysis"] and pl["analysis"]["x-learn-private"] == {"weights": [0.1, 0.2]}                # analysis preserved verbatim
    assert pl["analysis"]["tempo"]["userOverride"] == {"bpm": 118.0} and pl["analysis"]["tempo"]["raw"]["bpm"] == 120.0   # override stays an override
    assert pl["tempo"] == {"effective": 118.0, "raw": 120.0}
    assert {(a["bank"], a["pad"]): a["sampleId"] for a in pl["pads"]}[("A", 5)] == "sample-01"
    assert raw_entries(f) == raw0 and proj.revision == 5 and not any(m.dirty for m in proj.modules.values())


def test_a_complete_learn_analysis_is_reconstructed_into_a_track_analysis(tmp_path):
    f = tmp_path / "p.spsystem"
    shutil.copy(DROP_CREATED, f)
    _, proj = fsio.open_project(str(f))
    a = track(corrections={"bpm": {"raw": 120.0, "user": 118.0}}, genre_user="house")
    a.grid.bpm = 118.0
    adapters.apply_analysis(proj, a.to_dict(), app_version="0.3.0")
    fsio.save_file(proj, str(f))
    _, pl = _open(f, tmp_path / "cache")
    t = pl["track"]
    assert t is not None and TrackAnalysis.from_dict(t).grid.bpm == 118.0                          # it is a valid LEARN model again
    assert t["corrections"] == {"bpm": {"raw": 120.0, "user": 118.0}} and t["genre_user"] == "house"
    assert len(t["events"]) == 6 and [s["label"] for s in t["sections"]] == ["INTRO", "DROP"] and len(t["bass"]) == 1
    assert t["stems"]["mix"]["path"] == pl["source"]["path"] and t["path"] == pl["source"]["path"]
    assert t["grid"]["origin"] == 0.02 and t["grid"]["candidates"] == [60.0, 240.0] and t["audio_hash"] == "1c5fedc1feaceba165ad442ce24714f6"


def test_a_newer_user_tempo_set_in_drop_counts_as_the_override_in_memory_only(tmp_path):
    f = tmp_path / "p.spsystem"
    shutil.copy(DROP_CREATED, f)
    _, proj = fsio.open_project(str(f))
    adapters.apply_analysis(proj, track().to_dict(), now=1760000000)
    fsio.save_file(proj, str(f), now=1760000000)
    _, p2 = fsio.open_project(str(f))
    p2.manifest["tempo"].update({"bpm": 130.0, "origin": "user", "setBy": "sp404-drop", "setAt": "2026-10-09T00:00:00Z"})
    p2.manifest_dirty = True
    fsio.save_file(p2, str(f))
    _, pl = _open(f, tmp_path / "cache")
    assert pl["tempo"] == {"effective": 130.0, "raw": 120.0} and pl["track"]["grid"]["bpm"] == 130.0
    assert pl["analysis"]["tempo"].get("userOverride") is None                      # the file was not rewritten by opening


@pytest.mark.parametrize("make,code,level", [
    (lambda p: p.write_bytes(b"garbage"), "E_NOT_ZIP", "CORRUPTED"),
    (lambda p: p.write_bytes(zip_with({"../x.json": b"1"})), "E_PATH_UNSAFE", "CORRUPTED"),
    (lambda p: p.write_bytes(zip_with({}, manifest=False)), "E_NO_MANIFEST", "CORRUPTED"),
])
def test_open_reports_unreadable_projects_without_repairing_them(tmp_path, make, code, level):
    f = tmp_path / "bad.spsystem"
    make(f)
    before = f.read_bytes()
    proj, pl = _open(f, tmp_path / "cache")
    assert proj is None and pl["ok"] is False and pl["code"] == code and pl["level"] == level and f.read_bytes() == before


def test_unsupported_version_and_missing_file(tmp_path):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("manifest.json", json.dumps({"format": "sp-system", "formatVersion": 2, "id": UUID, "createdBy": "x", "createdAt": "2026-10-07T09:00:00Z"}))
    f = tmp_path / "v2.spsystem"
    f.write_bytes(buf.getvalue())
    proj, pl = _open(f, tmp_path / "cache")
    assert proj is None and pl["level"] == "UNSUPPORTED_VERSION" and pl["code"] == "E_UNSUPPORTED_VERSION"
    proj, pl = _open(tmp_path / "nope.spsystem", tmp_path / "cache")
    assert proj is None and pl["code"] == "E_NO_FILE" and pl["level"] == "CORRUPTED"


def test_open_save_increments_the_revision_exactly_once_and_keeps_drop_data(tmp_path):
    from engine.spsystem import session
    f = tmp_path / "p.spsystem"
    shutil.copy(REAL_DROP, f)
    before = payloads(f)
    proj, pl = _open(f, tmp_path / "cache")
    out = session.save(proj, None)                                           # nothing changed, but an explicit save is a save: +1, once
    assert out["revision"] == 6 and proj.revision == 6 and open_path(str(f)).manifest["revision"] == 6
    a = track(genre_user="techno")
    a.grid.bpm = 120.0
    out2 = session.save(proj, a.to_dict(), version="0.3.0")
    assert out2["revision"] == 7 and open_path(str(f)).manifest["modifiedBy"] == "sp404-learn"
    after = payloads(f)
    for n in DROP_OWNED + BINARY_PAYLOADS:
        assert after[n] == before[n], n
    an = open_path(str(f)).package.modules["analysis"].data
    assert an["genre"]["userOverride"] == {"genre": "techno"} and an["tempo"]["userOverride"] == {"bpm": 118.0}       # earlier override survived re-analysis
    assert an["x-learn-private"] == {"weights": [0.1, 0.2]}


def test_save_of_a_bpm_correction_updates_the_working_tempo_and_never_raw(tmp_path):
    from engine.spsystem import session
    f = tmp_path / "p.spsystem"
    shutil.copy(DROP_CREATED, f)
    proj, _ = _open(f, tmp_path / "cache")
    a = track(corrections={"bpm": {"raw": 120.0, "user": 240.0}})
    a.grid.bpm = 240.0
    session.save(proj, a.to_dict())
    r = open_path(str(f))
    assert r.manifest["tempo"]["bpm"] == 240.0 and r.manifest["tempo"]["origin"] == "user" and r.manifest["tempo"]["setBy"] == "sp404-learn"
    t = r.package.modules["analysis"].data["tempo"]
    assert t["raw"]["bpm"] == 120.0 and t["userOverride"] == {"bpm": 240.0}


def test_save_refuses_to_overwrite_a_newer_revision_written_by_drop(tmp_path):
    from engine.spsystem import session
    f = tmp_path / "p.spsystem"
    shutil.copy(DROP_CREATED, f)
    proj, _ = _open(f, tmp_path / "cache")                                      # LEARN opened revision 1
    _, other = fsio.open_project(str(f))                                        # "DROP" saves revision 2 meanwhile
    other.manifest["title"] = "edited in DROP"
    other.manifest_dirty = True
    fsio.save_file(other, str(f))
    snapshot = f.read_bytes()
    with pytest.raises(Conflict) as e:
        session.save(proj, track().to_dict())
    assert e.value.code == "E_CONFLICT" and e.value.extra["disk"]["revision"] == 2 and f.read_bytes() == snapshot
    assert open_path(str(f)).manifest["title"] == "edited in DROP"


def test_legacy_sp404learn_projects_still_round_trip():
    d = track().to_dict()
    pf = {"format": "sp404learn", "version": 1, "trackPath": "/x/a.wav", "peaks": [[0, 1]], "analysis": d, "kit": {}, "patternEdits": {}, "minConfidence": 0.3,
          "tutorialIndex": 0, "settings": {"currentBar": 0, "activePattern": "A"}}
    assert json.loads(json.dumps(pf))["analysis"] == d and TrackAnalysis.from_dict(json.loads(json.dumps(pf))["analysis"]).to_dict() == d


def test_resolve_target_updates_the_same_audio_and_never_touches_a_different_one(tmp_path):
    from engine.spsystem.export import export_for_drop, resolve_target
    w1, w2 = _audio(tmp_path), tmp_path / "other.wav"
    shutil.copy(w1, w2)
    w2.write_bytes(w2.read_bytes() + b"\x00\x00")                                       # a different file with the same name stem
    folder = tmp_path / "Documents" / "SP404 DROP" / "Projects"

    def analysis(w):
        a = track().to_dict()
        a["path"], a["filename"], a["audio_hash"] = str(w), w.name, hashlib.sha256(w.read_bytes()).hexdigest()[:32]
        return a

    a1 = analysis(w1)
    p1 = resolve_target("My: track/1", a1["audio_hash"], folder)
    assert p1 == str(folder / "My_ track_1.spsystem") and folder.is_dir()                      # created, unsafe characters replaced
    export_for_drop(a1, p1)
    assert resolve_target("My: track/1", a1["audio_hash"], folder) == p1                        # same audio -> update the same project
    a2 = analysis(w2)
    p2 = resolve_target("My: track/1", a2["audio_hash"], folder)
    assert p2 == str(folder / "My_ track_1 2.spsystem")                                         # different audio -> a new, numbered file
    before = Path(p1).read_bytes()
    export_for_drop(a2, p2)
    assert Path(p1).read_bytes() == before and open_path(p2).manifest["id"] != open_path(p1).manifest["id"]
