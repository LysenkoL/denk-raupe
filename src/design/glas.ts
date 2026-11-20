/**
 * Farben des Облик «стекло» (docs/STIL.md, «Облик экрана набора: стекло»; von der Autorin am 20.11.2026
 * angenommen) für die kleinen Bilder des Satzbildschirms. Sie liegen außerhalb der Token der Holz-Welt
 * (tokens.css): Dienstknöpfe in Grau-Blau, Kachelränder der Ziffern, Baumhaus.
 * Die Flächen selbst (Glas, Brett, Kacheln) stehen in src/styles/satz.css.
 */
export const GLAS = {
  /** „Löschen“: rosa Taste */
  loeschen: '#E0457B',
  /** Dienst: Rand, Zeichen, heller Grund (Pfeil „im Bild tippen“) */
  dienst: '#7F93B5',
  dienstZeichen: '#3B4A6B',
  dienstHell: '#EAF2FF',
  /** Baumhaus auf der Kachel „Meine Welt“ */
  stamm: '#9A6A3F',
  laub: '#57B533',
  laubHell: '#7FCB45',
  laubLicht: '#8ED24F',
  haus: '#FFC21F',
  dach: '#FF7A59',
  tuer: '#8B5CF6',
} as const;

/**
 * Rand der Ziffernkacheln 0–9: die Farbe der Ziffer (src/design/farbe.ts); wo sie auf Weiß zu blass oder zu grell
 * wäre (0, 3, 4, 6, 8), eine etwas kräftigere Stufe derselben Farbe. Die Kante darunter ist ZIFFER_KANTEN.
 */
export const KACHEL_RAND = ['#B9C5D3', '#EC003F', '#FE8100', '#F2DC00', '#5CCB3E', '#068846', '#2BB6F5', '#2B289F', '#F27DB6', '#7A3004'] as const;
