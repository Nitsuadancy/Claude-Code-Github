"""Build the app icons from the logo's source layers.

The source art is assets/images/logo.png (the full logo on transparent) and
assets/images/rays.png (just its gold rays, same 1024 x 1024 grid). The icons
redraw the rays a little thicker than the logo so they still read at small
sizes (Settings, Spotlight, notifications), and keep the wordmark untouched.

Usage: python3 scripts/build-icons.py
Writes icon.png, android-icon-foreground.png, android-icon-monochrome.png and
favicon.png in assets/images. Needs Pillow and NumPy.
"""
import numpy as np
from PIL import Image, ImageFilter

A = 'assets/images/'
SIZE = 1024
BACKGROUND = (0, 0, 0)
# Between the rays' bright core and their soft edges, so thicker rays read as the same gold.
GOLD = (240, 214, 116)
# The icon's lettering is warm ivory (logo.png's is nearly white).
IVORY = (254, 246, 227)
# How much thicker the rays get: a max filter of this size at 2x, about 1.5px each side at 1024.
GROW = 7
# The Android adaptive icon keeps the logo inside the 66% safe zone.
ANDROID_BOX = (225, 208, 796, 794)


def thick_rays(rays: Image.Image) -> Image.Image:
    a = rays.getchannel('A').resize((SIZE * 2,) * 2, Image.LANCZOS).filter(ImageFilter.MaxFilter(GROW))
    layer = Image.new('RGBA', (SIZE, SIZE), GOLD + (0,))
    layer.putalpha(a.resize((SIZE, SIZE), Image.LANCZOS))
    return layer


def wordmark(logo: Image.Image, rays: Image.Image) -> Image.Image:
    """The logo without its rays: the MANNA lettering on transparent."""
    lg = np.asarray(logo).astype(np.float64)
    no_rays = np.asarray(rays.getchannel('A')) == 0
    alpha = lg[:, :, 3] * no_rays
    band = np.zeros_like(alpha)
    band[400:590, 60:965] = 1  # the lettering's rows; keeps stray ray edges out
    out = Image.new('RGBA', (SIZE, SIZE), IVORY + (0,))
    out.putalpha(Image.fromarray((alpha * band).round().astype('uint8')))
    return out


def fit(src: Image.Image, box) -> Image.Image:
    bbox = src.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    crop = src.crop(bbox)
    w = box[2] - box[0]
    h = round(crop.height * w / crop.width)
    crop = crop.resize((w, h), Image.LANCZOS)
    out = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    out.paste(crop, (box[0], (box[1] + box[3]) // 2 - h // 2), crop)
    return out


def main() -> None:
    logo = Image.open(A + 'logo.png').convert('RGBA')
    rays = Image.open(A + 'rays.png').convert('RGBA')
    art = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    art.alpha_composite(thick_rays(rays))
    art.alpha_composite(wordmark(logo, rays))

    icon = Image.new('RGBA', (SIZE, SIZE), BACKGROUND + (255,))
    icon.alpha_composite(art)
    icon.convert('RGB').save(A + 'icon.png')
    icon.convert('RGB').resize((48, 48), Image.LANCZOS).save(A + 'favicon.png')

    fit(art, ANDROID_BOX).save(A + 'android-icon-foreground.png')
    mono = Image.new('RGBA', (SIZE, SIZE), (255, 255, 255, 0))
    mono.putalpha(fit(art, ANDROID_BOX).getchannel('A'))
    mono.save(A + 'android-icon-monochrome.png')


if __name__ == '__main__':
    main()
