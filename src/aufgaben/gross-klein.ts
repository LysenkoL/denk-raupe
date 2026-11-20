import type { Antwort } from '../perlen/antwort';
import type { Zufall } from '../core/zufall';
import { aufgabeAus, type Format, type ZeichenOptionen } from './format';
import { FIGUR_TOKEN, LATERNE, LATERNE_KANTE, TINTE, TINTE_LEISE } from '../design/farbe';
import { schild, svgHuelle } from './zaehlen';
import { nest as mulde } from './bildteile';

/**
 * Groß und klein (Nr. 64, Engine Verbinden, Antwort Wahl eines Buchstabens): auf dem Schild steht ein großer Buchstabe –
 * welcher kleine gehört dazu? (Der Faden zwischen den beiden ist das Bild der Engine; geantwortet wird mit einer Perle.)
 * Stufe 1: groß und klein sehen sich ähnlich (O–o, S–s, K–k), die anderen Perlen sind ganz andere Buchstaben; drei Perlen.
 * Stufe 2: groß und klein sehen sich nicht ähnlich (G–g, R–r, E–e, A–a); vier Perlen.
 * Stufe 3: die anderen Perlen sind leicht zu verwechseln (b, d, p, q; n, u; m, w; i, l, j); vier Perlen.
 * Der Löser kennt nur das Paar groß–klein des Alphabets: die Perle mit dem kleinen Buchstaben zum großen.
 *
 * Hilfe auf dem Bild: Stufe 2 hebt den großen Buchstaben hervor; Stufe 3 zeigt neben ihm ein Wort aus der Fibel, das mit
 * ihm beginnt, ist zu viel Lesen – stattdessen ein Bogen vom großen zum Nest (gestrichelt): hier gehört der kleine hin.
 */
export interface GrossKlein {
  gross: string;
  wahl: string[];
}

function loesungen(g: GrossKlein): Antwort[] {
  return g.wahl.filter((k) => k === g.gross.toLowerCase()).map((wert) => ({ art: 'buchstabe', wert }));
}

const AEHNLICH = ['C', 'K', 'O', 'P', 'S', 'U', 'V', 'W', 'X', 'Z'];
const ANDERS = ['A', 'B', 'D', 'E', 'F', 'G', 'H', 'M', 'N', 'Q', 'R', 'T'];
const VERWECHSELT: Record<string, string[]> = { b: ['d', 'p', 'q'], d: ['b', 'q', 'p'], p: ['q', 'b', 'd'], q: ['p', 'd', 'g'], n: ['u', 'm', 'h'], u: ['n', 'v', 'a'], m: ['w', 'n', 'u'], w: ['m', 'v', 'u'], h: ['n', 'b', 'k'], g: ['q', 'p', 'j'], e: ['a', 'c', 'o'], a: ['e', 'o', 'd'] };

function erzeuge(z: Zufall, stufe: number): GrossKlein {
  const gross = stufe === 1 ? z.eins(AEHNLICH) : stufe === 2 ? z.eins(ANDERS) : z.eins(Object.keys(VERWECHSELT)).toUpperCase();
  const richtig = gross.toLowerCase();
  const andere =
    stufe === 3 ? z.mischen(VERWECHSELT[richtig]) : z.mischen('abdefghkmnoprstuvz'.split('').filter((c) => c !== richtig && (stufe === 2 || !VERWECHSELT[richtig]?.includes(c))));
  const wahl = z.mischen([richtig, ...andere.slice(0, stufe === 1 ? 2 : 3)]);
  return { gross, wahl };
}

function zeichne(g: GrossKlein, o: ZeichenOptionen): string {
  const W = 300;
  let s = '';
  if (o.hilfe >= 2 || o.vorrechnen) s += `<rect data-hilfe="teil" x="22" y="6" width="120" height="112" rx="22" fill="${LATERNE}" stroke="${LATERNE_KANTE}" stroke-width="3.5"/>`;
  s += schild(28, 12, 108, 96);
  s += `<text x="82" y="86" text-anchor="middle" font-size="70" font-weight="800" fill="${TINTE}">${g.gross}</text>`;
  s += `<path d="M138 60 C170 30 190 90 212 60" fill="none" stroke="${FIGUR_TOKEN['ast-kante']}" stroke-width="4" stroke-linecap="round"/>`;
  if (o.hilfe >= 3 && !o.vorrechnen) s += `<path data-hilfe="schritt" d="M138 60 C170 30 190 90 212 60" fill="none" stroke="${LATERNE_KANTE}" stroke-width="9" stroke-dasharray="8 6" stroke-linecap="round"/>`;
  s += mulde(212, 24, 76, 76);
  const a = o.vorrechnen ? loesungen(g)[0] : o.gewaehlt;
  if (a?.art === 'buchstabe') s += `<text${o.vorrechnen ? '' : ' data-inhalt=""'} x="250" y="82" text-anchor="middle" font-size="60" font-weight="800" fill="${TINTE}">${a.wert}</text>`;
  else s += `<text x="250" y="76" text-anchor="middle" font-size="40" font-weight="800" fill="${TINTE_LEISE}">?</text>`;
  return svgHuelle(W, 124, 'Groß und klein', s);
}

export const GROSS_KLEIN: Format<GrossKlein> = {
  id: 'gross-klein',
  nr: 64,
  version: 1,
  bereich: 'woerter',
  faehigkeit: 'W1',
  motor: 'verbinden',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'welcherKleineBuchstabe',
  stufen: 3,
  /** hängt nicht vom Zahlenraum ab: liest die Einstellung nicht */
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'wahl' }),
  wahl: (g) => g.wahl.map((wert) => ({ art: 'buchstabe', wert }) as Antwort),
  zeichne,
  /** Lernbeispiel: (1) O – o oder t; (2) gewöhnliche Aufgabe der Stufe 1 aus dem Generator. */
  beispiele: () => [{ gross: 'O', wahl: ['t', 'o'] }, aufgabeAus(GROSS_KLEIN, 0, 1).bedingung],
};
