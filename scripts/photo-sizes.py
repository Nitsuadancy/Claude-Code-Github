"""Make the demo photos load fast and appear in one go.

For every assets/photos/<name>.jpg (the full 2100 x 1400 photo, used for full-screen
heroes) this writes two smaller copies:

  assets/photos/card/<name>.jpg   1200 x 800, for feed cards and other half-screen photos
  assets/photos/thumb/<name>.jpg   480 x 320, for menu thumbnails and small tiles

All sizes are baseline (not progressive) JPEGs, which phones and browsers draw in one pass
instead of blurry-then-sharp. The full photos are converted without any loss of quality
(jpegtran); the smaller ones are resized from them.

Usage: python3 scripts/photo-sizes.py   (needs Pillow and jpegtran)
"""
import glob
import os
import subprocess

from PIL import Image

ROOT = 'assets/photos'
SIZES = {'card': (1200, 800, 84), 'thumb': (480, 320, 82)}


def save(im: Image.Image, path: str, quality: int) -> None:
    im.save(path, 'JPEG', quality=quality, optimize=True, progressive=False, subsampling='4:2:0')


def main() -> None:
    for folder in SIZES:
        os.makedirs(os.path.join(ROOT, folder), exist_ok=True)
    for path in sorted(glob.glob(os.path.join(ROOT, '*.jpg'))):
        name = os.path.basename(path)
        if Image.open(path).info.get('progressive'):
            # Lossless: rewrites the same image data as a baseline JPEG.
            subprocess.run(['jpegtran', '-copy', 'all', '-optimize', '-outfile', path + '.tmp', path], check=True)
            os.replace(path + '.tmp', path)
        im = Image.open(path).convert('RGB')
        for folder, (w, h, q) in SIZES.items():
            save(im.resize((w, h), Image.LANCZOS), os.path.join(ROOT, folder, name), q)
        print(name, *(f"{folder} {os.path.getsize(os.path.join(ROOT, folder, name)) // 1024}KB" for folder in SIZES))


if __name__ == '__main__':
    main()
