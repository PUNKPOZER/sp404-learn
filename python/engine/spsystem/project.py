"""LEARN's view of an open .spsystem package: what LEARN may change, and how a save is planned (spec §11–§13).

LEARN writes only: analysis/track.json, learn/*.json (its modules), manifest.json (shared fields) and, for a project it creates itself,
the source audio. Everything else — DROP's project/*, samples/*, audio/source.*, x-*/ and any unknown entry — is copied raw.
The package is never re-serialised from LEARN's own model, so nothing LEARN does not understand can be lost.
"""
from __future__ import annotations

import copy
import hashlib
import time
import uuid
from typing import Any

from . import schemas, zipio
from .errors import SpError
from .jsonio import stringify
from .package import Module, OpenResult, Package

APP = "sp404-learn"
LEARN_MODULES = ("analysis", "recipe", "progress", "requirements")
DROP_MODULES = ("chops", "samples", "pads", "loops")


def iso(ts: float | None = None) -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(ts if ts is not None else time.time()))


class Project:
    def __init__(self, manifest: dict, pkg: Package | None = None, modules: dict[str, Module] | None = None,
                 base_revision: int = 0, base_fingerprint: dict | None = None, path: str | None = None):
        self.manifest = manifest
        self.pkg = pkg
        self.modules: dict[str, Module] = modules if modules is not None else {
            n: Module(n, d[0], d[2], d[1], d[3]) for n, d in schemas.MODULES.items()}
        self.base_revision = base_revision                  # revision the project was loaded at; 0 for a project not saved yet
        self.base_fingerprint = base_fingerprint
        self.path = path
        self.new_files: dict[str, bytes] = {}
        self.remove_files: list[str] = []
        self.manifest_dirty = False

    # ------------------------------------------------------------------ construction
    @classmethod
    def new(cls, title: str, app_version: str = "", now: float | None = None, source: dict | None = None) -> "Project":
        m: dict[str, Any] = {"format": "sp-system", "formatVersion": 1, "id": str(uuid.uuid4()), "createdBy": APP,
                             "createdAt": iso(now), "title": title}
        if app_version:
            m["createdByVersion"] = app_version
        if source:
            m["source"] = source
        p = cls(m)
        p.manifest_dirty = True
        return p

    @classmethod
    def from_open(cls, res: OpenResult, path: str | None = None) -> "Project":
        if not res.usable or res.package is None:
            raise SpError(res.code or "E_NOT_USABLE", res.message)
        pkg = res.package
        rev = pkg.manifest.get("revision")
        base = rev if isinstance(rev, int) and not isinstance(rev, bool) else 0
        return cls(copy.deepcopy(pkg.manifest), pkg, pkg.modules, base, res.fingerprint, path)

    # ------------------------------------------------------------------ accessors
    @property
    def id(self) -> str:
        return self.manifest["id"]

    @property
    def revision(self) -> int:
        """Revision of what is on disk (0 = never saved)."""
        return self.base_revision

    def module(self, name: str) -> Module:
        return self.modules[name]

    def data(self, name: str):
        m = self.modules[name]
        return m.data if m.status == "ok" or m.created else None

    # ------------------------------------------------------------------ edits (LEARN-owned only)
    def set_module(self, name: str, data: dict) -> None:
        if name not in LEARN_MODULES:
            raise SpError("E_NOT_OWNER", f'module "{name}" is owned by DROP; LEARN does not write it')
        m = self.modules[name]
        if m.status in ("newer", "invalid"):
            raise SpError("E_MODULE_READONLY", f"{m.path} is {m.status} and kept read-only; LEARN cannot replace it")
        errs = schemas.validate(m.schema, data)
        if errs:
            raise SpError("E_INVALID_MODULE_DATA", f"refusing to write invalid {m.path}: {errs[0]['path']} {errs[0]['message']}")
        m.data, m.dirty = data, True
        if m.status == "absent":
            m.created, m.status = True, "ok"

    def set_manifest_field(self, key: str, value) -> None:
        if key in ("format", "formatVersion", "id", "createdBy", "createdAt"):
            raise SpError("E_IMMUTABLE", f"manifest.{key} never changes after creation")
        self.manifest[key] = value
        self.manifest_dirty = True

    def set_user_tempo(self, bpm: float, now: float | None = None, beat_offset: float | None = None) -> None:
        """A BPM the user chose in LEARN (spec §12): manifest.tempo is the working value; analysis keeps raw/userOverride separately."""
        t = dict(self.manifest.get("tempo") or {})
        t.update({"bpm": bpm, "origin": "user", "setBy": APP, "setAt": iso(now)})
        if beat_offset is not None:
            t["beatOffsetSeconds"] = beat_offset
        self.manifest["tempo"] = t
        self.manifest_dirty = True

    def add_file(self, name: str, data: bytes) -> None:
        """Add an entry LEARN creates (only for packages LEARN itself starts, e.g. the embedded source audio)."""
        bad = zipio.vet_name(name, len(name.encode("utf-8")), self._limits())
        if bad or zipio.FORBIDDEN_EXT.search(name) or name.endswith("/"):
            raise SpError(bad or "E_FORBIDDEN_TYPE", f"refusing to add {name!r}")
        if self.pkg is not None and self.pkg.has(name) and not name.startswith("learn/"):
            raise SpError("E_NOT_OWNER", f"{name} already exists in the package and is not LEARN's")
        self.new_files[name] = data

    def _limits(self):
        from .limits import DEFAULT
        return self.pkg.limits if self.pkg else DEFAULT

    # ------------------------------------------------------------------ save planning
    def prepare_save(self, now: float | None = None, version: str = "", copy_: bool = False) -> dict:
        """-> {replace, add, remove, manifest, next_revision}. new project: revision 0 in memory -> first save writes 1; then +1 per save."""
        nxt = 1 if copy_ else self.base_revision + 1
        m = copy.deepcopy(self.manifest)
        if copy_:
            old_id = m["id"]
            m["id"] = str(uuid.uuid4())
            ext = dict(m.get("extensions") or {})
            ext["x-sp404-learn"] = {**(ext.get("x-sp404-learn") or {}), "derivedFrom": old_id}
            m["extensions"] = ext
        m["revision"], m["modifiedAt"], m["modifiedBy"] = nxt, iso(now), APP
        if version:
            m["modifiedByVersion"] = version
        mods = dict(m.get("modules") or {})
        replace: dict[str, bytes] = {}
        add: dict[str, bytes] = {}
        for name in LEARN_MODULES:
            mod = self.modules[name]
            if mod.status != "ok" or mod.data is None:
                continue
            if mod.dirty or mod.created:
                errs = schemas.validate(mod.schema, mod.data)
                if errs:
                    raise SpError("E_INVALID_MODULE_DATA", f"refusing to save invalid {mod.path}: {errs[0]['path']} {errs[0]['message']}")
                (replace if self.pkg is not None and self.pkg.has(mod.path) else add)[mod.path] = stringify(mod.data)
            d = dict(mods.get(name)) if isinstance(mods.get(name), dict) else {}
            d.update({"path": mod.path, "schemaVersion": mod.data.get(mod.version_key, 1), "owner": APP})
            d.pop("sha256", None)                        # stale informational hash
            mods[name] = d
        if mods:
            m["modules"] = mods
        errs = schemas.validate("manifest", m)
        if errs:
            raise SpError("E_INVALID_MODULE_DATA", f"refusing to save invalid manifest: {errs[0]['path']} {errs[0]['message']}")
        replace["manifest.json"] = stringify(m)
        for n, b in self.new_files.items():
            (replace if self.pkg is not None and self.pkg.has(n) else add)[n] = b
        return {"replace": replace, "add": add, "remove": list(self.remove_files), "manifest": m, "next_revision": nxt}

    def after_save(self, res: OpenResult, path: str | None = None) -> None:
        """Adopt the freshly written file as the new baseline (everything is clean again)."""
        fresh = Project.from_open(res, path or self.path)
        self.__dict__.update(fresh.__dict__)


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()
