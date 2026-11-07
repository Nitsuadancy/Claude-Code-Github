"""Encode the demo photos as BlurHash strings (https://blurha.sh) for loading placeholders.
Usage: python3 scripts/demo-photo-blurhash.py assets/photos > src/data/demo-photo-blurhash.ts
import glob, math, os, sys
import numpy as np
from PIL import Image

CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~'

def b83(value, length):
    out = ''
    for i in range(1, length + 1):
        out += CHARS[(value // (83 ** (length - i))) % 83]
    return out

def s2l(v):
    v = v / 255
    return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4

def l2s(v):
    v = max(0, min(1, v))
    return round((v * 12.92 if v <= 0.0031308 else 1.055 * v ** (1 / 2.4) - 0.055) * 255)

def sign_pow(v, e):
    return math.copysign(abs(v) ** e, v)

def encode(path, cx=4, cy=3):
    im = Image.open(path).convert('RGB').resize((64, 43), Image.LANCZOS)
    a = np.asarray(im).astype(np.float64)
    lin = np.vectorize(s2l)(a)
    h, w = lin.shape[:2]
    ys, xs = np.mgrid[0:h, 0:w]
    factors = []
    for j in range(cy):
        for i in range(cx):
            norm = 1 if i == 0 and j == 0 else 2
            basis = norm * np.cos(math.pi * i * xs / w) * np.cos(math.pi * j * ys / h)
            factors.append([(basis * lin[..., c]).sum() / (w * h) for c in range(3)])
    dc, ac = factors[0], factors[1:]
    out = b83((cx - 1) + (cy - 1) * 9, 1)
    max_ac = max(abs(v) for f in ac for v in f) if ac else 1
    q = max(0, min(82, math.floor(max_ac * 166 - 0.5)))
    max_val = (q + 1) / 166
    out += b83(q, 1)
    out += b83((l2s(dc[0]) << 16) + (l2s(dc[1]) << 8) + l2s(dc[2]), 4)
    for f in ac:
        r, g, b = (max(0, min(18, math.floor(sign_pow(v / max_val, 0.5) * 9 + 9.5))) for v in f)
        out += b83(r * 19 * 19 + g * 19 + b, 2)
    return out

print('/** BlurHash placeholders for the demo photos, generated from assets/photos. */')
print('export const DEMO_PHOTO_BLURHASH: Record<string, string> = {')
for p in sorted(glob.glob(os.path.join(sys.argv[1], '*.jpg'))):
    print(f"  '{os.path.basename(p)[:-4]}': '{encode(p)}',")
print('};')
