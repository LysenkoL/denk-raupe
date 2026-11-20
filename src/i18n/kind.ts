/**
 * Texte für das Kind – immer Deutsch (docs/TZ.md: Kinderoberfläche nur Deutsch).
 * Kurz, gleichbleibend, ohne Lob-Floskeln. Feste Sätze, die das Kind wiedererkennt.
 */
export const KIND = {
  vergleichen: 'Vergleichen',
  weiter: 'Weiter',
  deineRaupe: 'Deine Raupe',
  /** Unterschrift unter der Reihe des Zwillings */
  deinZwilling: 'Dein Zwilling',
  zwilling: 'Zwilling mit Blättern',
  /** nach dem Vergleichen, wenn Blätter liegen bleiben */
  blattBleibt: 'Wo ein Blatt liegen bleibt, ist etwas anders. Tippe auf die Perle darüber.',
  /** nochmal Vergleichen ohne Änderung – kein Fehler, nur ein Hinweis */
  nichtsGeaendert: 'Du hast noch nichts geändert. Tippe auf eine Perle über einem Blatt.',
  fertigTitel: 'Beide Raupen sind gleich!',
  /** Karte „Vergleichen“: alle Perlen liegen auf der Raupe */
  allePerlen: 'Alle Perlen sind da!',
  /** Vergleich: kurze Zeile unten – erst kommt der Zwilling, dann bleibt vielleicht ein Blatt zu (ohne Zahl) */
  zwillingKommt: 'Dein Zwilling kommt!',
  einBlattZu: 'Ein Blatt bleibt zu.',
  paarBlaetterZu: 'Ein paar Blätter bleiben zu.',
  menue: 'Menü',
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
  /** drei Kacheln am Ende des Satzes: Welt, noch ein Satz, aufhören */
  neuerSatz: 'Noch ein Satz',
  welt: 'Meine Welt',
  pause: 'Pause machen',
  /** Zwischenseiten, bis Welt und Start da sind (Aufgaben C1 und C6) */
  weltBald: 'Hier wächst bald deine Welt.',
  bisBald: 'Bis bald!',
  zurueck: 'Zurück',
  loeschen: 'Löschen',
  /** Lade bei Antwort im Bild (z. B. Wer ist es?): wohin getippt wird */
  tippOben: 'Tippe im Bild, wer passt.',
  /** dasselbe für Formate, deren Antwort kein Wesen ist (Formen, Steine, Linien) */
  tippBild: 'Tippe im Bild auf deine Antwort.',
  /** Zahl eingeben: Gruppe der Ziffern (für Screenreader) */
  zahlEingeben: 'Zahl eingeben',
  /** Perle unten im Lade: schickt die Antwort (für Screenreader) */
  abgeben: 'Antwort der Raupe geben',
  nochLeer: 'Noch keine Antwort',
  /** „Zurück“ oben: erst fragen */
  wirklichAufhoeren: 'Wirklich aufhören?',
  weiterspielen: 'Weiterspielen',
  aufhoeren: 'Aufhören',
  /** allgemeines Beispiel der Geste (A10): einmal, vor der ersten Aufgabe */
  geste: {
    gleich: 'Finde das Gleiche.',
    zahl: 'Tippe die gleiche Zahl.',
  },
  ton: 'Ton',
  neuerBuchstabe: 'Ein neuer Buchstabe!',
  /** alle Buchstaben offen: das Geheimwort ist fertig (was es öffnet – C5/C6) */
  wortFertig: 'Du hast das Geheimwort!',
  /** feste Aufträge der Formate; ein Format nennt nur den Schlüssel (docs/FORMATE.md, Abschnitt 3) */
  auftrag: {
    welcheZahlFehlt: 'Welche Zahl fehlt?',
    wieGehtEsWeiter: 'Wie geht es weiter?',
    werIstEs: 'Wer ist es?',
    wieViele: 'Wie viele sind es?',
    wieVieleJetzt: 'Wie viele sind es jetzt?',
    unterDemKlecks: 'Welche Zahl ist unter dem Klecks?',
    welcheZahlPasst: 'Welche Zahl passt?',
    verdoppleHalbiere: 'Verdopple oder halbiere.',
    // Gruppe Г1б
    wieVielIstDieFrucht: 'Wie viel ist die Frucht wert?',
    wieVielePlaettchen: 'Wie viele Plättchen sind es?',
    welcheZahlImFeld: 'Welche Zahl gehört in das Feld?',
    welcheZahlZeigtDerPfeil: 'Welche Zahl zeigt der Pfeil?',
    // Gruppe Г2а
    wieVieleWuerfel: 'Wie viele Würfel sind es?',
    wasLiegtImFeld: 'Was liegt in diesem Feld?',
    wasLiegtDort: 'Was liegt dort?',
    // Gruppe Г2б
    wieLang: 'Wie lang ist es?',
    welcheAufgabeFamilie: 'Welche Aufgabe gehört dazu?',
    welcheAufgabePasst: 'Welche Aufgabe passt?',
    welcherBuchstabe: 'Welcher Buchstabe ist es?',
    // Gruppe Г2в
    wieSpaet: 'Wie spät ist es?',
    wieVielEuro: 'Wie viel Euro sind es?',
    // Gruppe Г3 (Engine Auswahl)
    wasIstFalsch: 'Was ist falsch?',
    wasPasstNicht: 'Was passt nicht?',
    wasGehoertHin: 'Was gehört dorthin?',
    welcheHaelfte: 'Welche Hälfte passt?',
    gleicheFigurGedreht: 'Welche ist dieselbe, nur gedreht?',
    welcheLinieFalten: 'Wo kannst du falten?',
    wasAmMeisten: 'Wovon gibt es am meisten?',
    welcherSteinFalsch: 'Welcher Stein ist falsch?',
    // Gruppen Г4–Г6
    wasGehoertHinein: 'Was gehört hinein?',
    welcheZahlKommt: 'Welche Zahl kommt als Nächste?',
    welchePerleKommt: 'Welche Perle kommt dorthin?',
    welcherBuchstabeFehlt: 'Welcher Buchstabe fehlt?',
    durchWelchesTor: 'Durch welches Tor geht die Raupe?',
    woKommtSieAn: 'Wo kommt die Raupe an?',
  },
  /** Korb mit Blättern (für Screenreader) */
  korb(n: number): string {
    return n === 1 ? 'Korb: 1 Blatt' : `Korb: ${n} Blätter`;
  },
  /** liegen gebliebenes Blatt als Knopf (für Screenreader) */
  blattLiegt(nr: number): string {
    return `Aufgabe ${nr}: Blatt liegt noch`;
  },
  /** Vorlesename für Screenreader */
  perleName(nr: number, inhalt: string | null): string {
    return inhalt ? `Aufgabe ${nr}: ${inhalt}` : `Aufgabe ${nr}: noch leer`;
  },
} as const;

export type AuftragSchluessel = keyof typeof KIND.auftrag;
