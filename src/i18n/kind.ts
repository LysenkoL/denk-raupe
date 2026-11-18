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
  hilfe: 'Hilfe',
  mehrHilfe: 'Mehr Hilfe',
  soGehts: "So geht's",
  losGehts: "Los geht's",
  genau: 'Genau so!',
  nochmalSchauen: 'Schau noch einmal.',
  aehnlich: 'So geht es bei einer ähnlichen Aufgabe:',
  spaeterKnopf: 'Später',
  wartet: 'Diese Aufgabe wartet auf später. Du kannst sie jetzt lösen.',
  neuerSatz: 'Neuer Satz',
  loeschen: 'Löschen',
  /** Zahl eingeben: Gruppe der Ziffernperlen und Plätze (für Screenreader) */
  zahlEingeben: 'Zahl eingeben',
  /** Plätze der Zahl, Zehner links, Einer rechts: Zeichen auf dem Holz und Name zum Vorlesen */
  stelle: {
    H: { zeichen: 'H', name: 'Hunderter' },
    Z: { zeichen: 'Z', name: 'Zehner' },
    E: { zeichen: 'E', name: 'Einer' },
  },
  platzLeer: 'leer',
  ton: 'Ton',
  neuerBuchstabe: 'Ein neuer Buchstabe!',
  /** feste Aufträge der Formate; ein Format nennt nur den Schlüssel (docs/FORMATE.md, Abschnitt 3) */
  auftrag: {
    welcheZahlFehlt: 'Welche Zahl fehlt?',
    wieGehtEsWeiter: 'Wie geht es weiter?',
    werIstEs: 'Wer ist es?',
  },
  /** Vorlesename für Screenreader */
  perleName(nr: number, inhalt: string | null): string {
    return inhalt ? `Aufgabe ${nr}: ${inhalt}` : `Aufgabe ${nr}: noch leer`;
  },
} as const;

export type AuftragSchluessel = keyof typeof KIND.auftrag;
