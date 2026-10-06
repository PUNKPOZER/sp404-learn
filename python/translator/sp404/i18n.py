"""Language of generated text. Russian is the source language; English is given inline: L("Бочка", "Kick").
The sidecar sets the language from the `lang` field of every request (default "ru")."""
from __future__ import annotations

_lang = "ru"


def set_lang(lang: str) -> None:
    global _lang
    _lang = "en" if lang == "en" else "ru"


def get_lang() -> str:
    return _lang


def L(ru: str, en: str | None = None) -> str:
    return en if _lang == "en" and en is not None else ru
