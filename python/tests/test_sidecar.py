import json, subprocess, sys, os, tempfile
from engine import synth

PY = sys.executable


def _rpc(proc, rid, method, params):
    proc.stdin.write(json.dumps({"id": rid, "method": method, "params": params}) + "\n"); proc.stdin.flush()
    events = []
    while True:
        m = json.loads(proc.stdout.readline())
        if m.get("event"):
            events.append(m); continue
        return m, events


def test_end_to_end_via_sidecar_protocol_and_cache(tmp_path):
    wav = str(tmp_path / "demo.wav")
    y = synth.render_pattern(synth.FOOTWORK_DEMO, 160, bars=16, lead_in=0.3)
    synth.write_wav(wav, y)
    env = {**os.environ, "SP404LEARN_CACHE": str(tmp_path / "cache"),
           "PYTHONPATH": os.path.join(os.path.dirname(__file__), "..")}
    p = subprocess.Popen([PY, "-m", "sidecar.server"], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                         text=True, env=env, cwd=os.path.join(os.path.dirname(__file__), ".."))
    try:
        r, _ = _rpc(p, 1, "ping", {}); assert r["result"]["ok"]
        r, ev = _rpc(p, 2, "analyze", {"path": wav})
        a = r["result"]
        assert abs(a["grid"]["bpm"] - 160) < 1
        ids = [e["data"]["id"] for e in ev if e["data"]["status"] == "done"]
        assert "tempo" in ids and "drums" in ids
        assert len([e for e in a["events"] if e["type"] == "KICK"]) >= 40
        r2, ev2 = _rpc(p, 3, "analyze", {"path": wav})   # second run hits the cache
        assert all(e["data"]["detail"] == "из кэша" for e in ev2 if e["data"]["status"] == "done")
        rec, _ = _rpc(p, 4, "recipe", {"analysis": a})
        assert rec["result"]["tutorialSteps"] and rec["result"]["patterns"][0]["steps"]["KICK"]
        reg, _ = _rpc(p, 5, "regrid", {"analysis": a, "grid": {"bpm": a["grid"]["bpm"] * 2}})
        assert abs(reg["result"]["grid"]["bpm"] - 2 * a["grid"]["bpm"]) < 1e-6
        c, _ = _rpc(p, 6, "course", {"name": "footwork"})
        assert len(c["result"]["lessons"]) == 18
    finally:
        p.kill()
