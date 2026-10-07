"""SP SYSTEM `.spsystem` interchange (LEARN side) — implements the canonical specification in /sp-system-spec.

LEARN keeps its own project format (.sp404learn). A .spsystem package is NEVER converted into it and rewritten from that
representation: the package layer below edits only the files LEARN owns and copies every other entry through byte-for-byte.
"""
from .errors import SpError, Conflict
from . import adapters
from .package import Package, OpenResult, open_bytes, open_path
from .project import Project, LEARN_MODULES, APP
from .fsio import save_file, open_project, recover, lock_path

__all__ = ["adapters", "SpError", "Conflict", "Package", "OpenResult", "open_bytes", "open_path", "Project", "LEARN_MODULES", "APP",
           "save_file", "open_project", "recover", "lock_path"]
