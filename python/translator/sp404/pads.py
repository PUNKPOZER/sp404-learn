"""SP-404MKII pad geometry and the default kit mapping."""
from __future__ import annotations

# Physical layout, top row first. Pads are numbered from bottom-left.
PAD_ROWS = [[13, 14, 15, 16], [9, 10, 11, 12], [5, 6, 7, 8], [1, 2, 3, 4]]

VOICES = ["KICK", "SNARE", "CLAP", "CLOSED_HAT", "OPEN_HAT", "PERCUSSION", "BASS"]
LABELS = {"KICK": "БОЧКА", "SNARE": "СНЕЙР", "CLAP": "КЛЭП", "CLOSED_HAT": "ХЭТ ЗАКР.",
          "OPEN_HAT": "ХЭТ ОТКР.", "PERCUSSION": "ПЕРК.", "BASS": "БАС", "VOCAL": "ВОКАЛ",
          "CHOP": "ЧОП", "FX": "FX", "FILL": "ФИЛЛ", "TEXTURE": "ТЕКСТУРА", "RESAMPLE": "РЕСЭМПЛ"}

DEFAULT_KIT: dict[int, str] = {
    1: "KICK", 2: "SNARE", 3: "CLAP", 4: "CLOSED_HAT",
    5: "OPEN_HAT", 6: "PERCUSSION", 7: "BASS", 8: "VOCAL",
    9: "CHOP", 10: "CHOP", 11: "CHOP", 12: "CHOP",
    13: "FX", 14: "FILL", 15: "TEXTURE", 16: "RESAMPLE",
}


def pad_for(voice: str, kit: dict[int, str] | None = None) -> int | None:
    for pad in sorted((kit or DEFAULT_KIT)):
        if (kit or DEFAULT_KIT)[pad] == voice:
            return pad
    return None


def validate_kit(kit: dict[int, str]) -> None:
    for pad in kit:
        if not 1 <= int(pad) <= 16:
            raise ValueError(f"pad {pad} out of range 1..16")
    if len(set(kit)) != len(kit):
        raise ValueError("duplicate pad")


def normalize_kit(raw: dict) -> dict[int, str]:
    kit = {int(k): v for k, v in raw.items()}
    validate_kit(kit)
    return kit
