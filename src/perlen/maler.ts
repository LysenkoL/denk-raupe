import { SCHATTEN, TINTE, formRand, kanteVon, mix } from '../design/farbe';
import { BLAETTER, KOEPFE, type BlattArt, type KopfArt } from '../bilder/bilder';
import type { Form, Sammelzeichen } from './antwort';
import type { PerlenBild } from './perle';

/**
 * Zeichnet Perlen, Blätter und den Kopf als SVG (docs/STIL.md, „Бусина: пять слоёв“):
 * Glasperle mit Kante, ohne dunklen Umriss. Jede Perle ist ein eigenes kleines SVG,
 * damit sie ein eigener Knopf sein kann (große Tippfläche, Tastatur, Screenreader).
 */

/** Radius in SVG-Einheiten; die Größe auf dem Bildschirm setzt CSS */
export const R = 50;
const RAND = 6;
const f = (v: number) => +v.toFixed(1);

let zaehler = 0;
/** eindeutige IDs je SVG: gleiche IDs in verschiedenen SVGs brechen, sobald eines davon versteckt ist */
function neueId(): string {
  return `dr${(++zaehler).toString(36)}`;
}

/** Glas: hell oben links, volle Farbe in der Mitte, zum Rand hin in Richtung Kante */
function verlauf(id: string, farbe: string): string {
  return `<radialGradient id="${id}" cx="0.4" cy="0.36" r="0.75" fx="0.32" fy="0.26"><stop offset="0" stop-color="${mix(farbe, '#ffffff', 0.4)}"/><stop offset="0.55" stop-color="${farbe}"/><stop offset="1" stop-color="${mix(farbe, kanteVon(farbe), 0.6)}"/></radialGradient>`;
}

function kapsel(x: number, y: number, w: number, h: number, attrs: string): string {
  return `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(h / 2)}" ${attrs}/>`;
}

export function formPfad(form: Form, cx: number, cy: number, s: number, fill: string, stroke = formRand(fill), sw = s * 0.14): string {
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

/** Kante: so weit liegt der Perlenkörper über seiner Kante (in SVG-Einheiten, ≈ 3 px bei 48-px-Perle) */
const KANTE = R * 0.12;
/** Zehner-Ring: so breit ist er */
const RING = R * 0.34;
/** Trennring aus Tinte, ≈ 2,5 px sichtbar (die Linie liegt halb unter dem Kern, daher doppelt gezeichnet) */
const TRENN = R * 0.12;

export interface PerlenLage {
  /** Mitte des Perlenkörpers */
  cx: number;
  cy: number;
  /** Radius und Breite des Körpers */
  rk: number;
  wk: number;
  /** Kern (Füllung der Einer) */
  kern: { x: number; y: number; w: number; h: number };
  /** Glanzlicht als Ellipse */
  glanz: { cx: number; cy: number; rx: number; ry: number };
}

/** Geometrie einer Perle – getrennt vom Zeichnen, damit Tests prüfen können, dass der Glanz die Schrift nicht berührt */
export function perlenLage(p: PerlenBild): PerlenLage {
  const { w: bw } = perlenBox(p.breite);
  const rk = R - KANTE / 2;
  const wk = p.breite * R - KANTE;
  const cx = bw / 2;
  const cy = RAND + rk;
  const d = p.ring ? RING : 0;
  const kern = { x: cx - wk / 2 + d, y: cy - rk + d, w: wk - 2 * d, h: 2 * (rk - d) };
  const rc = kern.h / 2;
  // Glanz oben links im Kern, über der Schrift
  const gcx = kern.x + rc * 0.62;
  const gcy = cy - rc * 0.66;
  return { cx, cy, rk, wk, kern, glanz: { cx: gcx, cy: gcy, rx: rc * 0.3, ry: rc * 0.1 } };
}

/** Innenteil einer Perle (ohne <svg>): Kante, Zehner-Ring, Trennring, Kern mit Glanz, Inhalt */
export function perleInhalt(p: PerlenBild): string {
  const id = neueId();
  const L = perlenLage(p);
  const aussen = p.ring ?? p.fuellung;
  const kx = L.cx - L.wk / 2;
  const ky = L.cy - L.rk;
  let defs = verlauf(`${id}f`, p.fuellung);
  // 1. weicher Schatten und Kante
  defs += `<radialGradient id="${id}s"><stop offset="0" stop-color="${SCHATTEN}"/><stop offset="1" stop-color="${SCHATTEN}" stop-opacity="0"/></radialGradient>`;
  let s = `<ellipse cx="${f(L.cx)}" cy="${f(ky + 2 * L.rk + KANTE - 2)}" rx="${f(L.wk / 2 + 2)}" ry="${f(R * 0.2)}" fill="url(#${id}s)"/>`;
  s += kapsel(kx, ky + KANTE, L.wk, 2 * L.rk, `fill="${kanteVon(aussen)}"`);
  if (p.ring) {
    // 2. Zehner-Ring mit heller Lichtkante oben
    defs += verlauf(`${id}r`, p.ring);
    s += kapsel(kx, ky, L.wk, 2 * L.rk, `fill="url(#${id}r)"`);
    s += `<path d="M${f(kx + L.rk * 0.45)} ${f(L.cy - L.rk * 0.55)}A${f(L.rk * 0.82)} ${f(L.rk * 0.82)} 0 0 1 ${f(kx + L.rk * 1.2)} ${f(ky + L.rk * 0.2)}" fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="${f(R * 0.07)}" stroke-linecap="round"/>`;
    // 3. Trennring aus Tinte
    s += kapsel(L.kern.x, L.kern.y, L.kern.w, L.kern.h, `fill="${TINTE}" stroke="${TINTE}" stroke-width="${f(2 * TRENN)}"`);
  }
  // 4. Kern: Füllung der Einer, sichelförmiger Schatten unten, Glanz oben links
  const k = L.kern;
  s += kapsel(k.x, k.y, k.w, k.h, `fill="url(#${id}f)"`);
  defs += `<clipPath id="${id}k">${kapsel(k.x, k.y, k.w, k.h, '')}</clipPath>`;
  s += `<ellipse cx="${f(L.cx)}" cy="${f(k.y + k.h * 1.12)}" rx="${f(k.w * 0.62)}" ry="${f(k.h * 0.42)}" fill="${kanteVon(p.fuellung)}" opacity="0.45" clip-path="url(#${id}k)"/>`;
  const g = L.glanz;
  s += `<ellipse cx="${f(g.cx)}" cy="${f(g.cy)}" rx="${f(g.rx)}" ry="${f(g.ry)}" fill="#fff" opacity="0.85" transform="rotate(-24 ${f(g.cx)} ${f(g.cy)})"/>`;
  // 5. Inhalt
  const i = p.inhalt;
  if (i.typ === 'text') {
    const fs = R * i.groesse;
    const laenge = i.maxBreite ? ` textLength="${f(i.maxBreite * R)}" lengthAdjust="spacingAndGlyphs"` : '';
    s += `<text x="${f(L.cx)}" y="${f(L.cy + fs * 0.36)}" text-anchor="middle" font-size="${f(fs)}" font-weight="800" fill="${i.schrift}" stroke="${i.saum}" stroke-width="${f(fs * 0.12)}" paint-order="stroke" stroke-linejoin="round"${laenge}>${esc(i.text)}</text>`;
  } else if (i.typ === 'form') {
    s += formPfad(i.form, L.cx, L.cy + R * 0.04, R * (i.klein ? 0.3 : 0.5), i.farbe);
  } else {
    s += zeichenPfad(i.zeichen, L.cx, L.cy, R * 0.5);
  }
  return `<defs>${defs}</defs>${s}`;
}

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
