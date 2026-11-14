import type { Antwort } from '../perlen/antwort';
import { formPfad } from '../perlen/maler';
import { gleich } from '../perlen/antwort';

/**
 * PLATZHALTER für Etappe 2 (Stil): feste Beispielaufgaben, damit der Satz-Bildschirm alle Perlenarten
 * zeigt. Keine echten Formate – die kommen in Etappe 3 mit Generator, Löser und Prüfung auf Eindeutigkeit.
 * Jede Aufgabe hier ist von Hand so gebaut, dass genau eine Wahl passt (Test: tests/demo.test.ts).
 */
export interface DemoAufgabe {
  auftrag: string;
  bild: string;
  wahl: Antwort[];
  /** nur intern zum Vergleichen; geht nie an die Oberfläche */
  loesung: Antwort;
}

const svg = (inhalt: string, vb = '0 0 320 90') => `<svg viewBox="${vb}" aria-hidden="true">${inhalt}</svg>`;

function punkte(n: number): string {
  let s = '';
  for (let i = 0; i < n; i++) s += `<circle cx="${36 + (i % 5) * 62}" cy="${24 + Math.floor(i / 5) * 42}" r="15" fill="#3A86FF" stroke="#1B2033" stroke-width="2.5"/>`;
  return svg(s, '0 0 320 90');
}

function text(t: string, size = 40): string {
  return svg(`<text x="160" y="${45 + size * 0.36}" text-anchor="middle" font-size="${size}" font-weight="800" fill="#1F2421">${t}</text>`);
}

function muster(): string {
  const reihe: [Parameters<typeof formPfad>[0], string][] = [
    ['kreis', '#FF4D6D'],
    ['dreieck', '#3A86FF'],
    ['kreis', '#FF4D6D'],
    ['dreieck', '#3A86FF'],
    ['kreis', '#FF4D6D'],
  ];
  let s = reihe.map(([f, c], i) => formPfad(f, 30 + i * 52, 45, 18, c)).join('');
  s += `<rect x="270" y="23" width="44" height="44" rx="10" fill="none" stroke="#5B655F" stroke-width="3" stroke-dasharray="7 6"/><text x="292" y="54" text-anchor="middle" font-size="26" font-weight="800" fill="#5B655F">?</text>`;
  return svg(s);
}

export const DEMO: DemoAufgabe[] = [
  {
    auftrag: 'Wie viele?',
    bild: punkte(7),
    wahl: [5, 6, 7, 8, 9].map((wert) => ({ art: 'zahl', wert })),
    loesung: { art: 'zahl', wert: 7 },
  },
  {
    auftrag: 'Rechne.',
    bild: text('6 + 8 = ?'),
    wahl: [12, 13, 14, 15, 16].map((wert) => ({ art: 'zahl', wert })),
    loesung: { art: 'zahl', wert: 14 },
  },
  {
    auftrag: 'Wie geht es weiter?',
    bild: muster(),
    wahl: [
      { art: 'form', form: 'kreis', farbe: 'rot' },
      { art: 'form', form: 'dreieck', farbe: 'blau' },
      { art: 'form', form: 'quadrat', farbe: 'blau' },
      { art: 'form', form: 'dreieck', farbe: 'rot' },
    ],
    loesung: { art: 'form', form: 'dreieck', farbe: 'blau' },
  },
  {
    auftrag: 'Welcher Buchstabe fehlt?',
    bild: text('A  B  ?  D'),
    wahl: ['C', 'E', 'F', 'G'].map((wert) => ({ art: 'buchstabe', wert })),
    loesung: { art: 'buchstabe', wert: 'C' },
  },
  {
    auftrag: 'der, die oder das?',
    bild: text('… Sonne', 36),
    wahl: (['der', 'die', 'das'] as const).map((wert) => ({ art: 'artikel', wert })),
    loesung: { art: 'artikel', wert: 'die' },
  },
  {
    auftrag: 'Welches Wort ist richtig?',
    bild: text('s  H  u  a', 36),
    wahl: ['Haus', 'Hasu', 'Huas'].map((wert) => ({ art: 'wort', wert })),
    loesung: { art: 'wort', wert: 'Haus' },
  },
];

export function demoStimmt(aufgaben: DemoAufgabe[]) {
  return (i: number, a: Antwort) => gleich(aufgaben[i].loesung, a);
}
