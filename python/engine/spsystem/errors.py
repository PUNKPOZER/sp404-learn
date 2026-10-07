from __future__ import annotations


class SpError(Exception):
    """A package/project problem with a stable code (E_* = error, same vocabulary as DROP's reader)."""

    def __init__(self, code: str, message: str, **extra):
        super().__init__(message)
        self.code, self.message, self.extra = code, message, extra


class Conflict(SpError):
    """The file on disk changed since the project was loaded: nothing was written."""
