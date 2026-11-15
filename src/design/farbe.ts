/**
 * Farben der Denk-Raupe. Eine Quelle für TypeScript (SVG der Perlen) und CSS (src/styles/tokens.css,
 * ein Test hält beide gleich).
 */

/**
 * Ziffernfarben 0–9 (docs/TZ.md, „Цвета цифр“). Gewählt nach Unterscheidbarkeit, nicht als Regenbogen:
 * je zwei Ziffern unterscheiden sich um ΔE2000 ≥ 20, damit auch der Zehner-Ring erkennbar ist
 * (Test: tests/perle.test.ts). Rot, Orange, Gelb und Hellgrün bleiben aus der Lese-Raupe-Familie.
 */
export const ZIFFER_FARBEN = [
  '#EEF1F4', // 0 hell
  '#E53935', // 1 rot
  '#FF8A00', // 2 orange
  '#FFE14D', // 3 gelb
  '#8BD13B', // 4 hellgrün
  '#178A3A', // 5 dunkelgrün
  '#35C9F2', // 6 hellblau
  '#2A3FB8', // 7 dunkelblau
  '#FF9ACD', // 8 rosa
  '#8D5524', // 9 braun
] as const;

/** 100 – eigene Perle */
export const HUNDERT_FARBE = '#8338EC';

/** dunkler Umriss der Perlen, wie bei der Lese-Raupe */
export const KONTUR = '#1B2033';

/** Perle für Buchstaben, Wörter, Artikel, Formen, Zeit, Geld, Länge und Sammelantworten */
export const NEUTRAL_PERLE = '#FBF5E6';

/** Formfarben in Aufgaben (aus derselben Familie) */
export const FORM_FARBEN = {
  rot: '#FF4D6D',
  orange: '#FF9F1C',
  gelb: '#FFD23F',
  gruen: '#3BC14A',
  blau: '#3A86FF',
  lila: '#8338EC',
} as const;
export type FormFarbe = keyof typeof FORM_FARBEN;

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

/** Schriftfarbe auf einer Fläche: dunkel oder weiß, je nachdem, was besser lesbar ist */
export function schriftAuf(flaeche: string): { schrift: string; saum: string } {
  return kontrast(KONTUR, flaeche) >= kontrast('#FFFFFF', flaeche)
    ? { schrift: KONTUR, saum: '#FFFFFF' }
    : { schrift: '#FFFFFF', saum: KONTUR };
}
