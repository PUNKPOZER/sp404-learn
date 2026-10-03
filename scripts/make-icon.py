"""Render the app icon (rounded pad-grid mark) to src-tauri/icons/source.png — numpy only, 4x supersampled."""
import struct, sys, zlib
import numpy as np

N, SS = 1024, 3
W = N * SS
yy, xx = np.mgrid[0:W, 0:W].astype(np.float32) / SS


def rrect(x0, y0, x1, y1, r):
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    qx, qy = np.abs(xx - cx) - ((x1 - x0) / 2 - r), np.abs(yy - cy) - ((y1 - y0) / 2 - r)
    d = np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0) - r
    return np.clip(0.5 - d * SS, 0, 1)            # antialiased coverage


img = np.zeros((W, W, 3), np.float32)
alpha = np.zeros((W, W), np.float32)


def paint(mask, color):
    global img, alpha
    c = np.array(color, np.float32) / 255
    img = img * (1 - mask[..., None]) + c * mask[..., None]
    alpha = np.maximum(alpha, mask)


def hexc(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


base = rrect(40, 40, N - 40, N - 40, 230)
grad = (np.clip((xx + yy) / (2 * N), 0, 1))[..., None]
bg = np.array(hexc("#262d42"), np.float32) / 255 * (1 - grad) + np.array(hexc("#0b0d12"), np.float32) / 255 * grad
img = bg * base[..., None]
alpha = base
paint(rrect(40, 40, N - 40, N - 40, 230) - rrect(52, 52, N - 52, N - 52, 218), hexc("#333a4e"))

LIT = {(0, 2): "#a89bff", (1, 0): "#ff7a6b", (1, 3): "#ffc15e", (2, 1): "#5ef2c0", (3, 0): "#ff7a6b", (3, 2): "#5cc8ff"}
pad, gap, start = 150, 36, (N - (4 * 150 + 3 * 36)) / 2
for r in range(4):
    for c in range(4):
        x0, y0 = start + c * (pad + gap), start + r * (pad + gap)
        col = hexc(LIT.get((r, c), "#2c3348"))
        if (r, c) in LIT:                                       # soft glow under lit pads
            glow = rrect(x0 - 10, y0 - 10, x0 + pad + 10, y0 + pad + 10, 52) * 0.22
            img = img * (1 - glow[..., None]) + (np.array(col, np.float32) / 255) * glow[..., None]
        paint(rrect(x0, y0, x0 + pad, y0 + pad, 46), col)

out = img.reshape(N, SS, N, SS, 3).mean((1, 3))
a = alpha.reshape(N, SS, N, SS).mean((1, 3))
rgba = np.dstack([np.clip(out * 255, 0, 255), np.clip(a * 255, 0, 255)]).astype(np.uint8)
raw = b"".join(b"\x00" + rgba[y].tobytes() for y in range(N))


def chunk(t, d):
    c = struct.pack(">I", len(d)) + t + d
    return c + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)


path = sys.argv[1] if len(sys.argv) > 1 else "src-tauri/icons/source.png"
open(path, "wb").write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", N, N, 8, 6, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw, 6)) + chunk(b"IEND", b""))
print("wrote", path)
