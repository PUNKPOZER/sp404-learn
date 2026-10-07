"""Opened .spsystem package: validated entries, manifest, modules, issues and the validation level (spec §14)."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from . import schemas, zipio
from .errors import SpError
from .jsonio import parse_json, strip_dangerous
from .limits import DEFAULT, FORMAT_VERSION_SUPPORTED, MODULE_VERSION_SUPPORTED, TOO_LARGE_MESSAGE, Limits

AUDIO_SNIFF = {"wav": b"RIFF", "wave": b"RIFF", "flac": b"fLaC", "ogg": b"OggS", "aif": b"FORM", "aiff": b"FORM"}


@dataclass
class Issue:
    severity: str          # "warning" | "error"
    code: str
    message: str
    where: str | None = None


@dataclass
class Module:
    name: str
    path: str
    owner: str
    schema: str
    version_key: str
    status: str = "absent"             # absent | ok | invalid | newer
    data: Any = None
    raw: bytes | None = None
    errors: list[dict] = field(default_factory=list)
    dirty: bool = False
    created: bool = False


@dataclass
class OpenResult:
    level: str                          # VALID | VALID_WITH_WARNINGS | UNSUPPORTED_VERSION | CORRUPTED
    ok: bool
    code: str | None
    message: str
    issues: list[Issue]
    package: "Package | None" = None
    manifest: dict | None = None
    fingerprint: dict | None = None

    @property
    def usable(self) -> bool:
        return self.level in ("VALID", "VALID_WITH_WARNINGS")


class Package:
    def __init__(self, src: zipio.Source, info: zipio.ZipInfo, limits: Limits):
        self.src, self.info, self.limits = src, info, limits
        self.entries = info.entries
        self.manifest: dict = {}
        self.manifest_raw: bytes = b""
        self.modules: dict[str, Module] = {}

    def entry(self, name: str):
        return self.info.by_name.get(name)

    def has(self, name: str) -> bool:
        return name in self.info.by_name

    def read(self, name: str, max_bytes: int | None = None) -> bytes:
        e = self.entry(name)
        if e is None:
            raise SpError("E_NO_ENTRY", f"no such entry: {name}")
        return zipio.read_entry(self.src, e, max_bytes)

    def read_json(self, name: str):
        e = self.entry(name)
        if e is not None and e.usize > self.limits.max_json_bytes:
            raise SpError("E_TOO_LARGE", f"JSON too large: {name}")
        b = self.read(name, self.limits.max_json_bytes)
        return b, parse_json(b)

    def fingerprint(self) -> dict:
        i = self.info
        return {"size": i.file_size, "cdCrc": i.cd_crc, "cdSize": i.cd_size, "entries": len(self.entries)}


def _sniff_ok(head: bytes, ext: str) -> bool:
    if len(head) < 4:
        return False
    if ext in ("wav", "wave"):
        return head[:4] == b"RIFF" and len(head) >= 12 and head[8:12] == b"WAVE"
    if ext in ("flac", "ogg", "oga", "opus", "aif", "aiff"):
        return head[:4] == AUDIO_SNIFF.get(ext, b"OggS")
    if ext == "mp3":
        return head[:3] == b"ID3" or (head[0] == 0xFF and (head[1] & 0xE0) == 0xE0)
    if ext in ("m4a", "mp4", "aac"):
        return head[4:8] == b"ftyp" or (ext == "aac" and head[0] == 0xFF)
    return True


def _looks_executable(h: bytes) -> bool:
    if h[:2] in (b"#!", b"MZ") or h[:4] == b"\x7fELF":
        return True
    return len(h) >= 4 and h[:4] in (b"\xfe\xed\xfa\xce", b"\xfe\xed\xfa\xcf", b"\xce\xfa\xed\xfe", b"\xcf\xfa\xed\xfe", b"\xca\xfe\xba\xbe", b"\xbe\xba\xfe\xca")


def _failure(code, message, issues, level="CORRUPTED", **kw) -> OpenResult:
    return OpenResult(level, False, code, message, issues, **kw)


def open_source(src: zipio.Source, limits: Limits = DEFAULT, learn_app: str = "sp404-learn") -> OpenResult:
    """Never raises for bad input — returns an OpenResult with level CORRUPTED / UNSUPPORTED_VERSION and a code."""
    issues: list[Issue] = []
    try:
        info = zipio.parse(src, limits)
    except SpError as e:
        return _failure(e.code, e.message, issues)
    except Exception as e:                                   # defensive: a parser bug must not crash the app
        return _failure("E_NOT_ZIP", f"cannot read archive: {e}", issues)
    for code, msg, where in info.warnings:
        issues.append(Issue("warning", code, msg, where))
    pkg = Package(src, info, limits)
    try:
        return _load(pkg, issues, learn_app)
    except SpError as e:
        return _failure(e.code, e.message, issues)
    except (ValueError, UnicodeDecodeError) as e:
        return _failure("E_MANIFEST_INVALID", f"manifest.json cannot be read: {e}", issues)


def _load(pkg: Package, issues: list[Issue], learn_app: str) -> OpenResult:
    if pkg.entry("manifest.json") is None:
        return _failure("E_NO_MANIFEST", "manifest.json is missing", issues)
    try:
        mb, manifest = pkg.read_json("manifest.json")
    except SpError as e:
        return _failure(e.code, TOO_LARGE_MESSAGE if e.code == "E_TOO_LARGE" else e.message, issues)
    except ValueError as e:
        return _failure("E_MANIFEST_INVALID", f"manifest.json cannot be parsed: {e}", issues)
    if not isinstance(manifest, dict) or manifest.get("format") != "sp-system":
        return _failure("E_MANIFEST_INVALID", 'manifest.format is not "sp-system"', issues)
    fv = manifest.get("formatVersion")
    if isinstance(fv, int) and not isinstance(fv, bool) and fv > FORMAT_VERSION_SUPPORTED:
        return _failure("E_UNSUPPORTED_VERSION", f"this package uses formatVersion {fv}; this version of SP-404 LEARN supports {FORMAT_VERSION_SUPPORTED}",
                        issues, level="UNSUPPORTED_VERSION", manifest=manifest)
    dropped = strip_dangerous(manifest)
    if dropped:
        issues.append(Issue("warning", "W_PROTO_KEY_DROPPED", f"{dropped} unsafe key(s) removed from manifest.json", "manifest.json"))
    errs = schemas.validate("manifest", manifest)
    if errs:
        return _failure("E_MANIFEST_INVALID", f"manifest.json does not match the schema ({errs[0]['path']}: {errs[0]['message']})", issues)
    pkg.manifest, pkg.manifest_raw = manifest, mb
    _load_modules(pkg, issues)
    unsupported = [i for i in issues if i.severity == "error" and i.code == "E_UNSUPPORTED_VERSION"]
    fatal = [i for i in issues if i.severity == "error" and i.code == "E_TOO_LARGE"]
    if fatal:
        return _failure("E_TOO_LARGE", TOO_LARGE_MESSAGE, issues)
    bad = _sniff(pkg)
    if bad:
        return _failure(bad[0], bad[1], issues)
    _semantic(pkg, issues)
    known = {m.path for m in pkg.modules.values()} | {"manifest.json"}
    src_audio = (manifest.get("source") or {}).get("audio")
    for e in pkg.entries:
        if e.dir or e.name in known or e.name == src_audio:
            continue
        if e.name.startswith(("samples/", "audio/")) or e.name.lower() in ("readme.txt", "readme.md"):
            continue
        issues.append(Issue("warning", "W_UNKNOWN_FILE", f"unknown entry preserved untouched: {e.name}", e.name))
    if unsupported:
        return OpenResult("UNSUPPORTED_VERSION", False, "E_UNSUPPORTED_VERSION", unsupported[0].message, issues, pkg, manifest, pkg.fingerprint())
    level = "VALID_WITH_WARNINGS" if any(i.severity == "warning" for i in issues) else "VALID"
    return OpenResult(level, True, None, "ok", issues, pkg, manifest, pkg.fingerprint())


def _load_modules(pkg: Package, issues: list[Issue]) -> None:
    declared = pkg.manifest.get("modules") or {}
    for name, (dpath, sname, owner, vkey) in schemas.MODULES.items():
        decl = declared.get(name) if isinstance(declared.get(name), dict) else None
        path = decl["path"] if decl and isinstance(decl.get("path"), str) else dpath
        mod = Module(name, path, owner, sname, vkey)
        pkg.modules[name] = mod
        e = pkg.entry(path)
        if e is None:
            if decl:
                issues.append(Issue("warning", "W_MISSING_FILE", f'manifest lists module "{name}" at {path} but the file is missing', path))
            continue
        try:
            raw, data = pkg.read_json(path)
        except SpError as ex:
            mod.status, mod.errors = "invalid", [{"path": "/", "message": ex.message}]
            if ex.code == "E_TOO_LARGE":
                issues.append(Issue("error", "E_TOO_LARGE", TOO_LARGE_MESSAGE, path))
            else:
                issues.append(Issue("warning", "W_MODULE_INVALID", f"{path} cannot be parsed ({ex.message}); kept read-only and byte-identical", path))
            continue
        except ValueError as ex:
            mod.status, mod.errors = "invalid", [{"path": "/", "message": str(ex)}]
            issues.append(Issue("warning", "W_MODULE_INVALID", f"{path} cannot be parsed ({ex}); kept read-only and byte-identical", path))
            continue
        mod.raw, mod.data = raw, data
        ver = data.get(vkey) if isinstance(data, dict) else None
        if isinstance(ver, int) and not isinstance(ver, bool) and ver > MODULE_VERSION_SUPPORTED:
            mod.status = "newer"
            if owner == "sp404-learn":                       # a module LEARN would have to edit but cannot understand
                issues.append(Issue("error", "E_UNSUPPORTED_VERSION", f"{path} uses {vkey} {ver}; supported: {MODULE_VERSION_SUPPORTED}", path))
            else:
                issues.append(Issue("warning", "W_MODULE_NEWER", f"{path} is from a newer version ({ver}); preserved untouched", path))
            continue
        errs = schemas.validate(sname, data)
        if errs:
            mod.status, mod.errors = "invalid", errs
            issues.append(Issue("warning", "W_MODULE_INVALID", f"{path} does not match its schema ({errs[0]['path']}: {errs[0]['message']}); kept read-only and byte-identical", path))
            continue
        mod.status = "ok"
        if owner == "sp404-learn":
            d = strip_dangerous(data)
            if d:
                issues.append(Issue("warning", "W_PROTO_KEY_DROPPED", f"{d} unsafe key(s) removed from {path}", path))


def _semantic(pkg: Package, issues: list[Issue]) -> None:
    """Cross-file consistency: warnings only (data is kept as it is). Same checks and codes as DROP's reader."""
    def ok(n):
        m = pkg.modules.get(n)
        return m.data if m and m.status == "ok" else None

    def dup(lst, label, path):
        seen = set()
        for x in lst:
            if isinstance(x, dict) and isinstance(x.get("id"), str):
                if x["id"] in seen:
                    issues.append(Issue("warning", "W_DUP_ID", f'duplicate {label} id "{x["id"]}"', path))
                seen.add(x["id"])

    chops, samples, pads, loops, analysis = (ok(n) for n in ("chops", "samples", "pads", "loops", "analysis"))
    chop_ids, sample_ids = set(), set()
    if chops:
        dup(chops["chops"], "chop", pkg.modules["chops"].path)
        for c in chops["chops"]:
            chop_ids.add(c["id"])
            if not c["endSeconds"] > c["startSeconds"]:
                issues.append(Issue("warning", "W_BAD_RANGE", f'chop "{c["id"]}" has end <= start', pkg.modules["chops"].path))
    if loops:
        dup(loops["loops"], "loop", pkg.modules["loops"].path)
        for lp in loops["loops"]:
            if not lp["endSeconds"] > lp["startSeconds"]:
                issues.append(Issue("warning", "W_BAD_RANGE", f'loop "{lp["id"]}" has end <= start', pkg.modules["loops"].path))
    if samples:
        dup(samples["samples"], "sample", pkg.modules["samples"].path)
        for s in samples["samples"]:
            sample_ids.add(s["id"])
            if not pkg.has(s["file"]):
                issues.append(Issue("warning", "W_MISSING_FILE", f'sample "{s["id"]}" refers to missing file {s["file"]}', pkg.modules["samples"].path))
            if chops and s.get("sourceChopId") and s["sourceChopId"] not in chop_ids:
                issues.append(Issue("warning", "W_DANGLING_REF", f'sample "{s["id"]}" refers to unknown chop "{s["sourceChopId"]}"', pkg.modules["samples"].path))
    if pads and samples:
        slots = set()
        for a in pads["assignments"]:
            k = f'{a["bank"]}:{a["pad"]}'
            if k in slots:
                issues.append(Issue("warning", "W_DUP_PAD", f"pad {k} is assigned more than once", pkg.modules["pads"].path))
            slots.add(k)
            if a["sampleId"] and a["sampleId"] not in sample_ids:
                issues.append(Issue("warning", "W_DANGLING_REF", f'pad {k} refers to unknown sample "{a["sampleId"]}"', pkg.modules["pads"].path))
    src = pkg.manifest.get("source") or {}
    if src.get("mode") == "portable" and (not src.get("audio") or not pkg.has(src["audio"])):
        issues.append(Issue("warning", "W_MISSING_FILE", "source.mode is portable but the audio file is missing", src.get("audio") or "manifest.json"))
    if analysis and isinstance(src.get("sha256"), str) and isinstance(analysis.get("audioSha256"), str):
        n = min(len(src["sha256"]), len(analysis["audioSha256"]))
        if src["sha256"][:n] != analysis["audioSha256"][:n]:
            issues.append(Issue("warning", "W_STALE_ANALYSIS", "analysis/track.json describes different audio than the source (stale analysis, kept)", pkg.modules["analysis"].path))
    if src.get("mode") == "lightweight" and not (src.get("externalSource") or {}).get("path"):
        issues.append(Issue("warning", "W_SOURCE_MOVED", "source.mode is lightweight but externalSource.path is missing", "manifest.json"))


def _sniff(pkg: Package):
    for e in pkg.entries:
        if e.dir or e.usize == 0 or not e.name.startswith(("samples/", "audio/")):
            continue
        try:
            head = zipio.read_entry(pkg.src, e)[:16] if e.csize <= 8 * 1024 * 1024 else None
        except SpError:
            continue
        if head is None:
            continue
        if _looks_executable(head):
            return "E_FORBIDDEN_TYPE", f"entry looks like an executable: {e.name}"
        ext = e.name.rsplit(".", 1)[-1].lower() if "." in e.name else ""
        if not _sniff_ok(head, ext):
            return "E_SNIFF_MISMATCH", f"entry content does not match its extension: {e.name}"
    return None


def open_bytes(data: bytes, limits: Limits = DEFAULT) -> OpenResult:
    return open_source(zipio.Source(data=data), limits)


def open_path(path: str, limits: Limits = DEFAULT) -> OpenResult:
    try:
        return open_source(zipio.Source(path=path), limits)
    except FileNotFoundError:
        return _failure("E_NO_FILE", f"file not found: {path}", [])
    except OSError as e:
        return _failure("E_IO", str(e), [])
