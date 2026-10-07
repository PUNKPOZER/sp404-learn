from __future__ import annotations

import json

DANGEROUS = ("__proto__", "constructor", "prototype")


def _no_const(x):
    raise ValueError(f"invalid JSON constant {x}")


def parse_json(b: bytes):
    s = b.decode("utf-8")                       # strict
    if s[:1] == "﻿":
        s = s[1:]
    return json.loads(s, parse_constant=_no_const)


def stringify(obj) -> bytes:
    """Same style as DROP: 2-space indent, trailing newline, UTF-8 (non-ASCII kept as is)."""
    return (json.dumps(obj, indent=2, ensure_ascii=False) + "\n").encode("utf-8")


def strip_dangerous(v) -> int:
    """Remove prototype-pollution keys; only applied to files this app rewrites (spec S20). Returns the number removed."""
    n = 0
    if isinstance(v, list):
        for x in v:
            n += strip_dangerous(x)
    elif isinstance(v, dict):
        for k in list(v):
            if k in DANGEROUS:
                del v[k]
                n += 1
            else:
                n += strip_dangerous(v[k])
    return n
