/**
 * Gezeichnete Bilder der Denk-Raupe (eigene, generierte Bilder; Stil der Lese-Raupe-Familie).
 * Quelle: ein Bildbogen, ausgeschnitten mit transparentem Hintergrund, als WebP.
 */
import kopf from './kopf.webp';
import kopfSchaut from './kopf-schaut.webp';
import kopfDenkt from './kopf-denkt.webp';
import kopfFreude from './kopf-freude.webp';
import kopfZwilling from './kopf-zwilling.webp';
import blatt from './blatt.webp';
import blattGold from './blatt-gold.webp';
import blattPunkte from './blatt-punkte.webp';
import blattHerbst from './blatt-herbst.webp';
import blattRegenbogen from './blatt-regenbogen.webp';
import korbLeer from './korb-leer.webp';
import korbVoll from './korb-voll.webp';

/** Kopf: Bildgröße und Lage des Kopfkreises (Mitte mx/my, Radius r) in Bildpunkten */
export interface KopfBild {
  src: string;
  w: number;
  h: number;
  mx: number;
  my: number;
  r: number;
}

/**
 * Kopfvarianten. Die Raupe des Kindes wechselt den Ausdruck, der Zwilling hat ein Blatt am Fühler,
 * damit das Kind sofort sieht, welche Raupe seine ist. Nie traurig (docs/TZ.md: nichts Trauriges).
 */
export const KOEPFE = {
  /** Anfang */
  normal: { src: kopf, w: 247, h: 314, mx: 121.5, my: 203.5, r: 111.5 },
  /** beim Lösen: schaut auf die Aufgabe */
  schaut: { src: kopfSchaut, w: 250, h: 318, mx: 123.5, my: 205.5, r: 114.5 },
  /** nach dem Vergleichen liegt noch ein Blatt: neugierig, nachdenklich */
  denkt: { src: kopfDenkt, w: 247, h: 309, mx: 125.5, my: 199, r: 110.5 },
  /** Satz fertig */
  freude: { src: kopfFreude, w: 301, h: 310, mx: 153, my: 200.5, r: 112 },
  zwilling: { src: kopfZwilling, w: 272, h: 322, mx: 122, my: 208, r: 113 },
} satisfies Record<string, KopfBild>;
export type KopfArt = keyof typeof KOEPFE;

export const BLAETTER = {
  normal: blatt,
  gold: blattGold,
  /** seltene Blätter (Überraschungen, später) */
  punkte: blattPunkte,
  herbst: blattHerbst,
  regenbogen: blattRegenbogen,
} as const;
export type BlattArt = keyof typeof BLAETTER;
/** Seitenverhältnis der Blattbilder (Breite / Höhe) */
export const BLATT_FORMAT = 323 / 221;

export const KORB = { leer: korbLeer, voll: korbVoll } as const;
