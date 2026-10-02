"""DEV ONLY: expose the sidecar methods over localhost HTTP so the UI can be exercised in a
normal browser (the desktop app never uses this; it talks to the sidecar over stdio).
Binds to 127.0.0.1 only."""
from __future__ import annotations

import json
import os
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from sidecar import server as srv

CACHE = os.environ.get("SP404LEARN_CACHE") or os.path.join(tempfile.gettempdir(), "sp404learn-dev-cache")
S = srv.Server(CACHE)


class H(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")

    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()

    def do_GET(self):   # dev only: serve stem WAVs from the cache dir so the browser can play them
        from urllib.parse import urlparse, parse_qs
        q = parse_qs(urlparse(self.path).query)
        path = os.path.realpath((q.get("path") or [""])[0])
        if not path.startswith(os.path.realpath(CACHE)) or not os.path.isfile(path):
            self.send_response(404); self._cors(); self.end_headers(); return
        data = open(path, "rb").read()
        self.send_response(200); self._cors()
        self.send_header("Content-Type", "audio/wav"); self.send_header("Content-Length", str(len(data)))
        self.end_headers(); self.wfile.write(data)

    def do_POST(self):
        body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        if self.path == "/upload":
            name = os.path.basename(self.headers.get("X-Filename", "upload.wav"))
            d = tempfile.mkdtemp(prefix="sp404learn-up-")
            path = os.path.join(d, name)
            open(path, "wb").write(body)
            return self._json({"path": path})
        req = json.loads(body)
        events, out = [], {}
        srv.send = lambda m: (events.append(m["data"]) if m.get("event") else out.update(m))  # type: ignore
        S.analyzer.cancel_flag.clear()
        S.handle(json.dumps(req))
        out["events"] = events
        self._json(out)

    def _json(self, obj):
        data = json.dumps(obj).encode()
        self.send_response(200); self._cors()
        self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(data)))
        self.end_headers(); self.wfile.write(data)

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 8404), H).serve_forever()
