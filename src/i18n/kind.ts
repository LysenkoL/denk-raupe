/**
 * Texte für das Kind – immer Deutsch (docs/TZ.md: Kinderoberfläche nur Deutsch).
 * Kurz, gleichbleibend, ohne Lob-Floskeln. Feste Sätze, die das Kind wiedererkennt.
 */
export const KIND = {
  vergleichen: 'Vergleichen',
  weiter: 'Weiter',
  deineRaupe: 'Deine Raupe',
  zwilling: 'Zwilling mit Blättern',
  /** nach dem Vergleichen, wenn Blätter liegen bleiben */
  blattBleibt: 'Wo ein Blatt liegen bleibt, ist etwas anders. Tippe auf die Perle darüber.',
  /** nochmal Vergleichen ohne Änderung – kein Fehler, nur ein Hinweis */
  nichtsGeaendert: 'Du hast noch nichts geändert. Tippe auf eine Perle über einem Blatt.',
  fertigTitel: 'Beide Raupen sind gleich!',
  fertigKorb: 'Die Blätter sind im Korb.',
  spaeter: 'Eine Aufgabe wartet auf später.',
  geheimwort: 'Geheimwort',
  /** Vorlesename für Screenreader */
  perleName(nr: number, inhalt: string | null): string {
    return inhalt ? `Aufgabe ${nr}: ${inhalt}` : `Aufgabe ${nr}: noch leer`;
  },
} as const;
