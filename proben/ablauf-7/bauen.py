"""Собирает пробу «Denk-Raupe Ablauf 7» в один HTML-файл (картинки встраиваются).
Запуск из корня репозитория:  python3 proben/ablauf-7/bauen.py /tmp/ablauf-7.html
Готовый файл в репозиторий не кладётся."""
import sys, os, base64, json
H = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(H, '..', '..', 'src', 'bilder', 'k1') + os.sep
ziel = sys.argv[1] if len(sys.argv) > 1 else '/tmp/denk-raupe-ablauf-7.html'
def uri(p, mime): return 'data:%s;base64,%s' % (mime, base64.b64encode(open(p, 'rb').read()).decode())
bild = {
 'raupe': uri(A+'raupe.webp','image/webp'), 'zwilling': uri(A+'zwilling.webp','image/webp'), 'raupeLiegt': uri(A+'raupe-liegt.webp','image/webp'),
 'blatt': uri(A+'blatt.webp','image/webp'), 'blattGold': uri(A+'blatt-gold.webp','image/webp'),
 'laterne': uri(A+'laterne.webp','image/webp'), 'korbLeer': uri(A+'korb-leer.webp','image/webp'), 'korbVoll': uri(A+'korb-voll.webp','image/webp'),
 'filz': uri(A+'filz.png','image/png'),
}
# Новые картинки «Круг 2», если уже лежат в src/bilder/k1 (фон-луг подхватывается сам)
for datei, name in [('wiese.webp', 'wiese')]:
    if os.path.exists(A + datei): bild[name] = uri(A + datei, 'image/webp')
lies = lambda n: open(os.path.join(H, n), encoding='utf8').read()
html = lies('kopf.html').replace('/*CSS*/', lies('stil.css')).replace('/*BILD*/', json.dumps(bild)) + lies('helfer.js') + lies('logik.js')
open(ziel, 'w', encoding='utf8').write(html)
print(ziel, len(html))
