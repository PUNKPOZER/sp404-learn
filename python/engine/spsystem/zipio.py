"""Minimal, strict ZIP reader and writer for .spsystem packages.

Why not `zipfile`: the writer must copy untouched entries **raw** (same compressed bytes, CRC, method, timestamp, attributes)
so unknown data survives byte-for-byte, and the reader must apply the package security rules (spec §21) before anything is read.
Rejected on purpose: ZIP64, encryption, multi-disk archives, symlinks, unsafe/duplicate/case-colliding names, executables,
zip bombs. Entry data is never extracted to disk by this module.
"""
from __future__ import annotations

import re
import struct
import time
import unicodedata
import zlib
from dataclasses import dataclass, field
from typing import BinaryIO, Callable

from .errors import SpError
from .limits import Limits

SIG_LOCAL, SIG_CD, SIG_EOCD, SIG_ZIP64_LOC = 0x04034B50, 0x02014B50, 0x06054B50, 0x07064B50

FORBIDDEN_EXT = re.compile(r"\.(exe|dll|so|dylib|bat|cmd|com|scr|msi|sh|bash|zsh|command|app|jar|apk|ipa|ps1|psm1|vbs|vbe|wsf|hta|lnk|pif|reg|cpl|js|mjs|py|pl|rb|php|appimage|dmg|pkg|deb|rpm|swf)$", re.I)
_CTRL = re.compile(r"[\x00-\x1f\x7f]")


@dataclass
class Entry:
    name: str
    name_bytes: bytes
    flags: int
    method: int
    time: int
    date: int
    crc: int
    csize: int
    usize: int
    version_made: int
    version_needed: int
    ext_attr: int
    int_attr: int
    comment: bytes
    local_off: int
    data_start: int = 0
    data_end: int = 0
    dir: bool = False


def vet_name(name: str, name_len: int, limits: Limits) -> str | None:
    """Error code for an unsafe entry name, else None (mirrors common.schema.json#relPath plus spec §21)."""
    if not name or name_len > limits.max_name_bytes:
        return "E_PATH_UNSAFE"
    if name[0] == "/" or re.match(r"^[A-Za-z]:", name) or "\\" in name or _CTRL.search(name):
        return "E_PATH_UNSAFE"
    for seg in (name[:-1] if name.endswith("/") else name).split("/"):
        if seg in ("", ".", ".."):
            return "E_PATH_UNSAFE"
    return None


def name_key(name: str) -> str:
    return unicodedata.normalize("NFC", name).lower()


class Source:
    """Random-access read-only byte source over a file path or in-memory bytes (no descriptor kept between reads)."""

    def __init__(self, path: str | None = None, data: bytes | None = None):
        self.path, self.data = path, data
        if data is not None:
            self.size = len(data)
        else:
            import os
            self.size = os.stat(path).st_size

    def read(self, off: int, n: int) -> bytes:
        if off < 0 or n < 0:
            return b""
        if self.data is not None:
            return self.data[off:off + n]
        with open(self.path, "rb") as f:
            f.seek(off)
            return f.read(n)


def _fail(code: str, msg: str, **kw):
    raise SpError(code, msg, **kw)


@dataclass
class ZipInfo:
    entries: list[Entry]
    by_name: dict[str, Entry]
    cd_off: int
    cd_size: int
    cd_crc: int
    file_size: int
    warnings: list[tuple[str, str, str | None]] = field(default_factory=list)   # (code, message, where)


def parse(src: Source, limits: Limits) -> ZipInfo:
    """Parse and vet the central directory. Raises SpError(E_*) for anything that makes the package CORRUPTED."""
    size = src.size
    if size > limits.max_package_bytes:
        _fail("E_TOO_LARGE", "package too large")
    if size < 22:
        _fail("E_NOT_ZIP", "file is too small to be a ZIP archive")
    tail_n = min(size, 22 + 65535)
    tail = src.read(size - tail_n, tail_n)
    pos = tail.rfind(struct.pack("<I", SIG_EOCD))
    if pos < 0:
        _fail("E_NOT_ZIP", "not a ZIP archive (no end-of-central-directory record)")
    eocd = tail[pos:pos + 22]
    if len(eocd) < 22:
        _fail("E_NOT_ZIP", "truncated end-of-central-directory record")
    _, disk, cd_disk, n_disk, n_total, cd_size, cd_off, clen = struct.unpack("<IHHHHIIH", eocd)
    abs_eocd = size - tail_n + pos
    if pos >= 20 and tail[pos - 20:pos - 16] == struct.pack("<I", SIG_ZIP64_LOC):
        _fail("E_ZIP64", "ZIP64 archives are not supported")
    if n_total == 0xFFFF or cd_size == 0xFFFFFFFF or cd_off == 0xFFFFFFFF:
        _fail("E_ZIP64", "ZIP64 archives are not supported")
    if disk or cd_disk or n_disk != n_total:
        _fail("E_NOT_ZIP", "multi-disk archives are not supported")
    if n_total > limits.max_entries:
        _fail("E_TOO_MANY_ENTRIES", f"too many entries ({n_total})")
    if cd_off + cd_size > abs_eocd:
        _fail("E_NOT_ZIP", "central directory is out of range")
    cd = src.read(cd_off, cd_size)
    if len(cd) != cd_size:
        _fail("E_NOT_ZIP", "truncated central directory")
    warnings: list[tuple[str, str, str | None]] = []
    entries: list[Entry] = []
    by_name: dict[str, Entry] = {}
    by_key: dict[str, Entry] = {}
    total = 0
    p = 0
    for _ in range(n_total):
        if p + 46 > len(cd) or struct.unpack_from("<I", cd, p)[0] != SIG_CD:
            _fail("E_NOT_ZIP", "bad central directory record")
        (_, vmade, vneed, flags, method, mtime, mdate, crc, csize, usize, nl, xl, cl, dsk, iattr, eattr, loff) = struct.unpack_from("<IHHHHHHIIIHHHHHII", cd, p)
        end = p + 46 + nl + xl + cl
        if end > len(cd):
            _fail("E_NOT_ZIP", "truncated central directory record")
        nb = cd[p + 46:p + 46 + nl]
        comment = cd[p + 46 + nl + xl:end]
        p = end
        if flags & 1 or flags & 0x40:
            _fail("E_ENCRYPTED", "encrypted entries are not supported")
        if csize == 0xFFFFFFFF or usize == 0xFFFFFFFF or loff == 0xFFFFFFFF:
            _fail("E_ZIP64", "ZIP64 archives are not supported")
        if method not in (0, 8):
            _fail("E_NOT_ZIP", f"unsupported compression method {method}")
        try:
            name = nb.decode("utf-8")
        except UnicodeDecodeError:
            if flags & 0x800:
                _fail("E_PATH_UNSAFE", "entry name is not valid UTF-8")
            name = nb.decode("latin-1")
            warnings.append(("W_NAME_ENCODING", "entry name is not UTF-8; read as Latin-1", name))
        bad = vet_name(name, len(nb), limits)
        if bad:
            _fail(bad, f"unsafe entry name: {name!r}")
        is_dir = name.endswith("/")
        if (vmade >> 8) == 3 and ((eattr >> 16) & 0xF000) == 0xA000:
            _fail("E_SYMLINK", f"symbolic link entries are not allowed: {name}")
        if not is_dir and FORBIDDEN_EXT.search(name):
            _fail("E_FORBIDDEN_TYPE", f"executable / script file types are not allowed: {name}")
        if name in by_name:
            _fail("E_DUP_NAME", f"duplicate entry name: {name}")
        key = name_key(name)
        if key in by_key:
            _fail("E_CASE_COLLISION", f"entry names collide on case-insensitive / normalised file systems: {name}")
        if method == 0 and csize != usize:
            _fail("E_SIZE_MISMATCH", f"stored entry size mismatch: {name}")
        if usize > limits.max_entry_bytes:
            _fail("E_TOO_LARGE", f"entry too large: {name}")
        total += usize
        if total > limits.max_total_bytes:
            _fail("E_TOO_LARGE", "total uncompressed size too large")
        if usize > limits.ratio_min_bytes and (csize == 0 or usize / csize > limits.max_ratio):
            _fail("E_RATIO", f"compression ratio too high (possible zip bomb): {name}")
        e = Entry(name, nb, flags, method, mtime, mdate, crc, csize, usize, vmade, vneed, eattr, iattr, comment, loff, dir=is_dir)
        by_name[name] = e
        by_key[key] = e
        entries.append(e)
    if p != cd_size:
        warnings.append(("W_ZIP_TRAILING", "unexpected bytes after the central directory records", None))
    # local headers: cross-check names, locate data, detect overlap
    for e in entries:
        h = src.read(e.local_off, 30)
        if len(h) < 30 or struct.unpack_from("<I", h, 0)[0] != SIG_LOCAL:
            _fail("E_NOT_ZIP", f"bad local header for {e.name}")
        lnl, lxl = struct.unpack_from("<HH", h, 26)
        if src.read(e.local_off + 30, lnl) != e.name_bytes:
            _fail("E_NOT_ZIP", f"local header name does not match central directory: {e.name}")
        e.data_start = e.local_off + 30 + lnl + lxl
        e.data_end = e.data_start + e.csize
        if e.data_end > cd_off:
            _fail("E_NOT_ZIP", f"entry data overlaps the central directory: {e.name}")
    srt = sorted(entries, key=lambda x: x.local_off)
    for a, b in zip(srt, srt[1:]):
        if b.local_off < a.data_end:
            _fail("E_NOT_ZIP", f"overlapping entries: {a.name} / {b.name}")
    import zlib as _z
    return ZipInfo(entries, by_name, cd_off, cd_size, _z.crc32(cd) & 0xFFFFFFFF, size, warnings)


def read_raw(src: Source, e: Entry) -> bytes:
    return src.read(e.data_start, e.csize)


def read_entry(src: Source, e: Entry, max_bytes: int | None = None) -> bytes:
    """Uncompressed bytes of an entry, CRC- and size-checked. Never allocates more than the declared size (+1 probe byte)."""
    if max_bytes is not None and e.usize > max_bytes:
        _fail("E_TOO_LARGE", f"entry too large to buffer: {e.name}")
    raw = read_raw(src, e)
    if len(raw) != e.csize:
        _fail("E_NOT_ZIP", f"truncated entry data: {e.name}")
    if e.method == 0:
        data = raw
    else:
        d = zlib.decompressobj(-15)
        try:
            data = d.decompress(raw, e.usize + 1)
        except zlib.error as ex:
            _fail("E_CRC", f"corrupt compressed data in {e.name}: {ex}")
        if len(data) != e.usize or d.unconsumed_tail:
            _fail("E_SIZE_MISMATCH", f"entry size mismatch: {e.name}")
    if len(data) != e.usize:
        _fail("E_SIZE_MISMATCH", f"entry size mismatch: {e.name}")
    if (zlib.crc32(data) & 0xFFFFFFFF) != e.crc:
        _fail("E_CRC", f"CRC mismatch: {e.name}")
    return data


# --------------------------------------------------------------------------------------- writer
def dos_datetime(ts: float | None = None) -> tuple[int, int]:
    t = time.localtime(ts if ts is not None else time.time())
    year = max(1980, t.tm_year)
    return (t.tm_hour << 11) | (t.tm_min << 5) | (t.tm_sec // 2), ((year - 1980) << 9) | (t.tm_mon << 5) | t.tm_mday


@dataclass
class Written:
    name: str
    crc: int
    usize: int
    csize: int
    method: int
    raw: bool


def assemble(old: tuple[Source, ZipInfo] | None, replace: dict[str, bytes], add: dict[str, bytes], remove: list[str],
             sink: BinaryIO, now: float | None = None, compress: bool = True,
             on_write: Callable[[str], None] | None = None) -> tuple[list[Written], int]:
    """Write a new archive: manifest.json first, then existing entries in their order (raw-copied unless replaced/removed), then new ones.
    Returns (written entries, total size). Raw copies keep compressed bytes, CRC, method, time/date, attributes and comment."""
    t, d = dos_datetime(now)
    removed = set(remove)
    plan: list[tuple[str, Entry | None, bytes | None]] = []
    seen: set[str] = set()
    names_old = [e for e in (old[1].entries if old else [])]
    ordered: list[str] = []
    if "manifest.json" in replace or "manifest.json" in add or any(e.name == "manifest.json" for e in names_old):
        ordered.append("manifest.json")
    ordered += [e.name for e in names_old if e.name != "manifest.json"] + [n for n in add if n != "manifest.json"]
    old_by = old[1].by_name if old else {}
    for n in ordered:
        if n in seen or n in removed:
            continue
        seen.add(n)
        if n in replace:
            plan.append((n, old_by.get(n), replace[n]))
        elif n in add:
            plan.append((n, None, add[n]))
        elif n in old_by:
            plan.append((n, old_by[n], None))
    cd: list[bytes] = []
    written: list[Written] = []
    pos = 0

    def put(b: bytes):
        nonlocal pos
        sink.write(b)
        pos += len(b)

    for name, oe, data in plan:
        if on_write:
            on_write(name)
        local_off = pos
        if data is None:                                         # raw copy of an untouched entry
            assert oe is not None and old is not None
            nb, flags, method, crc, cs, us = oe.name_bytes, oe.flags & ~8, oe.method, oe.crc, oe.csize, oe.usize
            tt, dd, vmade, vneed, eattr, iattr, comment = oe.time, oe.date, oe.version_made, oe.version_needed, oe.ext_attr, oe.int_attr, oe.comment
            body = read_raw(old[0], oe)
            raw = True
        else:
            nb = name.encode("utf-8")
            flags = 0 if name.isascii() else 0x800
            crc, us = zlib.crc32(data) & 0xFFFFFFFF, len(data)
            method, body = 0, data
            if compress and us > 64:
                c = zlib.compressobj(6, zlib.DEFLATED, -15)
                z = c.compress(data) + c.flush()
                if len(z) < us:
                    method, body = 8, z
            cs = len(body)
            tt, dd, vmade, vneed, eattr, iattr, comment = t, d, (3 << 8) | 20, 20, (0o100644 << 16) & 0xFFFFFFFF, 0, b""
            if name.endswith("/"):
                eattr = (0o040755 << 16) & 0xFFFFFFFF
            raw = False
        put(struct.pack("<IHHHHHIIIHH", SIG_LOCAL, vneed, flags, method, tt, dd, crc, cs, us, len(nb), 0) + nb)
        put(body)
        cd.append(struct.pack("<IHHHHHHIIIHHHHHII", SIG_CD, vmade, vneed, flags, method, tt, dd, crc, cs, us, len(nb), 0, len(comment), 0, iattr, eattr, local_off) + nb + comment)
        written.append(Written(name, crc, us, cs, method, raw))
    cd_off = pos
    for rec in cd:
        put(rec)
    put(struct.pack("<IHHHHIIH", SIG_EOCD, 0, 0, len(cd), len(cd), pos - cd_off, cd_off, 0))
    return written, pos
