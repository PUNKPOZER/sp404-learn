"""Genre taxonomy for the benchmark and (later) Genre Engine 2.0.

Deliberately small: 17 labels we want to be reliable on, grouped in families. `aliases` map free-text labels
(from manifests, from the current heuristic classifier, from model outputs such as Discogs styles) onto ids."""
from __future__ import annotations

# id -> (family, display name)
GENRES: dict[str, tuple[str, str]] = {
    "house": ("house", "House"), "deep_house": ("house", "Deep House"), "acid_house": ("house", "Acid House"),
    "techno": ("techno", "Techno"), "acid_techno": ("techno", "Acid Techno"),
    "uk_garage": ("uk_breaks", "UK Garage"), "two_step": ("uk_breaks", "2-Step"), "breakbeat": ("uk_breaks", "Breakbeat"),
    "jungle": ("uk_breaks", "Jungle"), "drum_and_bass": ("uk_breaks", "Drum & Bass"),
    "footwork": ("footwork", "Footwork"), "juke": ("footwork", "Juke"),
    "hip_hop": ("hip_hop", "Hip-Hop"), "boom_bap": ("hip_hop", "Boom Bap"), "instrumental_hip_hop": ("hip_hop", "Instrumental Hip-Hop"),
    "ambient": ("ambient", "Ambient"),
    "idm": ("electronic_other", "IDM"), "dub": ("electronic_other", "Dub"), "dubstep": ("uk_breaks", "Dubstep"), "trip_hop": ("hip_hop", "Trip-Hop"),
}
UNKNOWN = "unknown"

ALIASES: dict[str, list[str]] = {
    "dnb": ["drum_and_bass"], "d&b": ["drum_and_bass"], "drum and bass": ["drum_and_bass"], "drum & bass": ["drum_and_bass"],
    "drum n bass": ["drum_and_bass"], "jungle / dnb": ["jungle", "drum_and_bass"], "jungle/dnb": ["jungle", "drum_and_bass"],
    "footwork / juke": ["footwork", "juke"], "juke / footwork": ["footwork", "juke"], "chicago footwork": ["footwork"],
    "garage": ["uk_garage"], "ukg": ["uk_garage"], "uk garage": ["uk_garage"], "2-step": ["two_step"], "2step": ["two_step"],
    "hip hop": ["hip_hop"], "hip-hop": ["hip_hop"], "hiphop": ["hip_hop"], "хип-хоп": ["hip_hop"], "boom-bap": ["boom_bap"],
    "boom bap": ["boom_bap"], "instrumental hip hop": ["instrumental_hip_hop"], "instrumental hip-hop": ["instrumental_hip_hop"],
    "break beat": ["breakbeat"], "breaks": ["breakbeat"], "big beat": ["breakbeat"],
    "deep house": ["deep_house"], "trip hop": ["trip_hop"], "trip-hop": ["trip_hop"], "triphop": ["trip_hop"], "acid house": ["acid_house"], "acid techno": ["acid_techno"],
}


def family(genre: str) -> str | None:
    g = GENRES.get(genre)
    return g[0] if g else None


def normalize(label: str) -> list[str]:
    """Free-text label -> list of taxonomy ids ([] if unknown). A label may map to several ids ("Jungle / DnB")."""
    key = label.strip().lower()
    if key in GENRES:
        return [key]
    if key in ALIASES:
        return list(ALIASES[key])
    key2 = key.replace("-", "_").replace(" ", "_").replace("&", "and")
    return [key2] if key2 in GENRES else []


def families(genres: list[str]) -> set[str]:
    return {f for g in genres if (f := family(g))}
