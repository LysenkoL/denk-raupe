import { FIGUR_TOKEN as F, HOLZ_KANTE, LATERNE, LATERNE_KANTE, SCHATTEN, TINTE, TINTE_LEISE, WEISS, ZIFFER_FARBEN, ZIFFER_KANTEN, mix } from '../design/farbe';

/**
 * Vorläufige Figuren als SVG (docs/STIL.md, Abschnitt 11), bis die Bilder aus Paket K1 kommen:
 * Vorderteil der Raupe und des Zwillings, Filzblatt (gewöhnlich und golden), Korb, Marke „hier tippen“.
 * Ohne Kontur: Form aus Fläche, Licht oben links (Verlauf), Kante unten. Farben aus FIGUR_TOKEN.
 *
 * Wer ein Bild aus K1 einsetzt, ändert nur src/bilder/bilder.ts – die Kästen (viewBox) hier sind die
 * Maße, auf die sich die Seite verlässt.
 */

/** Kasten des Vorderteils in Einheiten: eine Perle ist 100 breit */
export const VORNE = { w: 120, h: 150, /** Mitte und Radius des ersten Segments – hier schließt das Nest an */ sx: 60, sy: 118, sr: 33 } as const;
export const BLATT_BOX = { w: 140, h: 100 } as const;
export const KORB_BOX = { w: 120, h: 104 } as const;

export type Ausdruck = 'ruhig' | 'denkt' | 'freude' | 'staunt';

let zaehler = 0;
const id = (s: string) => `${s}-${++zaehler}`;

function samt(gid: string, licht: string, mitte: string, kante: string): string {
  return `<radialGradient id="${gid}" cx="0.36" cy="0.3" r="0.78"><stop offset="0" stop-color="${licht}"/><stop offset="0.55" stop-color="${mitte}"/><stop offset="1" stop-color="${kante}"/></radialGradient>`;
}

/** Augen mit Lid (Blinzeln), Pupillen (folgen dem Ort der Handlung) – je Ausdruck */
function augen(a: Ausdruck): string {
  const lx = 45;
  const rx = 75;
  const y = 48;
  if (a === 'freude') {
    // zufriedene Bögen statt offener Augen
    const bogen = (x: number) => `<path d="M${x - 9} ${y + 3}Q${x} ${y - 9} ${x + 9} ${y + 3}" fill="none" stroke="${TINTE}" stroke-width="4.2" stroke-linecap="round"/>`;
    return bogen(lx) + bogen(rx);
  }
  const ry = a === 'staunt' ? 13 : 11.5;
  const weiss = (x: number) => `<ellipse cx="${x}" cy="${y}" rx="10" ry="${ry}" fill="${F.auge}"/>`;
  // „denkt“: Blick nach oben zur Seite
  const dx = a === 'denkt' ? 3 : 1;
  const dy = a === 'denkt' ? -4 : 2;
  const pupille = (x: number) =>
    `<circle cx="${x + dx}" cy="${y + dy}" r="${a === 'staunt' ? 5.6 : 6.2}" fill="${TINTE}"/><circle cx="${x + dx - 2.4}" cy="${y + dy - 2.6}" r="2.1" fill="${WEISS}"/>`;
  const lid = (x: number) => `<ellipse class="lid" cx="${x}" cy="${y}" rx="11" ry="${ry + 1}" fill="${F.raupe}"/>`;
  let s = weiss(lx) + weiss(rx) + `<g class="pupillen">${pupille(lx)}${pupille(rx)}</g>` + lid(lx) + lid(rx);
  if (a === 'denkt') s += `<path d="M${rx - 8} ${y - 17}Q${rx} ${y - 22} ${rx + 9} ${y - 16}" fill="none" stroke="${F['raupe-kante']}" stroke-width="3.4" stroke-linecap="round"/>`;
  return s;
}

function mund(a: Ausdruck): string {
  const k = `fill="none" stroke="${F['raupe-kante']}" stroke-width="3.4" stroke-linecap="round"`;
  if (a === 'freude') return `<path d="M49 66Q60 79 71 66" fill="${F['halstuch-kante']}" opacity="0.85"/><path d="M49 66Q60 79 71 66" ${k}/>`;
  if (a === 'staunt') return `<ellipse cx="60" cy="71" rx="4.5" ry="5.5" fill="${F['raupe-kante']}"/>`;
  if (a === 'denkt') return `<path d="M54 71Q61 69 67 72" ${k}/>`;
  return `<path d="M52 68Q60 75 68 68" ${k}/>`;
}

/** Halstuch der Raupe: Band um den Hals, Dreieck vorn, Knoten an der Seite */
function halstuch(): string {
  const c = F.halstuch;
  const k = F['halstuch-kante'];
  return (
    `<path d="M30 84Q60 97 90 84L92 92Q60 105 28 92Z" fill="${k}"/>` +
    `<path d="M36 89Q60 99 84 89L63 120Q60 124 57 120Z" fill="${c}" stroke="${c}" stroke-width="4" stroke-linejoin="round"/>` +
    `<path d="M48 97Q60 101 72 97L62 113Q60 116 58 113Z" fill="${k}" opacity="0.28"/>` +
    `<path d="M88 86l11 7-3 10z" fill="${c}"/><path d="M88 86l13-1-2 10z" fill="${k}"/><circle cx="89" cy="88" r="5.5" fill="${c}"/>`
  );
}

/** Fliege des Zwillings: zwei Dreiecke und ein Knoten */
function fliege(): string {
  const c = F.fliege;
  const k = F['fliege-kante'];
  return (
    `<path d="M60 92L37 80Q33 92 37 104Z" fill="${c}" stroke="${c}" stroke-width="5" stroke-linejoin="round"/>` +
    `<path d="M60 92L83 80Q87 92 83 104Z" fill="${c}" stroke="${c}" stroke-width="5" stroke-linejoin="round"/>` +
    `<path d="M60 92L37 98Q36 102 37 104Z" fill="${k}" opacity="0.45"/><path d="M60 92L83 98Q84 102 83 104Z" fill="${k}" opacity="0.45"/>` +
    `<rect x="53" y="85" width="14" height="14" rx="5" fill="${k}"/>`
  );
}

/**
 * Vorderteil (Kopf, Kleidungsstück, erstes Segment, zwei Vorderbeine), aufgerichtet. Kasten `VORNE`.
 * Klassen für die Bewegung (app.css): .fuehler (wiegen), .lid (blinzeln), .pupillen (folgen).
 */
export function vorderteilSvg(wer: 'kind' | 'zwilling', a: Ausdruck = 'ruhig'): string {
  const g = id('samt');
  const gs = id('seg');
  const r = F.raupe;
  const k = F['raupe-kante'];
  const fuehler = (x0: number, x1: number, kipp: number) =>
    `<path d="M${x0} 22Q${x0 + kipp * 0.4} 9 ${x1} 5" fill="none" stroke="${k}" stroke-width="4" stroke-linecap="round"/><circle cx="${x1}" cy="5" r="5.2" fill="${F.fuehler}"/><circle cx="${x1 - 1.5}" cy="3.4" r="1.7" fill="${WEISS}" opacity="0.7"/>`;
  let s = `<defs>${samt(g, F['raupe-licht'], r, k)}${samt(gs, F['raupe-licht'], r, k)}</defs>`;
  // Beine: kleine Stummel am Segment, vorn und unten
  s += `<ellipse cx="33" cy="134" rx="8" ry="11" fill="${k}" transform="rotate(28 33 134)"/><ellipse cx="87" cy="134" rx="8" ry="11" fill="${k}" transform="rotate(-28 87 134)"/>`;
  s += `<ellipse cx="31" cy="138" rx="4.5" ry="4" fill="${F['raupe-licht']}" opacity="0.6"/><ellipse cx="89" cy="138" rx="4.5" ry="4" fill="${F['raupe-licht']}" opacity="0.6"/>`;
  // erstes Segment
  s += `<circle cx="${VORNE.sx}" cy="${VORNE.sy}" r="${VORNE.sr}" fill="url(#${gs})"/>`;
  // Fühler hinter dem Kopf
  s += `<g class="fuehler">${fuehler(44, 34, -8)}${fuehler(76, 86, 8)}</g>`;
  // Kopf mit Samt, Schatten unter dem Kinn
  s += `<ellipse cx="60" cy="92" rx="30" ry="8" fill="${k}" opacity="0.45"/>`;
  s += `<ellipse cx="60" cy="52" rx="42" ry="39" fill="url(#${g})"/>`;
  s += `<ellipse cx="44" cy="30" rx="13" ry="7" fill="${WEISS}" opacity="0.22" transform="rotate(-24 44 30)"/>`;
  s += `<ellipse cx="34" cy="65" rx="8" ry="5" fill="${F['raupe-wange']}" opacity="0.6"/><ellipse cx="86" cy="65" rx="8" ry="5" fill="${F['raupe-wange']}" opacity="0.6"/>`;
  s += augen(wer === 'zwilling' ? 'ruhig' : a) + mund(wer === 'zwilling' ? 'ruhig' : a);
  s += wer === 'kind' ? halstuch() : fliege();
  return `<svg class="figur-svg" viewBox="0 0 ${VORNE.w} ${VORNE.h}" aria-hidden="true">${s}</svg>`;
}

/** Filzblatt: Stiel links (Drehpunkt beim Wackeln), Spitze rechts; golden mit eigenen Adern */
export function blattSvg(gold = false): string {
  const g = id('filz');
  const c = gold ? F['blatt-gold'] : F.blatt;
  const k = gold ? F['blatt-gold-kante'] : F['blatt-kante'];
  const ader = gold ? F['blatt-gold-ader'] : F['blatt-ader'];
  const licht = gold ? F['blatt-gold-licht'] : F['blatt-licht'];
  const form = 'M14 52C30 18 78 6 132 22C118 70 74 94 22 70C18 64 15 58 14 52Z';
  let s = `<defs>${samt(g, licht, c, k)}</defs>`;
  // Kante unten: dieselbe Form, etwas tiefer
  s += `<path d="${form}" fill="${k}" transform="translate(0 4)"/>`;
  s += `<path d="${form}" fill="url(#${g})"/>`;
  // Stiel
  s += `<path d="M2 60Q9 56 16 53" fill="none" stroke="${k}" stroke-width="5" stroke-linecap="round"/>`;
  // Mittelrippe und Adern
  s += `<path d="M16 53Q70 40 128 24" fill="none" stroke="${ader}" stroke-width="3.6" stroke-linecap="round"/>`;
  const adern = gold
    ? // golden: fächerförmig, dazu feine Doppeladern
      [
        [40, 47, 46, 22],
        [40, 47, 52, 72],
        [64, 41, 76, 16],
        [64, 41, 82, 70],
        [90, 34, 104, 14],
        [90, 34, 106, 56],
      ]
    : [
        [44, 46, 58, 26],
        [44, 46, 54, 68],
        [74, 38, 90, 18],
        [74, 38, 88, 60],
        [102, 31, 116, 22],
      ];
  for (const [x0, y0, x1, y1] of adern) s += `<path d="M${x0} ${y0}Q${(x0 + x1) / 2 + 4} ${(y0 + y1) / 2} ${x1} ${y1}" fill="none" stroke="${ader}" stroke-width="2.6" stroke-linecap="round" opacity="0.9"/>`;
  if (gold) s += `<circle cx="104" cy="36" r="4" fill="${WEISS}" opacity="0.75"/><circle cx="96" cy="46" r="2.2" fill="${WEISS}" opacity="0.6"/>`;
  return `<svg class="figur-svg" viewBox="0 0 ${BLATT_BOX.w} ${BLATT_BOX.h}" aria-hidden="true">${s}</svg>`;
}

/** Geflochtener Korb; `voll`: Blätter schauen heraus. Die Zahl steht auf einem Holzschild darüber (HTML). */
export function korbSvg(voll = false): string {
  const clip = id('korb');
  const c = F.korb;
  const k = F['korb-kante'];
  const l = F['korb-licht'];
  let s = `<defs><clipPath id="${clip}"><path d="M14 44H106L96 94Q95 100 88 100H32Q25 100 24 94Z"/></clipPath></defs>`;
  // Henkel hinten
  s += `<path d="M26 46Q60 -6 94 46" fill="none" stroke="${k}" stroke-width="8" stroke-linecap="round"/><path d="M28 44Q60 -2 92 44" fill="none" stroke="${l}" stroke-width="3" stroke-linecap="round" opacity="0.8"/>`;
  if (voll) {
    s += `<g transform="translate(18 10) rotate(-28 30 30) scale(0.42)">${blattPfad(false)}</g>`;
    s += `<g transform="translate(50 4) rotate(-70 30 30) scale(0.42)">${blattPfad(true)}</g>`;
    s += `<g transform="translate(58 16) rotate(-12 30 30) scale(0.42)">${blattPfad(false)}</g>`;
  }
  // Schatten am Boden, Körper, Flechtwerk
  s += `<ellipse cx="60" cy="100" rx="40" ry="4" fill="${SCHATTEN}"/>`;
  s += `<path d="M14 44H106L96 94Q95 100 88 100H32Q25 100 24 94Z" fill="${c}"/>`;
  let flecht = '';
  for (let y = 54; y < 100; y += 11) flecht += `<path d="M10 ${y}Q60 ${y + 5} 110 ${y}" fill="none" stroke="${l}" stroke-width="4.5" opacity="0.9"/>`;
  for (let x = 22; x < 104; x += 12) flecht += `<path d="M${x} 44L${x + (x < 60 ? 3 : -3)} 102" fill="none" stroke="${k}" stroke-width="2.6" opacity="0.55"/>`;
  s += `<g clip-path="url(#${clip})">${flecht}<path d="M14 44H106L96 94Q95 100 88 100H32Q25 100 24 94Z" fill="${k}" opacity="0.12"/></g>`;
  // Rand
  s += `<rect x="9" y="38" width="102" height="13" rx="6.5" fill="${k}"/><rect x="9" y="36" width="102" height="11" rx="5.5" fill="${l}"/>`;
  return `<svg class="figur-svg" viewBox="0 0 ${KORB_BOX.w} ${KORB_BOX.h}" aria-hidden="true">${s}</svg>`;
}

/** Blatt ohne eigenes SVG (für den vollen Korb und die Kacheln) */
function blattPfad(gold: boolean): string {
  const c = gold ? F['blatt-gold'] : F.blatt;
  const k = gold ? F['blatt-gold-kante'] : F['blatt-kante'];
  const ader = gold ? F['blatt-gold-ader'] : F['blatt-ader'];
  return `<path d="M14 52C30 18 78 6 132 22C118 70 74 94 22 70C18 64 15 58 14 52Z" fill="${k}" transform="translate(0 5)"/><path d="M14 52C30 18 78 6 132 22C118 70 74 94 22 70C18 64 15 58 14 52Z" fill="${c}"/><path d="M16 53Q70 40 128 24" fill="none" stroke="${ader}" stroke-width="6" stroke-linecap="round"/>`;
}

/** Marke auf einem liegen gebliebenen Blatt: „hier darfst du tippen“ – ruhig, Laterne mit Kreis */
export function tippMarkeSvg(): string {
  return `<svg class="tipp-marke" viewBox="0 0 28 30" aria-hidden="true"><circle cx="14" cy="16" r="12" fill="${LATERNE_KANTE}"/><circle cx="14" cy="14" r="12" fill="${LATERNE}"/><circle cx="14" cy="14" r="7" fill="none" stroke="${TINTE_LEISE}" stroke-width="2.6"/><circle cx="14" cy="14" r="3" fill="${TINTE_LEISE}"/></svg>`;
}

/** Marke an einer zurückgelegten Perle: Pfeil zurück auf einer Laterne, ohne Umriss */
export function zurueckMarkeSvg(): string {
  return `<svg class="marke" viewBox="0 0 28 30" aria-hidden="true"><circle cx="14" cy="16" r="12" fill="${LATERNE_KANTE}"/><circle cx="14" cy="14" r="12" fill="${LATERNE}"/><path d="M10 11h6.5a3.8 3.8 0 0 1 0 7.6H11" fill="none" stroke="${TINTE_LEISE}" stroke-width="2.8" stroke-linecap="round"/><path d="M12.5 7.6 9 11l3.5 3.4" fill="none" stroke="${TINTE_LEISE}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

/** Laterne mit Glühwürmchen (Hilfeknopf): Glas in --laterne, Rahmen in Holz */
export function laterneSvg(): string {
  const g = id('glas');
  return `<svg class="laterne-svg" viewBox="0 0 40 40" aria-hidden="true"><defs><radialGradient id="${g}" cx="0.5" cy="0.55" r="0.6"><stop offset="0" stop-color="${mix(LATERNE, WEISS, 0.6)}"/><stop offset="1" stop-color="${LATERNE}"/></radialGradient></defs>
    <path d="M14 7Q20 1 26 7" fill="none" stroke="${F['ast-kante']}" stroke-width="3" stroke-linecap="round"/>
    <rect x="11" y="8" width="18" height="5" rx="2.5" fill="${F['ast-kante']}"/>
    <rect x="12" y="12" width="16" height="19" rx="6" fill="url(#${g})"/>
    <rect x="12" y="12" width="16" height="19" rx="6" fill="none" stroke="${F.ast}" stroke-width="2.6"/>
    <rect x="11" y="30" width="18" height="5" rx="2.5" fill="${F['ast-kante']}"/>
    <circle class="gluehwurm" cx="20" cy="22" r="3.2" fill="${F['blatt-gold-kante']}"/><circle cx="19" cy="21" r="1.3" fill="${WEISS}"/></svg>`;
}

/** kleine Bilder der Kacheln am Ende des Satzes */
export function kachelBildSvg(art: 'welt' | 'satz' | 'pause'): string {
  let s = '';
  if (art === 'welt') {
    s += `<ellipse cx="40" cy="62" rx="34" ry="6" fill="${F['blatt-kante']}" opacity="0.35"/>`;
    s += `<rect x="34" y="34" width="12" height="28" rx="4" fill="${F.ast}"/><rect x="37" y="46" width="6" height="10" rx="3" fill="${F['ast-kante']}"/>`;
    s += `<circle cx="40" cy="26" r="20" fill="${F.blatt}"/><circle cx="31" cy="20" r="9" fill="${F['blatt-ader']}" opacity="0.7"/><circle cx="52" cy="30" r="10" fill="${F['blatt-kante']}" opacity="0.35"/>`;
    s += `<circle cx="56" cy="16" r="3" fill="${F['blatt-gold']}"/>`;
  } else if (art === 'satz') {
    const perle = (x: number, c: string, k: string) => `<circle cx="${x}" cy="44" r="12" fill="${k}"/><circle cx="${x}" cy="42" r="12" fill="${c}"/><ellipse cx="${x - 4}" cy="37" rx="4" ry="2" fill="${WEISS}" opacity="0.8"/>`;
    s += `<rect x="4" y="52" width="72" height="8" rx="4" fill="${F.ast}"/>`;
    s += perle(30, ZIFFER_FARBEN[2], ZIFFER_KANTEN[2]) + perle(52, ZIFFER_FARBEN[6], ZIFFER_KANTEN[6]);
    s += `<circle cx="12" cy="40" r="10" fill="${F.raupe}"/><circle cx="12" cy="22" r="11" fill="${F.raupe}"/><circle cx="9" cy="21" r="2.2" fill="${TINTE}"/><circle cx="16" cy="21" r="2.2" fill="${TINTE}"/><path d="M6 31l12 0-6 7z" fill="${F.halstuch}"/>`;
    s += `<circle cx="72" cy="42" r="11" fill="${F.nest}"/>`;
  } else {
    s += `<rect x="20" y="8" width="40" height="54" rx="6" fill="${F['ast-kante']}"/><rect x="24" y="12" width="32" height="50" rx="4" fill="${F.ast}"/>`;
    s += `<rect x="28" y="16" width="24" height="18" rx="3" fill="${F['ast-licht']}"/><rect x="28" y="38" width="24" height="18" rx="3" fill="${F['ast-licht']}"/><circle cx="50" cy="38" r="2.6" fill="${F['blatt-gold-kante']}"/>`;
    s += `<rect x="10" y="60" width="60" height="5" rx="2.5" fill="${HOLZ_KANTE}"/>`;
  }
  return `<svg class="kachel-svg" viewBox="0 0 80 70" aria-hidden="true">${s}</svg>`;
}
