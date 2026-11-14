import { BLATT, GOLD_BLATT, KONTUR, mix } from '../design/farbe';
import type { Form, Sammelzeichen } from './antwort';
import type { PerlenBild } from './perle';
import KOPF from './raupenkopf.png';

/**
 * Zeichnet Perlen, Blätter und den Kopf als SVG – im Stil der Lese-Raupe:
 * Perle mit Verlauf, Glanzlicht und dunklem Umriss. Jede Perle ist ein eigenes kleines SVG,
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

function verlauf(id: string, farbe: string): string {
  return `<radialGradient id="${id}" cx="0.38" cy="0.32" r="0.78" fx="0.3" fy="0.25"><stop offset="0" stop-color="${mix(farbe, '#ffffff', 0.6)}"/><stop offset="0.45" stop-color="${farbe}"/><stop offset="1" stop-color="${mix(farbe, '#000000', 0.28)}"/></radialGradient>`;
}

function kapsel(x: number, y: number, w: number, h: number, attrs: string): string {
  return `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(h / 2)}" ${attrs}/>`;
}

export function formPfad(form: Form, cx: number, cy: number, s: number, fill: string, stroke = KONTUR, sw = s * 0.14): string {
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
  const k = `fill="none" stroke="${KONTUR}" stroke-width="${f(s * 0.16)}" stroke-linecap="round" stroke-linejoin="round"`;
  const voll = `fill="${KONTUR}"`;
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
        `<rect x="${f(cx - s * 0.05)}" y="${f(cy - s * 0.65)}" width="${f(s * 1.1)}" height="${f(s * 1.4)}" rx="${f(s * 0.2)}" fill="#fff" stroke="${KONTUR}" stroke-width="${f(s * 0.16)}"/>`
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
  const id = neueId();
  const { w: bw } = perlenBox(p.breite);
  const w = p.breite * R;
  const x = RAND;
  const y = RAND;
  const cx = bw / 2;
  const cy = RAND + R;
  let defs = verlauf(`${id}f`, p.fuellung);
  let s = '';
  if (p.ring) {
    defs += verlauf(`${id}r`, p.ring);
    const d = R * 0.27;
    s += kapsel(x, y, w, 2 * R, `fill="url(#${id}r)" stroke="${KONTUR}" stroke-width="${f(R * 0.13)}"`);
    s += kapsel(x + d, y + d, w - 2 * d, 2 * R - 2 * d, `fill="url(#${id}f)" stroke="${KONTUR}" stroke-width="${f(R * 0.07)}"`);
  } else {
    s += kapsel(x, y, w, 2 * R, `fill="url(#${id}f)" stroke="${KONTUR}" stroke-width="${f(R * 0.13)}"`);
  }
  // Glanzlicht oben links
  const gx = x + Math.min(R * 0.68, w * 0.34);
  const gy = cy - R * 0.5;
  s += `<ellipse cx="${f(gx)}" cy="${f(gy)}" rx="${f(R * 0.34)}" ry="${f(R * 0.17)}" fill="#fff" opacity="0.8" transform="rotate(-32 ${f(gx)} ${f(gy)})"/>`;
  const i = p.inhalt;
  if (i.typ === 'text') {
    const fs = R * i.groesse;
    const laenge = i.maxBreite ? ` textLength="${f(i.maxBreite * R)}" lengthAdjust="spacingAndGlyphs"` : '';
    s += `<text x="${f(cx)}" y="${f(cy + fs * 0.36)}" text-anchor="middle" font-size="${f(fs)}" font-weight="800" fill="${i.schrift}" stroke="${i.saum}" stroke-width="${f(fs * 0.18)}" paint-order="stroke" stroke-linejoin="round"${laenge}>${esc(i.text)}</text>`;
  } else if (i.typ === 'form') {
    s += formPfad(i.form, cx, cy + R * 0.04, R * (i.klein ? 0.3 : 0.5), i.farbe);
  } else {
    s += zeichenPfad(i.zeichen, cx, cy, R * 0.5);
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

/** ein Blatt; gold = für eine Perle, die beim ersten Vergleichen gleich war */
export function blattPfad(cx: number, cy: number, s: number, gold = false): string {
  const c = gold ? GOLD_BLATT : BLATT;
  const p = (dx: number, dy: number) => `${f(cx + dx * s)} ${f(cy + dy * s)}`;
  return (
    `<path d="M${p(-1, 0.14)} Q${p(-0.5, -1.07)} ${p(1, -0.29)} Q${p(0.57, 1.07)} ${p(-1, 0.14)} Z" fill="${c.flaeche}" stroke="${c.ader}" stroke-width="${f(s * 0.09)}" stroke-linejoin="round"/>` +
    `<path d="M${p(-0.86, 0.11)} Q${p(0, -0.07)} ${p(0.86, -0.25)}" fill="none" stroke="${c.ader}" stroke-width="${f(s * 0.07)}" stroke-linecap="round"/>`
  );
}

export function blattSvg(gold = false, cls = 'blatt-svg'): string {
  return `<svg class="${cls}" viewBox="-36 -36 72 72" aria-hidden="true">${blattPfad(0, 0, 32, gold)}</svg>`;
}

/** Kopf der Raupe – derselbe wie bei der Lese-Raupe (Bild vom App-Icon) */
export const KOPF_BILD = { src: KOPF as string, w: 168, h: 200, mx: 75.7, my: 131.1, r: 72 };

export function kopfImg(cls = 'kopf'): string {
  return `<img class="${cls}" src="${KOPF_BILD.src}" alt="" width="${KOPF_BILD.w}" height="${KOPF_BILD.h}" draggable="false">`;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
