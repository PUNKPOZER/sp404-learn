"""Implementation limits (not schema limits). Same defaults as DROP's reader so both apps accept/reject the same packages."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Limits:
    max_entries: int = 2000
    max_name_bytes: int = 240
    max_json_bytes: int = 64 * 1024 * 1024
    max_package_bytes: int = 1024 * 1024 * 1024
    max_entry_bytes: int = 1024 * 1024 * 1024
    max_total_bytes: int = 2 * 1024 * 1024 * 1024
    max_ratio: int = 200
    ratio_min_bytes: int = 1024 * 1024


DEFAULT = Limits()
FORMAT_VERSION_SUPPORTED = 1
MODULE_VERSION_SUPPORTED = 1
TOO_LARGE_MESSAGE = "PROJECT TOO LARGE FOR THIS VERSION OF SP-404 LEARN"
LOCK_STALE_MS = 10 * 60 * 1000
