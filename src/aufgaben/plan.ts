import type { Antwort, Form } from '../perlen/antwort';
import { gleich } from '../perlen/antwort';
import type { Zufall } from '../core/zufall';
import { aufgabeAus, type Format, type ZeichenOptionen } from './format';
import { FORM_FARBEN, LATERNE, LATERNE_KANTE, STEIN, STEIN_KANTE, TINTE, TINTE_LEISE, WEISS, type FormFarbe } from '../design/farbe';
import { nest as mulde } from './bildteile';
import { formPfad } from '../perlen/maler';
import { hilfeRahmen, schild, svgHuelle } from './zaehlen';

/**
 * Plan (Nr. 41, Engine Bild, Antwort Wahl): ein Feld mit Buchstaben oben (A, B, …) und Zahlen links (1, 2, …);
 * in jedem Feld liegt eine Form. Das Schild nennt ein Feld („B2“) – was liegt dort?
 * Stufe 1: 2 × 2 Felder, drei Perlen zur Wahl.
 * Stufe 2: schwerer wird die Größe – 3 × 3 Felder, vier Perlen; eine davon liegt im „vertauschten“ Feld (2B statt B2).
 * Stufe 3: schwerer wird die Ähnlichkeit – 4 × 4 Felder, die Formen ähneln sich (gleiche Form in mehreren Farben
 *          oder gleiche Farbe in mehreren Formen), vier Perlen mit vertauschtem Feld und Nachbarn.
 * Der Löser liest das Feld unter Buchstabe und Zahl des Schildes; liegt es außerhalb, gibt es keine Antwort.
 *
 * Hilfe auf dem Bild: Stufe 2 hebt Buchstabe und Zahl am Rand warm hervor; Stufe 3 legt dazu einen Rahmen um die
 * ganze Spalte des Buchstabens – dort sucht das Kind die Zahl selbst. Bei einer Spalte aus einem einzigen Feld
 * würde das alles verraten; das kommt nicht vor (mindestens 2 Zeilen).
 */
export interface Element {
  form: Form;
  farbe: FormFarbe;
}
export interface Plan {
  spalten: number;
  zeilen: number;
  /** Zeile für Zeile, oben links zuerst */
  felder: Element[];
  /** gefragtes Feld: Spalte (0 = A) und Zeile (0 = 1) */
  frage: [number, number];
}

export const FORMEN: Form[] = ['kreis', 'quadrat', 'dreieck', 'raute', 'stern'];
export const FARBEN: FormFarbe[] = ['rot', 'orange', 'gelb', 'gruen', 'blau', 'lila'];
export const BUCHSTABEN = 'ABCD';

export const alsAntwort = (e: Element): Antwort => ({ art: 'form', form: e.form, farbe: e.farbe });

function loesungen(p: Plan): Antwort[] {
  const [s, z] = p.frage;
  if (s < 0 || z < 0 || s >= p.spalten || z >= p.zeilen) return [];
  return [alsAntwort(p.felder[z * p.spalten + s])];
}

/** `n` verschiedene Elemente; `aehnlich`: alle aus einer Form oder einer Farbe, wo es reicht */
export function elemente(z: Zufall, n: number, aehnlich = false): Element[] {
  const alle = FORMEN.flatMap((form) => FARBEN.map((farbe) => ({ form, farbe })));
  if (aehnlich) {
    // zwei Formen in allen Farben oder drei Farben in allen Formen: viele sehen sich ähnlich
    const nachForm = z.zahl() < 0.5;
    const formen = z.mischen(FORMEN).slice(0, Math.ceil(n / FARBEN.length) + 1);
    const farben = z.mischen(FARBEN).slice(0, Math.ceil(n / FORMEN.length) + 1);
    const pool = alle.filter((e) => (nachForm ? formen.includes(e.form) : farben.includes(e.farbe)));
    return z.mischen(pool).slice(0, n);
  }
  return z.mischen(alle).slice(0, n);
}

function erzeuge(z: Zufall, stufe: number): Plan {
  const n = stufe === 1 ? 2 : stufe === 2 ? 3 : 4;
  const felder = elemente(z, n * n, stufe === 3);
  // auf Stufe 2 und 3 nie ein Feld auf der Diagonale: dort wäre das vertauschte Feld dasselbe
  for (;;) {
    const frage: [number, number] = [z.ganz(0, n - 1), z.ganz(0, n - 1)];
    if (stufe > 1 && frage[0] === frage[1]) continue;
    return { spalten: n, zeilen: n, felder, frage };
  }
}

/** Wahl: die Lösung, das vertauschte Feld, Nachbarn, dann andere – verschiedene Elemente, gemischt */
function wahl(p: Plan, z: Zufall): Antwort[] {
  const l = loesungen(p)[0];
  const n = p.spalten * p.zeilen <= 4 ? 3 : 4;
  const [s, r] = p.frage;
  const an = (sp: number, ze: number) => (sp >= 0 && ze >= 0 && sp < p.spalten && ze < p.zeilen ? alsAntwort(p.felder[ze * p.spalten + sp]) : null);
  const kandidaten = [an(r, s), an(s, r - 1), an(s, r + 1), an(s - 1, r), an(s + 1, r), ...z.mischen(p.felder).map(alsAntwort)];
  const out: Antwort[] = [l];
  for (const k of kandidaten) if (k && out.length < n && !out.some((o) => gleich(o, k))) out.push(k);
  return z.mischen(out);
}

/* ---------- Bild (auch für Oben, unten, links, rechts) ---------- */

export const ZELLE = 66;

/** Feld aus Sandstein; `hell`: warm hervorgehoben (Hilfe) */
export function stein(x: number, y: number, w: number, h: number): string {
  return (
    `<rect x="${x}" y="${y + 3}" width="${w}" height="${h}" rx="10" fill="${STEIN_KANTE}"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${STEIN}"/>` +
    `<rect x="${x + 7}" y="${y + 3}" width="${w - 14}" height="3" rx="1.5" fill="${WEISS}" opacity="0.45"/>`
  );
}

/** Form im Feld mit dunklem Umriss (wie in den Wahlkacheln) */
export function formIm(x: number, y: number, e: Element, s = 20): string {
  return formPfad(e.form, x, y, s, FORM_FARBEN[e.farbe]);
}

export const text = (x: number, y: number, t: string, groesse = 26, farbe = TINTE) =>
  `<text x="${x}" y="${y + groesse * 0.36}" text-anchor="middle" font-size="${groesse}" font-weight="800" fill="${farbe}">${t}</text>`;

/**
 * Nest neben dem Schild: darin „?“ oder die gewählte Form (data-inhalt) – sieht gleich aus, ob sie stimmt.
 * `loesung`: nur beim Vorrechnen (ähnliche Aufgabe).
 */
export function antwortNest(x: number, y: number, a: Antwort | null | undefined, loesung = false): string {
  let t = mulde(x, y, 62, 58);
  if (a?.art === 'form') t += `<g${loesung ? '' : ' data-inhalt=""'}>${formPfad(a.form, x + 31, y + 31, 19, FORM_FARBEN[a.farbe])}</g>`;
  else t += text(x + 31, y + 30, '?', 30, TINTE_LEISE);
  return t;
}

const RAND = 34;
const KOPF = 86;

/**
 * Schild mit dem Feld („B2“) oben links, darunter der Plan mit Buchstaben und Zahlen am Rand.
 * `hilfe` 2: Buchstabe und Zahl am Rand hervorgehoben; 3: dazu Rahmen um die Spalte.
 * `vorrechnen`: dazu das gefragte Feld umrahmt.
 */
function zeichne(p: Plan, o: ZeichenOptionen): string {
  const W = RAND + p.spalten * ZELLE + 14;
  const H = KOPF + RAND + p.zeilen * ZELLE + 12;
  const [fs, fz] = p.frage;
  const name = `${BUCHSTABEN[fs]}${fz + 1}`;
  let s = schild(8, 8, 96, 62) + text(56, 38, name, 34);
  const x0 = RAND + 4;
  const y0 = KOPF + RAND;
  const hell = o.hilfe >= 2 || !!o.vorrechnen;
  if (o.hilfe >= 3 || o.vorrechnen) s += hilfeRahmen(x0 + fs * ZELLE - 4, y0 - 4, ZELLE + 2, p.zeilen * ZELLE + 2, o.vorrechnen ? 'teil' : 'schritt');
  if (o.vorrechnen) s += hilfeRahmen(x0 - RAND, y0 + fz * ZELLE - 4, (fs + 1) * ZELLE + RAND, ZELLE + 2, 'teil');
  for (let k = 0; k < p.spalten; k++) {
    const cx = x0 + k * ZELLE + ZELLE / 2 - 3;
    if (hell && k === fs) s += `<circle data-hilfe="teil" cx="${cx}" cy="${y0 - RAND / 2 - 2}" r="17" fill="${LATERNE}" stroke="${LATERNE_KANTE}" stroke-width="3"/>`;
    s += text(cx, y0 - RAND / 2 - 2, BUCHSTABEN[k], 24);
  }
  for (let r = 0; r < p.zeilen; r++) {
    const cy = y0 + r * ZELLE + ZELLE / 2 - 3;
    if (hell && r === fz) s += `<circle data-hilfe="teil" cx="${RAND / 2 + 1}" cy="${cy}" r="17" fill="${LATERNE}" stroke="${LATERNE_KANTE}" stroke-width="3"/>`;
    s += text(RAND / 2 + 1, cy, String(r + 1), 24);
  }
  p.felder.forEach((e, i) => {
    const x = x0 + (i % p.spalten) * ZELLE;
    const y = y0 + Math.floor(i / p.spalten) * ZELLE;
    s += stein(x, y, ZELLE - 6, ZELLE - 6) + formIm(x + ZELLE / 2 - 3, y + ZELLE / 2 - 3, e);
  });
  s += antwortNest(114, 10, o.vorrechnen ? loesungen(p)[0] : o.gewaehlt, !!o.vorrechnen);
  return svgHuelle(Math.max(W, 170), H, 'Plan', s);
}

export const PLAN: Format<Plan> = {
  id: 'plan',
  nr: 41,
  version: 1,
  bereich: 'raum',
  faehigkeit: 'R4',
  motor: 'bild',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'wasLiegtImFeld',
  stufen: 3,
  /** hängt nicht vom Zahlenraum ab: liest die Einstellung nicht */
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'wahl' }),
  wahl,
  zeichne,
  /** Stufe 3 (Rahmen um die Spalte) verrät alles, wenn die Spalte nur ein Feld hat */
  schrittVerraet: (p) => p.zeilen < 2,
  /**
   * Lernbeispiel: (1) eine Reihe aus zwei Feldern, gefragt B1; (2) 2 × 2, gefragt A1; (3) gewöhnliche Aufgabe der
   * Stufe 1 aus dem Generator (erster Samen, dessen Feld nicht A1 ist).
   */
  beispiele: () => {
    const e = (form: Form, farbe: FormFarbe): Element => ({ form, farbe });
    let dritte: Plan | null = null;
    for (let s = 0; !dritte; s++) {
      const b = aufgabeAus(PLAN, s * 2654435761, 1).bedingung;
      if (b.frage[0] + b.frage[1] > 0) dritte = b;
    }
    return [
      { spalten: 2, zeilen: 1, felder: [e('kreis', 'rot'), e('stern', 'blau')], frage: [1, 0] },
      { spalten: 2, zeilen: 2, felder: [e('quadrat', 'gruen'), e('dreieck', 'orange'), e('raute', 'lila'), e('kreis', 'gelb')], frage: [0, 0] },
      dritte,
    ];
  },
};
