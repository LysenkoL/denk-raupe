import type { Antwort, Form } from '../perlen/antwort';
import type { Zufall } from '../core/zufall';
import { aufgabeAus, type Format, type ZeichenOptionen } from './format';
import { FORM_FARBEN, WEISS, type FormFarbe } from '../design/farbe';
import { formPfad } from '../perlen/maler';
import { kartenReihe } from './auswahl';

/**
 * Gleiches Paar (Nr. 49, Engine Verbinden, Antwort Paar): Karten mit ähnlichen Bildern – genau zwei sind gleich. Das Kind
 * tippt beide an (das erste wird markiert, das zweite macht das Paar; noch einmal tippen nimmt es weg). Die Perle zeigt
 * das Zeichen „Paar“.
 * Jedes Bild hat drei Merkmale: Form, Farbe, Zahl der weißen Punkte darin (1–3).
 * Stufe 1: vier Karten; die anderen unterscheiden sich vom Paar in mindestens zwei Merkmalen.
 * Stufe 2: sechs Karten; jede andere unterscheidet sich vom Paar in genau einem Merkmal.
 * Stufe 3: acht Karten; jede andere unterscheidet sich vom Paar in genau einem Merkmal, und auch untereinander sind sie
 *          sich ähnlich.
 * Der Löser sucht alle Paare gleicher Karten (alle drei Merkmale gleich); genau eins muss es sein.
 *
 * Hilfe auf dem Bild: Stufe 2 rahmt die Karten mit der Form des Paars ein; Stufe 3 macht die Karten blass, die in einem
 * Merkmal (zuerst Farbe, sonst Form, sonst Punkte) anders sind als das Paar (bleiben dann nur zwei, verrät das alles – dann an der ähnlichen Aufgabe).
 */
export interface Bild {
  form: Form;
  farbe: FormFarbe;
  punkte: 1 | 2 | 3;
}
export interface GleichesPaar {
  karten: Bild[];
}

const gleich = (a: Bild, b: Bild) => a.form === b.form && a.farbe === b.farbe && a.punkte === b.punkte;
const unterschiede = (a: Bild, b: Bild) => (a.form !== b.form ? 1 : 0) + (a.farbe !== b.farbe ? 1 : 0) + (a.punkte !== b.punkte ? 1 : 0);

/** alle Paare gleicher Karten (Nummern ab 1) */
export function paare(g: GleichesPaar): [number, number][] {
  const out: [number, number][] = [];
  g.karten.forEach((a, i) => g.karten.forEach((b, j) => i < j && gleich(a, b) && out.push([i + 1, j + 1])));
  return out;
}

function loesungen(g: GleichesPaar): Antwort[] {
  return paare(g).map((p) => ({ art: 'sammel', zeichen: 'paar', wert: p }));
}

const FORMEN: Form[] = ['kreis', 'quadrat', 'dreieck', 'raute', 'stern'];
const FARBEN: FormFarbe[] = ['rot', 'orange', 'gelb', 'gruen', 'blau', 'lila'];
const PUNKTE = [1, 2, 3] as const;

function zufallsBild(z: Zufall): Bild {
  return { form: z.eins(FORMEN), farbe: z.eins(FARBEN), punkte: z.eins(PUNKTE) };
}
/** Bild, das sich in genau einem Merkmal unterscheidet */
function einAnders(z: Zufall, b: Bild): Bild {
  const m = z.ganz(0, 2);
  if (m === 0) return { ...b, form: z.eins(FORMEN.filter((f) => f !== b.form)) };
  if (m === 1) return { ...b, farbe: z.eins(FARBEN.filter((f) => f !== b.farbe)) };
  return { ...b, punkte: z.eins(PUNKTE.filter((p) => p !== b.punkte)) };
}

function erzeuge(z: Zufall, stufe: number): GleichesPaar {
  const n = stufe === 1 ? 4 : stufe === 2 ? 6 : 8;
  for (;;) {
    const paar = zufallsBild(z);
    const karten: Bild[] = [paar, paar];
    while (karten.length < n) {
      const k = stufe === 1 ? zufallsBild(z) : stufe === 2 ? einAnders(z, paar) : einAnders(z, z.zahl() < 0.6 ? paar : z.eins(karten));
      if (stufe === 1 && unterschiede(k, paar) < 2) continue;
      if (stufe > 1 && unterschiede(k, paar) !== 1) continue;
      if (karten.slice(2).some((x) => gleich(x, k)) || gleich(k, paar)) continue;
      karten.push(k);
    }
    const g = { karten: z.mischen(karten) };
    if (paare(g).length === 1) return g;
  }
}

/** Merkmal für Stufe 3: das erste (Farbe, Form, Punkte), in dem sich eine andere Karte vom Paar unterscheidet */
export function schrittMerkmal(g: GleichesPaar): keyof Bild {
  const [i] = paare(g)[0];
  const p = g.karten[i - 1];
  return (['farbe', 'form', 'punkte'] as const).find((m) => g.karten.some((k) => k[m] !== p[m])) ?? 'farbe';
}
/** Karten, die Stufe 3 blass macht: die im Merkmal anders sind als das Paar */
export function blasseKarten(g: GleichesPaar): number[] {
  const [i] = paare(g)[0];
  const m = schrittMerkmal(g);
  return g.karten.map((k, j) => (k[m] !== g.karten[i - 1][m] ? j : -1)).filter((j) => j >= 0);
}
const schrittVerraet = (g: GleichesPaar) => g.karten.length - blasseKarten(g).length < 3;

/* ---------- Bild ---------- */

function bildSvg(b: Bild, cx: number, cy: number): string {
  let s = formPfad(b.form, cx, cy + 4, b.form === 'stern' ? 34 : 30, FORM_FARBEN[b.farbe]);
  const lagen: Record<number, [number, number][]> = { 1: [[0, 0]], 2: [[-8, 0], [8, 0]], 3: [[-9, 4], [9, 4], [0, -10]] };
  for (const [dx, dy] of lagen[b.punkte]) s += `<circle cx="${cx + dx}" cy="${cy + 6 + dy}" r="4.6" fill="${WEISS}" stroke="#182218" stroke-width="1.4"/>`;
  return s;
}

function zeichne(g: GleichesPaar, o: ZeichenOptionen): string {
  const n = g.karten.length;
  const spalten = n === 4 ? 2 : n === 6 ? 3 : 4;
  const W = spalten * 120 + 12;
  const loesung = paare(g)[0];
  const gew = o.vorrechnen ? loesung : o.gewaehlt?.art === 'sammel' && o.gewaehlt.zeichen === 'paar' ? (o.gewaehlt.wert as number[]) : null;
  const paarBild = loesung ? g.karten[loesung[0] - 1] : null;
  const blass = o.hilfe >= 3 && !o.vorrechnen && (o.aehnlich || !schrittVerraet(g)) ? blasseKarten(g) : [];
  const reihe = kartenReihe(
    n,
    spalten,
    W,
    0,
    (i, cx, cy) => bildSvg(g.karten[i], cx, cy),
    {
      gewaehlt: gew ? gew.map((x) => x - 1) : null,
      hell: (i) => ((o.hilfe >= 2 || o.vorrechnen) && paarBild && g.karten[i].form === paarBild.form ? 'teil' : null),
      blass: (i) => (blass.includes(i) ? 'schritt' : null),
    },
    (i) => `Karte ${i + 1}`,
  );
  return `<svg class="aufgabe-svg" viewBox="0 0 ${W} ${reihe.hoehe}" role="group" aria-label="Gleiches Paar">${reihe.svg}</svg>`;
}

export const GLEICHES_PAAR: Format<GleichesPaar> = {
  id: 'gleiches-paar',
  nr: 49,
  version: 1,
  bereich: 'blick',
  faehigkeit: 'B1',
  motor: 'verbinden',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'welcheZweiGleich',
  stufen: 3,
  /** hängt nicht vom Zahlenraum ab: liest die Einstellung nicht */
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'bild', mehrfach: true }),
  zeichne,
  schrittVerraet,
  /** Lernbeispiel: (1) drei Karten, zwei rote Kreise mit einem Punkt; (2) gewöhnliche Aufgabe der Stufe 1 aus dem Generator. */
  beispiele: () => {
    const a: Bild = { form: 'kreis', farbe: 'rot', punkte: 1 };
    return [{ karten: [a, { form: 'stern', farbe: 'blau', punkte: 3 }, a] }, aufgabeAus(GLEICHES_PAAR, 0, 1).bedingung];
  },
};
