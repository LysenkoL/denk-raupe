import { TINTE, WEISS, mix } from '../design/farbe';
import { BLAETTER, KOEPFE, type BlattArt, type KopfArt } from '../bilder/bilder';
import type { Form, Sammelzeichen } from './antwort';
import type { PerlenBild } from './perle';

/**
 * Zeichnet Perlen, Blätter und den Kopf als SVG. Jede Perle ist ein eigenes kleines SVG,
 * damit sie ein eigener Knopf sein kann (große Tippfläche, Tastatur, Screenreader).
 *
 * Perle aus fünf Schichten (docs/STIL.md, Abschnitt 7): Kante mit Schatten → Zehner-Ring mit hellem Bogen →
 * Trennring in Tinte → Kern in der Farbe der Einer mit Glanzlicht oben links und Sichelschatten unten →
 * Ziffer mit Saum. Kein dunkler Umriss um die Perle; dieselbe Perle in Aufgabe, Raupe und Vergleich.
 */

/** Radius in SVG-Einheiten; die Größe auf dem Bildschirm setzt CSS */
export const R = 50;
const RAND = 6;
/** Kante: um so viel liegt der Kreis in Kantenfarbe tiefer (≈ 3 px bei einer Perle von 56 px) */
const KANTE = R * 0.1;
/** Zehner-Ring kräftig, damit seine Farbe gut erkennbar ist */
const RING = R * 0.34;
/** Trennring zwischen Zehner-Ring und Kern, in Bildschirm-Pixeln (bleibt bei jeder Perlengröße gleich) */
export const TRENNRING_PX = 2.5;
/** Schatten: warm, weich, nach unten und leicht nach rechts */
const SCHATTEN_RGB = 'rgb(70, 50, 20)';
const f = (v: number) => +v.toFixed(1);

function kapsel(x: number, y: number, w: number, h: number, attrs: string): string {
  return `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(h / 2)}" ${attrs}/>`;
}

export interface Rechteck {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Ellipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** Drehung in Grad */
  winkel: number;
}

/** Lage aller Schichten einer Perle in SVG-Einheiten – reine Rechnung, damit Tests sie prüfen können */
export interface PerlenMasse {
  /** Körper der Perle (Ring oder Kern ohne Ring) */
  koerper: Rechteck;
  /** Kern in der Farbe der Einer */
  kern: Rechteck;
  /** Glanzlicht oben links im Kern */
  glanz: Ellipse;
  /** Kern ohne Sichelschatten: hier ist die Fläche einfarbig */
  hell: Rechteck;
  /** Grundlinie und Mitte des Textes */
  textX: number;
  textY: number;
}

export function perlenMasse(p: PerlenBild): PerlenMasse {
  const w = p.breite * R;
  const koerper = { x: RAND, y: RAND, w, h: 2 * R };
  const kern = p.ring ? { x: RAND + RING, y: RAND + RING, w: w - 2 * RING, h: 2 * R - 2 * RING } : koerper;
  // Glanz im linken Halbkreis des Kerns, oben links, weit genug außen, dass er die Schrift nicht berührt
  const rk = kern.h / 2;
  const mx = kern.x + rk;
  const my = kern.y + rk;
  // (beim Ring steht die zweistellige Zahl breit im kleineren Kern – dort sitzt der Glanz höher)
  const grad = p.ring ? -115 : -135;
  const a = (grad * Math.PI) / 180;
  const abstand = p.ring ? 0.76 : 0.8;
  const glanz = { cx: mx + abstand * rk * Math.cos(a), cy: my + abstand * rk * Math.sin(a), rx: 0.16 * rk, ry: 0.07 * rk, winkel: grad + 90 };
  // Sichelschatten: der helle Kern ist um k kleiner und liegt oben an
  const k = 0.07 * rk;
  const hell = { x: kern.x + k, y: kern.y, w: kern.w - 2 * k, h: kern.h - 2 * k };
  const fs = p.inhalt.typ === 'text' ? R * p.inhalt.groesse : 0;
  return { koerper, kern, glanz, hell, textX: RAND + w / 2, textY: RAND + R + fs * 0.36 };
}

export function formPfad(form: Form, cx: number, cy: number, s: number, fill: string, stroke = TINTE, sw = s * 0.14): string {
  const st = `fill="${fill}" stroke="${stroke}" stroke-width="${f(sw)}" stroke-linejoin="round"`;
  switch (form) {
    case 'kreis':
      return `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(s)}" ${st}/>`;
    case 'quadrat':
      return `<rect x="${f(cx - s * 0.9)}" y="${f(cy - s * 0.9)}" width="${f(s * 1.8)}" height="${f(s * 1.8)}" rx="${f(s * 0.12)}" ${st}/>`;
    case 'dreieck':
      return `<polygon points="${f(cx)},${f(cy - s)} ${f(cx + s * 1.05)},${f(cy + s * 0.8)} ${f(cx - s * 1.05)},${f(cy + s * 0.8)}" ${st}/>`;
    case 'raute':
      return `<polygon points="${f(cx)},${f(cy - s * 1.1)} ${f(cx + s * 0.85)},${f(cy)} ${f(cx)},${f(cy + s * 1.1)} ${f(cx - s * 0.85)},${f(cy)}" ${st}/>`;
    case 'stern': {
      const p: string[] = [];
      for (let i = 0; i < 10; i++) {
        const w = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 ? s * 0.48 : s * 1.08;
        p.push(`${f(cx + rr * Math.cos(w))},${f(cy + 0.08 * s + rr * Math.sin(w))}`);
      }
      return `<polygon points="${p.join(' ')}" ${st}/>`;
    }
  }
}

/** Zeichen der Sammelantworten, dunkel auf heller Perle */
function zeichenPfad(z: Sammelzeichen, cx: number, cy: number, s: number): string {
  const k = `fill="none" stroke="${TINTE}" stroke-width="${f(s * 0.16)}" stroke-linecap="round" stroke-linejoin="round"`;
  const voll = `fill="${TINTE}"`;
  switch (z) {
    case 'reihe':
      return [0, 1, 2]
        .map((i) => `<rect x="${f(cx - s + i * s * 0.75)}" y="${f(cy + s * 0.7 - s * (0.6 + i * 0.5))}" width="${f(s * 0.5)}" height="${f(s * (0.6 + i * 0.5))}" rx="${f(s * 0.1)}" ${voll}/>`)
        .join('');
    case 'gitter': {
      const a = s * 0.9;
      let p = `<rect x="${f(cx - a)}" y="${f(cy - a)}" width="${f(2 * a)}" height="${f(2 * a)}" rx="${f(s * 0.12)}" ${k}/>`;
      for (const t of [-a / 3, a / 3]) p += `<path d="M${f(cx + t)} ${f(cy - a)}V${f(cy + a)}M${f(cx - a)} ${f(cy + t)}H${f(cx + a)}" ${k}/>`;
      return p;
    }
    case 'paar':
      return (
        `<rect x="${f(cx - s * 1.05)}" y="${f(cy - s * 0.75)}" width="${f(s * 1.1)}" height="${f(s * 1.4)}" rx="${f(s * 0.2)}" ${k}/>` +
        `<rect x="${f(cx - s * 0.05)}" y="${f(cy - s * 0.65)}" width="${f(s * 1.1)}" height="${f(s * 1.4)}" rx="${f(s * 0.2)}" fill="#fff" stroke="${TINTE}" stroke-width="${f(s * 0.16)}"/>`
      );
    case 'bau': {
      const a = s * 0.62;
      const q = (x: number, y: number) => `<rect x="${f(x)}" y="${f(y)}" width="${f(a)}" height="${f(a)}" rx="${f(s * 0.08)}" ${k}/>`;
      return q(cx - a * 1.5, cy) + q(cx - a * 0.5, cy) + q(cx + a * 0.5, cy) + q(cx - a, cy - a) + q(cx, cy - a);
    }
    case 'ansicht':
      return (
        `<path d="M${f(cx - s * 1.1)} ${f(cy)}Q${f(cx)} ${f(cy - s * 1.2)} ${f(cx + s * 1.1)} ${f(cy)}Q${f(cx)} ${f(cy + s * 1.2)} ${f(cx - s * 1.1)} ${f(cy)}Z" ${k}/>` +
        `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(s * 0.36)}" ${voll}/>`
      );
    case 'satz':
      return [0.9, 0.55, 0.75].map((l, i) => `<path d="M${f(cx - s)} ${f(cy - s * 0.6 + i * s * 0.6)}h${f(2 * s * l)}" ${k}/>`).join('');
  }
}

/** Maße eines Perlen-SVG (viewBox) für eine Perle der Breite b (in r) */
export function perlenBox(breite: number): { w: number; h: number } {
  return { w: breite * R + 2 * RAND, h: 2 * R + 2 * RAND };
}

/** Innenteil einer Perle (ohne <svg>) */
export function perleInhalt(p: PerlenBild): string {
  const m = perlenMasse(p);
  const { koerper: k, kern, glanz: g, hell } = m;
  let s = '';
  // 1. Schatten (weich, zwei Lagen) und Kante: Kreis in Kantenfarbe, etwas tiefer
  s += kapsel(k.x - 1, k.y + KANTE + 1, k.w + 4, k.h + 4, `fill="${SCHATTEN_RGB}" opacity="0.08"`);
  s += kapsel(k.x + 0.5, k.y + KANTE + 1.5, k.w + 1, k.h + 1, `fill="${SCHATTEN_RGB}" opacity="0.12"`);
  s += kapsel(k.x, k.y + KANTE, k.w, k.h, `fill="${p.kante}"`);
  // 2. Zehner-Ring mit hellem Bogen oben
  if (p.ring) {
    s += kapsel(k.x, k.y, k.w, k.h, `fill="${p.ring}"`);
    const rb = (k.h + kern.h) / 4; // Mitte des Rings
    const mx = k.x + k.w / 2;
    const my = k.y + k.h / 2;
    const pkt = (grad: number) => `${f(mx + rb * Math.cos((grad * Math.PI) / 180))} ${f(my + rb * Math.sin((grad * Math.PI) / 180))}`;
    s += `<path d="M${pkt(-150)}A${f(rb)} ${f(rb)} 0 0 1 ${pkt(-60)}" fill="none" stroke="${WEISS}" stroke-opacity="0.5" stroke-width="${f(RING * 0.28)}" stroke-linecap="round"/>`;
  }
  // 4. Kern: Sichelschatten unten (Kern in Kantenton, darüber der helle Kern), Glanzlicht oben links
  s += kapsel(kern.x, kern.y, kern.w, kern.h, `fill="${mix(p.fuellung, p.kernKante, 0.55)}"`);
  s += kapsel(hell.x, hell.y, hell.w, hell.h, `fill="${p.fuellung}"`);
  s += `<ellipse cx="${f(g.cx)}" cy="${f(g.cy)}" rx="${f(g.rx)}" ry="${f(g.ry)}" fill="${WEISS}" opacity="0.85" transform="rotate(${g.winkel} ${f(g.cx)} ${f(g.cy)})"/>`;
  // 3. Trennring in Tinte zwischen Ring und Kern – Fassung, kein Umriss; nur bei zweistelligen Zahlen.
  //    Er liegt über dem Rand des Kerns und wird darum nach ihm gezeichnet.
  if (p.ring) s += kapsel(kern.x, kern.y, kern.w, kern.h, `fill="none" stroke="${TINTE}" stroke-width="${TRENNRING_PX}" vector-effect="non-scaling-stroke"`);
  // 5. Inhalt: Ziffer oder Wort mit Saum, Form oder Zeichen
  const cx = m.textX;
  const cy = RAND + R;
  const i = p.inhalt;
  if (i.typ === 'text') {
    const fs = R * i.groesse;
    const laenge = i.maxBreite ? ` textLength="${f(i.maxBreite * R)}" lengthAdjust="spacingAndGlyphs"` : '';
    s += `<text x="${f(cx)}" y="${f(m.textY)}" text-anchor="middle" font-size="${f(fs)}" font-weight="800" fill="${i.schrift}" stroke="${i.saum}" stroke-width="${f(fs * SAUM)}" paint-order="stroke" stroke-linejoin="round"${laenge}>${esc(i.text)}</text>`;
  } else if (i.typ === 'form') {
    s += formPfad(i.form, cx, cy + R * 0.04, R * (i.klein ? 0.3 : 0.5), i.farbe);
  } else {
    s += zeichenPfad(i.zeichen, cx, cy, R * 0.5);
  }
  return s;
}

/** Saum der Schrift (Strichbreite im Verhältnis zur Schriftgröße; die Hälfte liegt außen) */
export const SAUM = 0.18;

export function perleSvg(p: PerlenBild, cls = 'perle-svg'): string {
  const { w, h } = perlenBox(p.breite);
  return `<svg class="${cls}" viewBox="0 0 ${f(w)} ${f(h)}" aria-hidden="true">${perleInhalt(p)}</svg>`;
}

/** leere Perle: gestrichelt, weiß – „noch keine Antwort“ */
export function leerSvg(cls = 'perle-svg'): string {
  const { w, h } = perlenBox(2);
  return `<svg class="${cls}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><circle cx="${w / 2}" cy="${h / 2}" r="${R - 2}" fill="#FFFFFF" stroke="#8C9A92" stroke-width="${R * 0.1}" stroke-dasharray="${R * 0.36} ${R * 0.28}"/></svg>`;
}

/** Platz unter dem Blatt beim Zwilling */
export function mulde(): string {
  return `<circle cx="${RAND + R}" cy="${RAND + R}" r="${R - 2}" fill="#E4EEE1" stroke="#B9CDB4" stroke-width="${R * 0.08}"/>`;
}

/** Blatt als Bild (Blätter des Zwillings, Lohn, Korb) */
export function blattImg(art: BlattArt = 'normal', cls = 'blatt-img'): string {
  return `<img class="${cls}" src="${BLAETTER[art]}" alt="" draggable="false">`;
}

/**
 * Kopfkreis = 1,25 Perlen. Der Platz ist 1,5 Perlen breit (Fühler, Blatt und Funken ragen seitlich heraus),
 * die Kopfmitte liegt 0,65 Perlen vom linken Rand und 0,6 Perlen über dem Boden.
 */
const KOPF_D = 1.25;
const MITTE_X = 0.65;
const MITTE_HOEHE = 0.6;

/** Kopf der Raupe: Bild so gelegt, dass der Kopfkreis immer gleich groß und an gleicher Stelle sitzt */
export function kopfHtml(art: KopfArt = 'normal'): string {
  const k = KOEPFE[art];
  const s = KOPF_D / (2 * k.r);
  const style = `width:calc(var(--b) * ${f(k.w * s * 1000) / 1000});left:calc(var(--b) * ${f((MITTE_X - k.mx * s) * 1000) / 1000});bottom:calc(var(--b) * ${f((MITTE_HOEHE - (k.h - k.my) * s) * 1000) / 1000})`;
  return `<span class="kopf-platz" data-kopf="${art}"><img class="kopf" src="${k.src}" alt="" draggable="false" style="${style}"></span>`;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
