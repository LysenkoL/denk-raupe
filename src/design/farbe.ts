/**
 * Farben der Denk-Raupe. Eine Quelle für TypeScript (SVG der Perlen) und CSS (src/styles/tokens.css,
 * ein Test hält beide gleich). Werte aus docs/TZ.md („Цвета цифр“) und docs/STIL.md (Abschnitt 4).
 */

/** Flächen und Schrift (STIL 4, „Поверхности и текст“) */
export const PAPIER = '#FDFBF4';
export const HOLZ = '#F2E6D0';
export const HOLZ_KANTE = '#D6C4A2';
export const STEIN = '#EFD9B4';
export const STEIN_KANTE = '#C4A878';
/** Farbe aller Ziffern, Buchstaben und Beschriftungen */
export const TINTE = '#182218';
export const TINTE_LEISE = '#56604F';
export const WEISS = '#FFFFFF';
/** warmer Schlagschatten, nie grau */
export const SCHATTEN = 'rgba(70, 50, 20, 0.20)';

/** Handlungen (STIL 4, „Действия“): Fläche und Kante */
export const HONIG = '#FFC83D';
export const HONIG_KANTE = '#D99A00';
export const HOLZKNOPF = '#FFF8EA';
export const HOLZKNOPF_KANTE = '#D6C4A2';
export const LATERNE = '#FFE9A8';
export const LATERNE_KANTE = '#E0B84A';
/** Auswahl und Fokus: 2 px Papier innen, 3 px Fokus außen */
export const FOKUS = '#2B289F';

/** alle Farb-Token mit ihrem CSS-Namen (ohne „--“) – der Test vergleicht sie mit tokens.css */
export const FARB_TOKEN = {
  papier: PAPIER,
  holz: HOLZ,
  'holz-kante': HOLZ_KANTE,
  stein: STEIN,
  'stein-kante': STEIN_KANTE,
  tinte: TINTE,
  'tinte-leise': TINTE_LEISE,
  honig: HONIG,
  'honig-kante': HONIG_KANTE,
  holzknopf: HOLZKNOPF,
  'holzknopf-kante': HOLZKNOPF_KANTE,
  laterne: LATERNE,
  'laterne-kante': LATERNE_KANTE,
  fokus: FOKUS,
} as const;

/**
 * Ziffernfarben 0–9 (docs/TZ.md, „Цвета цифр“, Stand 16.11.2026). Per Rechnung gewählt, nicht als Regenbogen:
 * je zwei der elf Farben (mit der 100) ΔE2000 ≥ 20, bei Protanopie und Deuteranopie ΔE76 ≥ 19
 * (Test: tests/palette.test.ts).
 */
export const ZIFFER_FARBEN = [
  '#EEF1F4', // 0 hell
  '#EC003F', // 1 rot
  '#FE8100', // 2 orange
  '#FFFD4F', // 3 gelb
  '#71E053', // 4 hellgrün
  '#068846', // 5 dunkelgrün
  '#42C4FF', // 6 hellblau
  '#2B289F', // 7 dunkelblau
  '#F598C6', // 8 rosa
  '#7A3004', // 9 braun
] as const;

/** Kante je Ziffer: die zweite Farbe, die der Perle Tiefe gibt (STIL 4, „Бусины и фигуры“) */
export const ZIFFER_KANTEN = [
  '#8EA3B9', // 0
  '#A0002A', // 1
  '#AC5700', // 2
  '#E3E000', // 3
  '#3AB818', // 4
  '#00602F', // 5
  '#0096DA', // 6
  '#191770', // 7
  '#F31A85', // 8
  '#551F00', // 9
] as const;

/** 100 – eigene Perle */
export const HUNDERT_FARBE = '#983AF1';
export const HUNDERT_KANTE = '#6804C6';

/** Perle für Buchstaben, Wörter, Artikel, Formen, Zeit, Geld, Länge und Sammelantworten */
export const NEUTRAL_PERLE = '#FBF5E6';
export const NEUTRAL_KANTE = '#C8B99E';

/**
 * Formfarben in Aufgaben – eine Teilmenge der Ziffernpalette, damit sie dieselbe Prüfung bestehen
 * (docs/TZ.md: Farbe als Merkmal einer Aufgabe kommt aus derselben Palette).
 */
export const FORM_FARBEN = {
  rot: ZIFFER_FARBEN[1],
  orange: ZIFFER_FARBEN[2],
  gelb: ZIFFER_FARBEN[3],
  gruen: ZIFFER_FARBEN[5],
  blau: ZIFFER_FARBEN[6],
  lila: HUNDERT_FARBE,
} as const;
export type FormFarbe = keyof typeof FORM_FARBEN;

/** Kante zu einer Perlenfarbe (Ziffer, 100 oder neutral) */
export function kanteZu(farbe: string): string {
  const c = farbe.toUpperCase();
  const i = ZIFFER_FARBEN.indexOf(c as (typeof ZIFFER_FARBEN)[number]);
  if (i >= 0) return ZIFFER_KANTEN[i];
  if (c === HUNDERT_FARBE) return HUNDERT_KANTE;
  if (c === NEUTRAL_PERLE) return NEUTRAL_KANTE;
  throw new Error(`keine Perlenfarbe: ${farbe}`);
}

export function hex(c: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) as [number, number, number];
}

export function mix(a: string, b: string, t: number): string {
  const A = hex(a);
  const B = hex(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

/** relative Leuchtdichte nach WCAG */
export function leuchtdichte(c: string): number {
  const [r, g, b] = hex(c).map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Kontrastverhältnis nach WCAG (1 … 21) */
export function kontrast(a: string, b: string): number {
  const [hell, dunkel] = [leuchtdichte(a), leuchtdichte(b)].sort((x, y) => y - x);
  return (hell + 0.05) / (dunkel + 0.05);
}

/** Schriftfarbe auf einer Fläche: Tinte oder Weiß, je nachdem, was besser lesbar ist; der Saum in der anderen */
export function schriftAuf(flaeche: string): { schrift: string; saum: string } {
  return kontrast(TINTE, flaeche) >= kontrast(WEISS, flaeche)
    ? { schrift: TINTE, saum: WEISS }
    : { schrift: WEISS, saum: TINTE };
}
