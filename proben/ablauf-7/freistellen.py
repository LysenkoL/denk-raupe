# Вырезает фигуры из листа генератора: белый фон, связанный с краем, становится прозрачным.
# Нужны Pillow и numpy. Использование — см. docs/BILDER.md, «Пакет K1».
import sys, numpy as np
from PIL import Image, ImageDraw, ImageFilter
I, O = sys.argv[1], sys.argv[2]

def freistellen(img):
    """Weißen Hintergrund, der mit dem Rand verbunden ist, transparent machen."""
    rgb = np.asarray(img.convert('RGB')).astype(int)
    mn, mx = rgb.min(2), rgb.max(2)
    weiss = (mn > 232) & (mx - mn < 22)
    m = Image.fromarray((weiss * 255).astype('uint8'), 'L').copy()
    w, h = m.size
    for x in range(0, w, 7):
        for y in (0, h - 1):
            if m.getpixel((x, y)) == 255: ImageDraw.floodfill(m, (x, y), 128)
    for y in range(0, h, 7):
        for x in (0, w - 1):
            if m.getpixel((x, y)) == 255: ImageDraw.floodfill(m, (x, y), 128)
    bg = np.asarray(m) == 128
    alpha = np.where(bg, 0, 255).astype('uint8')
    a = Image.fromarray(alpha, 'L').filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
    out = img.convert('RGBA'); out.putalpha(a)
    return out

def zuschneiden(img, pad=6):
    bbox = img.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()
    x0, y0, x1, y1 = bbox
    return img.crop((max(0, x0 - pad), max(0, y0 - pad), min(img.width, x1 + pad), min(img.height, y1 + pad)))

def raster(datei, zeilen, spalten, namen, maxkante=360):
    im = Image.open(f'{I}/{datei}')
    w, h = im.size
    for r in range(zeilen):
        for c in range(spalten):
            n = namen[r][c]
            if not n: continue
            zelle = im.crop((c * w // spalten, r * h // zeilen, (c + 1) * w // spalten, (r + 1) * h // zeilen))
            t = zuschneiden(freistellen(zelle))
            t.thumbnail((maxkante, maxkante), Image.LANCZOS)
            t.save(f'{O}/{n}.webp', 'WEBP', quality=88)
            print(n, t.size)

raster('18.webp', 2, 2, [['raupe-liegt', 'raupe-hoch'], ['zwilling-liegt', 'zwilling-hoch']], 300)
raster('21.webp', 2, 3, [['blatt', 'blatt-gold', 'laterne'], ['korb-leer', 'korb-voll', 'blume']], 220)
bg = Image.open(f'{I}/15.webp').convert('RGB'); bg.thumbnail((1600, 1600), Image.LANCZOS); bg.save(f'{O}/hintergrund.webp', 'WEBP', quality=80); print('hintergrund', bg.size)
