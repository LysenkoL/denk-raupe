import type { Antwort, Form } from '../perlen/antwort';
import type { Zufall } from '../core/zufall';
import { aufgabeAus, type Format, type ZeichenOptionen } from './format';
import { FORM_FARBEN, TINTE_LEISE, type FormFarbe } from '../design/farbe';
import { formPfad } from '../perlen/maler';
import { gleich } from '../perlen/antwort';
import { hilfeRahmen } from './zaehlen';
import { stein } from './plan';
import { nest as mulde } from './bildteile';

/**
 * Bilder-Gitter (Nr. 21, Engine Raster mit einer leeren Zelle, Antwort Wahl): 3 × 3 Felder mit Formen; jedes Merkmal
 * (Form, Farbe, Größe) folgt einer Regel nach Zeilen oder Spalten. Ein Feld ist leer – was gehört hinein?
 * Stufe 1: in jeder Zeile dieselbe Form, in jeder Spalte dieselbe Farbe; Größe überall gleich. Drei Perlen.
 * Stufe 2: in jeder Zeile alle drei Formen (in anderer Reihenfolge), in jeder Spalte dieselbe Farbe. Vier Perlen.
 * Stufe 3: drei Merkmale – Formen und Farben je Zeile alle verschieden, die Größe gleich je Zeile. Vier Perlen.
 * Der Löser (docs/LOESER.md, Abschnitt 6): für jedes Merkmal alle Regeln – Zeile gleich, Spalte gleich, Zeile alle
 * verschieden, Spalte alle verschieden –, die zu den vollen Feldern passen; jede passende Regel sagt einen Wert für das
 * leere Feld voraus. Ein Merkmal ist bestimmt, wenn alle passenden Regeln denselben Wert sagen. Passt keine Regel oder
 * sagen zwei verschiedenes, ist die Aufgabe nicht eindeutig. Die Lösung ist die Perle mit allen bestimmten Werten.
 *
 * Hilfe auf dem Bild: Stufe 2 rahmt die Zeile mit dem leeren Feld ein; Stufe 3 dazu die Spalte.
 */
export interface Element {
  form: Form;
  farbe: FormFarbe;
  klein: boolean;
}
export interface BilderGitter {
  /** 3 × 3, Zeile für Zeile; null = leeres Feld */
  felder: (Element | null)[];
  perlen: Element[];
}

type Merkmal = 'form' | 'farbe' | 'klein';
type Wert = string | boolean;

/** Wert, den die Regeln für das leere Feld vorhersagen; undefined = nicht bestimmt */
export function vorhersage(g: BilderGitter, m: Merkmal): Wert | undefined {
  const leer = g.felder.findIndex((f) => f === null);
  const [lz, ls] = [Math.floor(leer / 3), leer % 3];
  const w = (z: number, s: number): Wert | undefined => g.felder[z * 3 + s]?.[m];
  const reihe = (z: number) => [0, 1, 2].map((s) => w(z, s));
  const spalte = (s: number) => [0, 1, 2].map((z) => w(z, s));
  const linien = (art: 'zeile' | 'spalte') => [0, 1, 2].map((k) => (art === 'zeile' ? reihe(k) : spalte(k)));
  const voraus: Wert[] = [];
  for (const art of ['zeile', 'spalte'] as const) {
    const alle = linien(art);
    const meine = alle[art === 'zeile' ? lz : ls];
    const andere = alle.filter((_, k) => k !== (art === 'zeile' ? lz : ls));
    const bekannt = meine.filter((x): x is Wert => x !== undefined);
    // gleich: jede volle Linie einheitlich, die eigene ebenso
    if (andere.every((l) => l.every((x) => x === l[0])) && bekannt.every((x) => x === bekannt[0])) voraus.push(bekannt[0]);
    // alle verschieden: jede volle Linie hat drei verschiedene Werte, alle dieselbe Menge
    const menge = new Set(andere[0] as Wert[]);
    if (menge.size === 3 && andere.every((l) => new Set(l).size === 3 && l.every((x) => menge.has(x as Wert))) && new Set(bekannt).size === bekannt.length && bekannt.every((x) => menge.has(x))) {
      const fehlt = [...menge].find((x) => !bekannt.includes(x));
      if (fehlt !== undefined) voraus.push(fehlt);
    }
  }
  if (!voraus.length || voraus.some((v) => v !== voraus[0])) return undefined;
  return voraus[0];
}

const als = (e: Element): Antwort => ({ art: 'form', form: e.form, farbe: e.farbe, ...(e.klein ? { klein: true } : {}) });

function loesungen(g: BilderGitter): Antwort[] {
  if (g.felder.filter((f) => f === null).length !== 1) return [];
  const v = { form: vorhersage(g, 'form'), farbe: vorhersage(g, 'farbe'), klein: vorhersage(g, 'klein') };
  return g.perlen.filter((p) => (v.form === undefined || p.form === v.form) && (v.farbe === undefined || p.farbe === v.farbe) && (v.klein === undefined || p.klein === v.klein)).map(als)
    .filter(() => v.form !== undefined && v.farbe !== undefined && v.klein !== undefined);
}

const FORMEN: Form[] = ['kreis', 'quadrat', 'dreieck', 'raute', 'stern'];
const FARBEN: FormFarbe[] = ['rot', 'orange', 'gelb', 'gruen', 'blau', 'lila'];

/** lateinisches Quadrat aus drei Werten: Zeile z hat die Werte, um z verschoben (Zeilen gemischt) */
function latein<T>(z: Zufall, werte: T[]): T[][] {
  const r = [0, 1, 2].map((k) => [0, 1, 2].map((s) => werte[(s + k) % 3]));
  return z.mischen(r);
}

function erzeuge(z: Zufall, stufe: number): BilderGitter {
  const formen = z.mischen(FORMEN).slice(0, 3);
  const farben = z.mischen(FARBEN).slice(0, 3);
  for (;;) {
    let form: Form[][];
    let farbe: FormFarbe[][];
    let klein: boolean[][];
    if (stufe === 1) {
      form = formen.map((f) => [f, f, f]);
      farbe = [0, 1, 2].map(() => [...farben]);
      klein = form.map(() => [false, false, false]);
    } else if (stufe === 2) {
      form = latein(z, formen);
      farbe = [0, 1, 2].map(() => [...farben]);
      klein = form.map(() => [false, false, false]);
    } else {
      form = latein(z, formen);
      farbe = latein(z, farben);
      const kz = z.mischen([true, false, false]);
      klein = kz.map((k) => [k, k, k]);
    }
    const felder: (Element | null)[] = [];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) felder.push({ form: form[i][j], farbe: farbe[i][j], klein: klein[i][j] });
    const leer = z.ganz(0, 8);
    const richtig = felder[leer]!;
    felder[leer] = null;
    // falsche Perlen: ein Merkmal anders (Form, Farbe, Größe), aus dem Gitter genommene Werte
    const kandidaten: Element[] = z.mischen([
      { ...richtig, form: z.eins(formen.filter((f) => f !== richtig.form)) },
      { ...richtig, farbe: z.eins(farben.filter((f) => f !== richtig.farbe)) },
      { ...richtig, klein: !richtig.klein },
      { ...richtig, form: z.eins(formen.filter((f) => f !== richtig.form)), farbe: z.eins(farben.filter((f) => f !== richtig.farbe)) },
    ]);
    const anzahl = stufe === 1 ? 3 : 4;
    const perlen: Element[] = [richtig];
    for (const k of kandidaten) if (perlen.length < anzahl && !perlen.some((p) => gleich(als(p), als(k)))) perlen.push(k);
    const g = { felder, perlen: z.mischen(perlen) };
    if (loesungen(g).length === 1) return g;
  }
}

/* ---------- Bild ---------- */

const ZE = 76;

function zeichne(g: BilderGitter, o: ZeichenOptionen): string {
  const W = 3 * ZE + 20;
  const leer = g.felder.findIndex((f) => f === null);
  const [lz, ls] = [Math.floor(leer / 3), leer % 3];
  let s = '';
  if (o.hilfe >= 2 || o.vorrechnen) s += hilfeRahmen(4, 4 + lz * ZE, 3 * ZE + 12, ZE + 4, 'teil');
  if (o.hilfe >= 3 || o.vorrechnen) s += hilfeRahmen(4 + ls * ZE, 4, ZE + 4, 3 * ZE + 12, 'schritt');
  const zeig = o.vorrechnen ? loesungen(g)[0] : o.gewaehlt;
  g.felder.forEach((f, i) => {
    const x = 10 + (i % 3) * ZE;
    const y = 10 + Math.floor(i / 3) * ZE;
    if (f) s += stein(x, y, ZE - 6, ZE - 6) + formPfad(f.form, x + ZE / 2 - 3, y + ZE / 2 - 3, f.klein ? 13 : 22, FORM_FARBEN[f.farbe]);
    else {
      s += mulde(x, y, ZE - 6, ZE - 10);
      if (zeig?.art === 'form') s += `<g${o.vorrechnen ? '' : ' data-inhalt=""'}>${formPfad(zeig.form, x + ZE / 2 - 3, y + ZE / 2 - 3, zeig.klein ? 13 : 22, FORM_FARBEN[zeig.farbe])}</g>`;
      else s += `<text x="${x + ZE / 2 - 3}" y="${y + ZE / 2 + 7}" text-anchor="middle" font-size="30" font-weight="800" fill="${TINTE_LEISE}">?</text>`;
    }
  });
  return `<svg class="aufgabe-svg" viewBox="0 0 ${W} ${3 * ZE + 20}" role="img" aria-label="Bilder-Gitter">${s}</svg>`;
}

export const BILDER_GITTER: Format<BilderGitter> = {
  id: 'bilder-gitter',
  nr: 21,
  version: 1,
  bereich: 'muster',
  faehigkeit: 'M2',
  motor: 'raster',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'wasGehoertHinein',
  stufen: 3,
  /** hängt nicht vom Zahlenraum ab: liest die Einstellung nicht */
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'wahl' }),
  wahl: (g) => g.perlen.map(als),
  zeichne,
  /** Lernbeispiel: (1) gewöhnliche Aufgabe der Stufe 1 mit zwei Perlen (aus dem Generator, gekürzt); (2) ohne Kürzung. */
  beispiele: () => {
    const b = aufgabeAus(BILDER_GITTER, 0, 1).bedingung;
    const l = loesungen(b)[0];
    const zwei = [b.perlen.find((p) => gleich(als(p), l))!, b.perlen.find((p) => !gleich(als(p), l))!];
    return [{ ...b, perlen: zwei }, b];
  },
};
