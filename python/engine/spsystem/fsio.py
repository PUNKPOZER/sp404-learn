"""File adapter for .spsystem: open, atomic save, conflict detection, recovery, safe extraction.

Atomic save (same strategy as DROP, so the two apps can never leave a project missing or half-written):
  1. conflict check — re-open the file on disk and compare (revision, central-directory fingerprint) with the baseline the project was loaded from;
     different -> Conflict, nothing is written (no silent merge, no overwrite);
  2. advisory lock `<file>.lock` (O_EXCL; stale after 10 min or when the pid is gone);
  3. write the new package to a temp file in the SAME directory, flush + fsync;
  4. validate the temp file (opens, same project id, expected revision, every raw-copied entry byte-identical, no entry lost);
  5. back up: COPY the current file to `<file>.bak.tmp`, fsync, replace `<file>.bak` (the original is never renamed away);
  6. os.replace(temp, file) — atomic on POSIX; on Windows MoveFileEx(REPLACE_EXISTING) with short retries;
  7. fsync the directory; re-open the saved file and adopt it as the new baseline.
Any failure removes the temp file and leaves the original untouched.
"""
from __future__ import annotations

import hashlib
import json
import os
import secrets
import socket
import sys
import time
from pathlib import Path
from typing import Callable

from . import zipio
from .errors import Conflict, SpError
from .limits import DEFAULT, LOCK_STALE_MS, Limits
from .package import OpenResult, open_path
from .project import Project


# ------------------------------------------------------------------------------------------------ open
def open_project(path: str, limits: Limits = DEFAULT) -> tuple[OpenResult, Project | None]:
    res = open_path(path, limits)
    return res, (Project.from_open(res, path) if res.usable else None)


# ------------------------------------------------------------------------------------------------ lock
def lock_path(file: str) -> str:
    return file + ".lock"


def _pid_alive(pid: int) -> bool:
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    except OSError:
        return False


def _read_lock(p: str):
    try:
        return json.loads(Path(p).read_text())
    except Exception:
        return None


def _lock_stale(cur) -> bool:
    return not cur or (time.time() * 1000 - cur.get("at", 0) > LOCK_STALE_MS) or (cur.get("host") == socket.gethostname() and not _pid_alive(int(cur.get("pid", 0))))


def _acquire(file: str) -> str:
    p = lock_path(file)
    body = json.dumps({"pid": os.getpid(), "at": int(time.time() * 1000), "host": socket.gethostname()})
    for attempt in (0, 1):
        try:
            fd = os.open(p, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644)
            with os.fdopen(fd, "w") as f:
                f.write(body)
            return p
        except FileExistsError:
            if attempt == 0 and _lock_stale(_read_lock(p)):
                try:
                    os.unlink(p)
                except OSError:
                    pass
                continue
            raise SpError("E_LOCKED", "project is being saved by another process")
    raise SpError("E_LOCKED", "project is being saved by another process")


def _release(p: str | None) -> None:
    if p:
        try:
            os.unlink(p)
        except OSError:
            pass


# ------------------------------------------------------------------------------------------------ helpers
def _fsync_dir(d: str) -> None:
    if sys.platform == "win32":
        return
    try:
        fd = os.open(d, os.O_RDONLY)
        try:
            os.fsync(fd)
        finally:
            os.close(fd)
    except OSError:
        pass


def _replace(src: str, dst: str) -> None:
    for i in range(8):
        try:
            os.replace(src, dst)
            return
        except PermissionError:
            if sys.platform != "win32" or i == 7:
                raise
            time.sleep(0.025 * (i + 1))


def _copy_synced(src: str, dst: str) -> None:
    with open(src, "rb") as a, open(dst, "wb") as b:
        while True:
            chunk = a.read(1 << 20)
            if not chunk:
                break
            b.write(chunk)
        b.flush()
        os.fsync(b.fileno())


def _rm(p: str) -> None:
    try:
        os.unlink(p)
    except OSError:
        pass


# ------------------------------------------------------------------------------------------------ save
def save_file(project: Project, file: str, mode: str = "save", *, hooks: dict[str, Callable] | None = None, overwrite: bool = False,
              now: float | None = None, version: str = "", limits: Limits = DEFAULT) -> dict:
    """mode: "save" (to the path it was opened from) | "saveAs" (new path, same id) | "copy" (new path, NEW id, revision 1).
    Returns {ok, revision, backup, level, id}; raises Conflict (nothing written) or SpError."""
    hooks = hooks or {}
    d, base = os.path.dirname(os.path.abspath(file)), os.path.basename(file)
    tmp = os.path.join(d, f".{base}.{secrets.token_hex(6)}.tmp")
    bak_tmp, bak = file + ".bak.tmp", file + ".bak"
    lock = None
    existed = False
    try:
        lock = _acquire(file)
        existed = os.path.isfile(file)
        if mode == "save" and not existed and project.base_fingerprint:
            raise Conflict("E_CONFLICT", "the project file was removed from disk after it was opened", reason="deleted")
        if (mode in ("saveAs", "copy") or not project.base_fingerprint) and existed and not overwrite:
            raise Conflict("E_EXISTS", "a file with this name already exists", reason="exists")
        if mode == "save" and existed:
            res = open_path(file, limits)
            if not res.usable:
                raise Conflict("E_CONFLICT", f"the file on disk changed and can no longer be read: {res.message}", reason="unreadable")
            if res.manifest.get("id") != project.id:
                raise Conflict("E_CONFLICT", "the file on disk is a different project", reason="other-project")
            disk_rev = res.manifest.get("revision") if isinstance(res.manifest.get("revision"), int) else 0
            fp, b = res.fingerprint, project.base_fingerprint or {}
            if disk_rev != project.base_revision or any(fp.get(k) != b.get(k) for k in ("cdCrc", "size", "entries")):
                raise Conflict("E_CONFLICT", "the project was changed on disk after it was opened", reason="changed",
                               disk={"revision": disk_rev, "modifiedAt": res.manifest.get("modifiedAt"), "modifiedBy": res.manifest.get("modifiedBy")},
                               base={"revision": project.base_revision})
        plan = project.prepare_save(now=now, version=version, copy_=(mode == "copy"))
        old = (project.pkg.src, project.pkg.info) if project.pkg is not None else None
        fd = os.open(tmp, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644)
        with os.fdopen(fd, "wb") as f:
            written, _ = zipio.assemble(old, plan["replace"], plan["add"], plan["remove"], f, now=now)
            if "after_write" in hooks:
                hooks["after_write"](tmp)
            f.flush()
            os.fsync(f.fileno())
        if "after_fsync" in hooks:
            hooks["after_fsync"](tmp)
        bad = _validate_temp(tmp, project, plan, project.pkg, written, limits)
        if bad:
            raise SpError("E_VALIDATE", bad)
        if "before_backup" in hooks:
            hooks["before_backup"](tmp)
        if existed and mode == "save":
            _copy_synced(file, bak_tmp)
            _replace(bak_tmp, bak)
        if "before_rename" in hooks:
            hooks["before_rename"](tmp)
        _replace(tmp, file)
        _fsync_dir(d)
        if mode == "copy":
            return {"ok": True, "copy": True, "revision": plan["next_revision"], "id": plan["manifest"]["id"]}
        res = open_path(file, limits)
        if not res.usable:
            raise SpError("E_VALIDATE", f"saved file did not re-open: {res.message}")
        project.after_save(res, file)
        return {"ok": True, "revision": plan["next_revision"], "id": project.id, "backup": bak if existed and mode == "save" else None, "level": res.level}
    finally:
        _rm(tmp)
        _rm(bak_tmp)
        _release(lock)


def _validate_temp(tmp: str, project: Project, plan: dict, old_pkg, written, limits: Limits) -> str | None:
    res = open_path(tmp, limits)
    if not res.usable:
        return f"written file failed validation: {res.message}"
    if res.manifest.get("id") != plan["manifest"]["id"]:
        return "project id changed"
    if res.manifest.get("revision") != plan["next_revision"]:
        return "unexpected revision"
    for w in written:
        if not w.raw:
            continue
        o = old_pkg.entry(w.name) if old_pkg else None
        if o is None or (o.crc, o.usize, o.csize, o.method) != (w.crc, w.usize, w.csize, w.method):
            return f"copied entry differs from the original: {w.name}"
    names = {e.name for e in res.package.entries}
    if old_pkg:
        for oe in old_pkg.entries:
            if oe.name not in project.remove_files and oe.name not in names:
                return f"entry lost: {oe.name}"
    return None


# ------------------------------------------------------------------------------------------------ recovery
def recover(file: str, cleanup: bool = False) -> dict:
    """Leftovers of an interrupted save. cleanup=True removes temp files and a stale lock (never the project or its .bak)."""
    d, base = os.path.dirname(os.path.abspath(file)), os.path.basename(file)
    names = os.listdir(d)
    temps = [os.path.join(d, n) for n in names if n.startswith(f".{base}.") and n.endswith(".tmp")]
    if base + ".bak.tmp" in names:
        temps.append(os.path.join(d, base + ".bak.tmp"))
    out = {"temps": temps, "canonicalMissing": base not in names, "backup": os.path.join(d, base + ".bak") if base + ".bak" in names else None, "lock": None}
    if base + ".lock" in names:
        cur = _read_lock(lock_path(file))
        out["lock"] = {"stale": _lock_stale(cur), "info": cur}
    if cleanup:
        for t in temps:
            _rm(t)
        if out["lock"] and out["lock"]["stale"]:
            _release(lock_path(file))
    return out


# ------------------------------------------------------------------------------------------------ extraction
def extract_entry(project: Project, name: str, dest_dir: str) -> str:
    """Safely materialise ONE package entry as a loose file (e.g. the source audio for the analysis engine).
    The destination name is derived from the content hash + the entry's base name; nothing is ever written outside dest_dir,
    nothing existing is overwritten with different content, nothing is executed."""
    if project.pkg is None or not project.pkg.has(name):
        raise SpError("E_NO_ENTRY", f"no such entry: {name}")
    data = project.pkg.read(name)
    safe = "".join(c if (c.isalnum() or c in "._-") else "_" for c in os.path.basename(name))[:80] or "entry"
    root = Path(dest_dir).resolve()
    root.mkdir(parents=True, exist_ok=True)
    target = (root / f"{hashlib.sha256(data).hexdigest()[:16]}-{safe}").resolve()
    if target.parent != root:
        raise SpError("E_PATH_UNSAFE", f"entry escapes the target directory: {name}")
    if target.exists():
        if target.stat().st_size == len(data):
            return str(target)
        raise SpError("E_EXISTS", f"refusing to overwrite {target}")
    with open(target, "xb") as f:
        f.write(data)
    return str(target)
