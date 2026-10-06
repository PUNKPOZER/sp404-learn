"""Rasterise the supplied brand symbol (design-reference/brand-logo.svg) into app icons.

The logo geometry is read from the SVG path and drawn as-is (scaled uniformly, never edited).
Usage:  .venv/bin/python scripts/make-icons.py [--variant ink-red|ink-paper|red-paper] [--out DIR] [--sheet]
"""
import argparse, re, struct, sys, zlib
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
PAPER, INK, RED = (0xF2, 0xF1, 0xEC), (0x19, 0x19, 0x18), (0xFF, 0x2A, 0x1A)
VARIANTS = {"ink-red": (INK, RED), "ink-paper": (INK, PAPER), "red-paper": (RED, PAPER), "red-ink": (RED, INK)}


def flatten_path(d: str, steps: int = 14):
    toks = re.findall(r"[MCLHVZ]|-?\d*\.?\d+(?:e-?\d+)?", d)
    polys, cur, i, pos, cmd = [], [], 0, (0.0, 0.0), None
    num = lambda: float(toks[i])
    while i < len(toks):
        if toks[i] in "MCLHVZ":
            cmd = toks[i]; i += 1
            if cmd == "Z":
                if cur: polys.append(np.array(cur)); cur = []
                continue
        if cmd == "M":
            if cur: polys.append(np.array(cur))
            pos = (num(), float(toks[i + 1])); i += 2; cur = [pos]; cmd = "L"
        elif cmd == "L":
            pos = (num(), float(toks[i + 1])); i += 2; cur.append(pos)
        elif cmd == "H":
            pos = (num(), pos[1]); i += 1; cur.append(pos)
        elif cmd == "V":
            pos = (pos[0], num()); i += 1; cur.append(pos)
        elif cmd == "C":
            p0 = pos; p1 = (num(), float(toks[i + 1])); p2 = (float(toks[i + 2]), float(toks[i + 3])); p3 = (float(toks[i + 4]), float(toks[i + 5])); i += 6
            t = np.linspace(0, 1, steps + 1)[1:, None]
            pts = (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t ** 2 * p2 + t ** 3 * p3
            cur.extend(map(tuple, pts)); pos = p3
    if cur: polys.append(np.array(cur))
    return polys


def fill_nonzero(polys, w, h):
    """Scanline non-zero winding fill on a w×h boolean grid (pixel centres)."""
    mask = np.zeros((h, w), dtype=bool)
    edges = []
    for p in polys:
        q = np.vstack([p, p[:1]])
        for a, b in zip(q[:-1], q[1:]):
            if a[1] != b[1]:
                edges.append((a[0], a[1], b[0], b[1]))
    E = np.array(edges)
    x0, y0, x1, y1 = E[:, 0], E[:, 1], E[:, 2], E[:, 3]
    lo, hi = np.minimum(y0, y1), np.maximum(y0, y1)
    dirn = np.where(y1 > y0, 1, -1)
    for row in range(h):
        yc = row + 0.5
        sel = (lo <= yc) & (yc < hi)
        if not sel.any():
            continue
        xs = x0[sel] + (yc - y0[sel]) * (x1[sel] - x0[sel]) / (y1[sel] - y0[sel])
        order = np.argsort(xs); xs, d = xs[order], dirn[sel][order]
        wind = np.cumsum(d)
        for k in range(len(xs) - 1):
            if wind[k] != 0:
                a, b = int(round(xs[k] - 0.5)), int(round(xs[k + 1] - 0.5))
                if b > a: mask[row, max(a, 0):min(b, w)] = True
    return mask


def rrect_mask(n, inset, radius):
    yy, xx = np.mgrid[0:n, 0:n] + 0.5
    lo, hi = inset, n - inset
    cx, cy = (lo + hi) / 2, (lo + hi) / 2
    qx, qy = np.abs(xx - cx) - ((hi - lo) / 2 - radius), np.abs(yy - cy) - ((hi - lo) / 2 - radius)
    d = np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0) - radius
    return d <= 0


def render(size, variant, cow_height=0.60, ss=None, polys=None, vb=(947, 1072)):
    bg, fg = VARIANTS[variant]
    ss = ss or (4 if size >= 256 else 8)
    n = size * ss
    inset = n * 0.055
    body = rrect_mask(n, inset, (n - 2 * inset) * 0.225)
    scale = n * cow_height / vb[1]
    ox, oy = (n - vb[0] * scale) / 2, (n - vb[1] * scale) / 2 + n * 0.012
    cow = fill_nonzero([p * scale + (ox, oy) for p in polys], n, n)
    img = np.zeros((n, n, 4), np.float32)
    img[body] = (*bg, 255)
    img[cow & body] = (*fg, 255)
    img = img.reshape(size, ss, size, ss, 4).mean((1, 3))
    a = img[..., 3:4] / 255.0
    rgb = np.where(a > 0, img[..., :3] / np.maximum(a, 1e-6), 0)   # un-premultiply the averaged colour
    return np.dstack([np.clip(rgb, 0, 255), img[..., 3]]).astype(np.uint8)


def write_png(path, rgba):
    h, w, _ = rgba.shape
    raw = b"".join(b"\x00" + rgba[y].tobytes() for y in range(h))
    def ch(t, d): c = struct.pack(">I", len(d)) + t + d; return c + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    Path(path).write_bytes(b"\x89PNG\r\n\x1a\n" + ch(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)) + ch(b"IDAT", zlib.compress(raw, 6)) + ch(b"IEND", b""))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--variant", default="ink-red", choices=VARIANTS)
    ap.add_argument("--out", default=str(ROOT / "src-tauri" / "icons"))
    ap.add_argument("--keep-registered", action="store_true", help="keep the ® subpaths of the source logo")
    ap.add_argument("--sheet", action="store_true", help="write a size-comparison contact sheet for all variants instead of the icon")
    a = ap.parse_args()
    svg = (ROOT / "design-reference" / "brand-logo.svg").read_text()
    d = re.search(r' d="([^"]+)"', svg).group(1)
    parts = re.split(r"(?=M)", d)
    if not a.keep_registered:
        parts = parts[:-4]          # the supplied logo ends with a ® made of its last four subpaths; product icons omit it
    polys = flatten_path("".join(parts))
    if a.sheet:
        sizes = [16, 32, 64, 128, 256, 512]
        rows = []
        for v in ("ink-red", "ink-paper"):
            tiles = [render(s, v, polys=polys) for s in sizes]
            W = sum(s + 12 for s in sizes) + 12
            row = np.full((512 + 24, W, 4), (0xF2, 0xF1, 0xEC, 255), np.uint8)
            x = 12
            for s, t in zip(sizes, tiles):
                al = t[..., 3:4] / 255.0
                row[12:12 + s, x:x + s, :3] = (t[..., :3] * al + row[12:12 + s, x:x + s, :3] * (1 - al)).astype(np.uint8)
                x += s + 12
            rows.append(row)
        write_png(Path(a.out) / "icon-sheet.png", np.vstack(rows)); print("sheet written")
        return
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    bg, fg = VARIANTS[a.variant]
    hexc = lambda c: "#%02X%02X%02X" % c
    # favicon: same geometry, same transform logic as the PNG (uniform scale, centred), as a vector
    sc = 0.60 * 100 / 1072 * 10.0
    favicon = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><rect x="55" y="55" width="890" height="890" rx="200" fill="{hexc(bg)}"/>'
               f'<g transform="translate({(1000 - 947 * 0.6 * 1000 / 1072) / 2:.2f} {(1000 - 600) / 2 + 12:.2f}) scale({0.6 * 1000 / 1072:.5f})">'
               f'<path d="{"".join(parts)}" fill="{hexc(fg)}"/></g></svg>')
    pub = ROOT / "public"; pub.mkdir(exist_ok=True); (pub / "favicon.svg").write_text(favicon)
    write_png(out / "source.png", render(1024, a.variant, polys=polys))
    print("wrote", out / "source.png", a.variant)


if __name__ == "__main__":
    main()
