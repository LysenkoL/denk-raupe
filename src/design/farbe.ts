/**
 * Farben der Denk-Raupe. Eine Quelle für TypeScript (SVG der Perlen) und CSS (src/styles/tokens.css);
 * ein Test hält beide gleich und mit docs/STIL.md.
 */

/**
 * Ziffernfarben 0–9 (docs/TZ.md, „Цвета цифр“, beschlossen am 16.11.2026). Gewählt nach Unterscheidbarkeit,
 * nicht als Regenbogen: je zwei der elf Farben (0–9 und 100) unterscheiden sich um ΔE2000 ≥ 20 und bei
 * Protanopie und Deuteranopie um ΔE76 ≥ 19 (Test: tests/farbe.test.ts).
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

/** Kante je Ziffer: zweite Farbe, die der Perle Tiefe gibt (docs/STIL.md, „Бусины и фигуры“) */
export const ZIFFER_KANTEN = [
  '#8EA3B9',
  '#A0002A',
  '#AC5700',
  '#E3E000',
  '#3AB818',
  '#00602F',
  '#0096DA',
  '#191770',
  '#F31A85',
  '#551F00',
] as const;

/** 100 – eigene Perle */
export const HUNDERT_FARBE = '#983AF1';
export const HUNDERT_KANTE = '#6804C6';

/** Tinte: Ziffern, Buchstaben, Beschriftung; auch der Trennring zwischen Füllung und Zehner-Ring */
export const TINTE = '#182218';

/** Perle für Buchstaben, Wörter, Artikel, Formen, Zeit, Geld, Länge und Sammelantworten */
export const NEUTRAL_PERLE = '#FBF5E6';
export const NEUTRAL_KANTE = '#C8B99E';

/** Formfarben in Aufgaben: Teilmenge der Ziffernpalette, damit sie dieselbe Prüfung bestehen */
export const FORM_FARBEN = {
  rot: ZIFFER_FARBEN[1],
  orange: ZIFFER_FARBEN[2],
  gelb: ZIFFER_FARBEN[3],
  gruen: ZIFFER_FARBEN[5],
  blau: ZIFFER_FARBEN[6],
  lila: HUNDERT_FARBE,
} as const;
export type FormFarbe = keyof typeof FORM_FARBEN;

/** Kante zu einer Farbe der Palette; für andere Farben eine dunklere Mischung */
export function kanteVon(farbe: string): string {
  const c = farbe.toUpperCase();
  const i = (ZIFFER_FARBEN as readonly string[]).indexOf(c);
  if (i >= 0) return ZIFFER_KANTEN[i];
  if (c === HUNDERT_FARBE) return HUNDERT_KANTE;
  if (c === NEUTRAL_PERLE) return NEUTRAL_KANTE;
  return mix(c, TINTE, 0.35);
}

/**
 * Rand einer Form in Aufgaben: ihre Kante, mit Tinte abgedunkelt – kein schwarzer Umriss, aber auch Gelb
 * hebt sich von der hellen Perle und vom Papier ab (Kontrast ≥ 3, Test).
 */
export function formRand(farbe: string): string {
  return mix(kanteVon(farbe), TINTE, 0.45);
}

/**
 * Tokens aus docs/STIL.md, Abschnitte 4–5. Ein Test vergleicht sie mit dem Dokument und mit src/styles/tokens.css.
 */
export const FLAECHEN = {
  papier: '#FDFBF4',
  holz: '#F2E6D0',
  'holz-kante': '#D6C4A2',
  stein: '#EFD9B4',
  'stein-kante': '#C4A878',
  tinte: TINTE,
  'tinte-leise': '#56604F',
} as const;

export const AKTIONEN = {
  honig: '#FFC83D',
  'honig-kante': '#D99A00',
  holzknopf: '#FFF8EA',
  'holzknopf-kante': '#D6C4A2',
  laterne: '#FFE9A8',
  'laterne-kante': '#E0B84A',
  fokus: '#2B289F',
} as const;

/** warme Schattenfarbe – nie grau */
export const SCHATTEN = 'rgba(70, 50, 20, 0.20)';

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

/** Schriftfarbe auf einer Fläche: Tinte oder weiß, je nachdem, was besser lesbar ist; Saum in der Gegenfarbe */
export function schriftAuf(flaeche: string): { schrift: string; saum: string } {
  return kontrast(TINTE, flaeche) >= kontrast('#FFFFFF', flaeche)
    ? { schrift: TINTE, saum: '#FFFFFF' }
    : { schrift: '#FFFFFF', saum: TINTE };
}
