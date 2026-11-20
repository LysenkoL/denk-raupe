import type { Antwort, Form } from '../perlen/antwort';
import type { Zufall } from '../core/zufall';
import { aufgabeAus, type Format, type ZeichenOptionen } from './format';
import { FIGUR_TOKEN, FORM_FARBEN, LATERNE, LATERNE_KANTE, TINTE, type FormFarbe } from '../design/farbe';
import { formPfad } from '../perlen/maler';
import { schild } from './zaehlen';
import { kartenReihe } from './auswahl';

/**
 * Was passt nicht? (Nr. 26, Engine Auswahl): vier Formen (Stufe 3 auch fünf) auf Karten – eine passt nicht dazu.
 * Nach docs/LOESER.md, Abschnitt 2: geschlossene Liste der Merkmale – Form, Farbe, Größe, Füllung (Grundmerkmale) und
 * Zahl der Ecken, „hat Ecken“ (aus der Form abgeleitet). Ein Merkmal hebt ein Ding heraus, wenn es bei ihm einen Wert hat
 * und alle anderen einen anderen, untereinander gleichen. Der Löser sammelt alle herausgehobenen Dinge; genau eins muss es sein.
 * Stufe 1: vier Formen, nur das gesuchte Merkmal unterscheidet sich.
 * Stufe 2: vier Formen, auch andere Merkmale unterscheiden sich – aber so, dass sie niemanden herausheben (alle gleich,
 *          zwei und zwei, alle verschieden).
 * Stufe 3: fünf Formen, oder das gesuchte Merkmal ist abgeleitet (Quadrat, Raute, Dreieck und Kreis: der Kreis hat keine Ecken).
 * Antwort: Nummer der Karte (sie steht klein oben links), wie bei Wer ist es?.
 *
 * Hilfe auf dem Bild: Stufe 2 zeigt oben ein Schild mit dem gesuchten Merkmal (Farbtupfer, Formen, groß und klein,
 * voll und leer, Ecke); Stufe 3 rahmt zwei Karten ein, die in diesem Merkmal gleich sind – sie sind es nicht.
 */
export type Merkmal = 'form' | 'farbe' | 'groesse' | 'fuellung';
export interface Ding {
  form: Form;
  farbe: FormFarbe;
  gross: boolean;
  voll: boolean;
}
export interface PasstNicht {
  dinge: Ding[];
}

export const ECKEN: Record<Form, number> = { kreis: 0, dreieck: 3, quadrat: 4, raute: 4, stern: 5 };
type Alle = Merkmal | 'ecken' | 'hatEcken';
const wert = (d: Ding, m: Alle): string | number | boolean =>
  m === 'form' ? d.form : m === 'farbe' ? d.farbe : m === 'groesse' ? d.gross : m === 'fuellung' ? d.voll : m === 'ecken' ? ECKEN[d.form] : ECKEN[d.form] > 0;
export const MERKMALE: Alle[] = ['form', 'farbe', 'groesse', 'fuellung', 'ecken', 'hatEcken'];

/** wen hebt das Merkmal heraus? (ein Wert allein, alle anderen gleich untereinander) */
export function heraus(dinge: readonly Ding[], m: Alle): number | null {
  const w = dinge.map((d) => wert(d, m));
  for (let i = 0; i < w.length; i++) {
    const andere = w.filter((_, j) => j !== i);
    if (andere.every((x) => x === andere[0]) && w[i] !== andere[0]) return i;
  }
  return null;
}

/** Löser: alle Dinge, die mindestens ein Merkmal heraushebt */
export function herausgehoben(p: PasstNicht): number[] {
  return [...new Set(MERKMALE.map((m) => heraus(p.dinge, m)).filter((i): i is number => i !== null))].sort((a, b) => a - b);
}

function loesungen(p: PasstNicht): Antwort[] {
  return herausgehoben(p).map((i) => ({ art: 'zahl', wert: i + 1 }));
}

/** gesuchtes Merkmal (für die Hilfe): das erste, das die Lösung heraushebt */
export function gesucht(p: PasstNicht): Alle | null {
  const l = herausgehoben(p);
  return l.length === 1 ? MERKMALE.find((m) => heraus(p.dinge, m) === l[0]) ?? null : null;
}

const FORMEN: Form[] = ['kreis', 'quadrat', 'dreieck', 'raute', 'stern'];
const FARBEN: FormFarbe[] = ['rot', 'orange', 'gelb', 'gruen', 'blau', 'lila'];
const WERTE: Record<Merkmal, readonly (string | boolean)[]> = { form: FORMEN, farbe: FARBEN, groesse: [true, false], fuellung: [true, false] };

/** Verteilung, die niemanden heraushebt: alle gleich, zwei und zwei (drei und zwei), alle verschieden (wo genug Werte) */
function verteilung(z: Zufall, n: number, werte: readonly (string | boolean)[]): (string | boolean)[] {
  const w = z.mischen(werte);
  const arten = ['gleich', 'paare', ...(werte.length >= n ? ['verschieden'] : [])];
  const art = z.eins(arten);
  if (art === 'gleich') return Array(n).fill(w[0]);
  if (art === 'verschieden') return w.slice(0, n);
  // zwei und zwei (vier) oder drei und zwei (fünf)
  return z.mischen(Array.from({ length: n }, (_, k) => (k < Math.ceil(n / 2) ? w[0] : w[1])));
}

function erzeuge(z: Zufall, stufe: number): PasstNicht {
  for (;;) {
    const n = stufe === 3 && z.zahl() < 0.5 ? 5 : 4;
    if (stufe === 3 && n === 4) {
      // abgeleitet: drei eckige Formen, die nach Form und Eckenzahl niemanden heraushebt, und ein Kreis
      const eckig = z.mischen<Form>(['quadrat', 'raute', 'dreieck', 'stern']).slice(0, 3);
      const formen = z.mischen<Form>([...eckig, 'kreis']);
      const farbe = verteilung(z, 4, FARBEN) as FormFarbe[];
      const gross = verteilung(z, 4, [true, false]) as boolean[];
      const dinge = formen.map((form, k) => ({ form, farbe: farbe[k], gross: gross[k], voll: true }));
      if (herausgehoben({ dinge }).length === 1 && heraus(dinge, 'hatEcken') !== null) return { dinge };
      continue;
    }
    const ziel = z.eins<Merkmal>(['form', 'farbe', 'groesse', 'fuellung']);
    const [gemein, anders] = z.mischen(WERTE[ziel]);
    const k = z.ganz(0, n - 1);
    const spalten: Record<Merkmal, (string | boolean)[]> = { form: [], farbe: [], groesse: [], fuellung: [] };
    for (const m of ['form', 'farbe', 'groesse', 'fuellung'] as Merkmal[]) {
      if (m === ziel) spalten[m] = Array.from({ length: n }, (_, i) => (i === k ? anders : gemein));
      else if (stufe === 1) spalten[m] = Array(n).fill(z.eins(WERTE[m]));
      else spalten[m] = verteilung(z, n, WERTE[m]);
    }
    const dinge: Ding[] = Array.from({ length: n }, (_, i) => ({
      form: spalten.form[i] as Form,
      farbe: spalten.farbe[i] as FormFarbe,
      gross: spalten.groesse[i] as boolean,
      voll: spalten.fuellung[i] as boolean,
    }));
    const l = herausgehoben({ dinge });
    if (l.length !== 1 || l[0] !== k) continue;
    // Stufe 2: mindestens ein anderes Merkmal unterscheidet sich
    if (stufe === 2 && (['form', 'farbe', 'groesse', 'fuellung'] as Merkmal[]).every((m) => m === ziel || new Set(spalten[m]).size === 1)) continue;
    return { dinge };
  }
}

/* ---------- Bild ---------- */

function dingSvg(d: Ding, cx: number, cy: number): string {
  const s = d.gross ? 30 : 17;
  const c = FORM_FARBEN[d.farbe];
  return d.voll ? formPfad(d.form, cx, cy + 6, s, c) : formPfad(d.form, cx, cy + 6, s, 'none', c, 6);
}

/** Schild mit dem gesuchten Merkmal (Hilfe Stufe 2) */
function merkmalSchild(x: number, y: number, m: Alle): string {
  const grau = FIGUR_TOKEN['hut-grau'];
  const kante = FIGUR_TOKEN['hut-grau-kante'];
  let t = `<g data-hilfe="teil"><rect x="${x - 5}" y="${y - 5}" width="150" height="72" rx="18" fill="${LATERNE}" stroke="${LATERNE_KANTE}" stroke-width="3"/>` + schild(x, y, 140, 62);
  const cy = y + 32;
  if (m === 'farbe') ['rot', 'gelb', 'blau'].forEach((f, k) => (t += `<circle cx="${x + 38 + k * 32}" cy="${cy}" r="13" fill="${FORM_FARBEN[f as FormFarbe]}" stroke="${TINTE}" stroke-width="2"/>`));
  else if (m === 'form') (['kreis', 'dreieck', 'quadrat'] as Form[]).forEach((f, k) => (t += formPfad(f, x + 38 + k * 32, cy, 12, grau, kante, 3)));
  else if (m === 'groesse') t += formPfad('kreis', x + 50, cy + 8, 9, grau, kante, 3) + formPfad('kreis', x + 92, cy, 20, grau, kante, 3);
  else if (m === 'fuellung') t += formPfad('kreis', x + 50, cy, 17, grau, kante, 3) + formPfad('kreis', x + 92, cy, 15, 'none', kante, 5);
  else t += `<path d="M${x + 44} ${cy + 18} L${x + 70} ${cy - 18} L${x + 96} ${cy + 18}" fill="none" stroke="${kante}" stroke-width="6" stroke-linejoin="miter"/><circle cx="${x + 70}" cy="${cy - 18}" r="7" fill="${FIGUR_TOKEN.halstuch}"/>`;
  return t + '</g>';
}

/**
 * Karten in zwei Reihen (2 + 2 oder 3 + 2). `hilfe` 2: Schild mit dem Merkmal; 3: dazu zwei gleiche Karten gestrichelt
 * umrahmt. `vorrechnen`: Schild, die Lösung gewählt.
 */
function zeichne(p: PasstNicht, o: ZeichenOptionen): string {
  const n = p.dinge.length;
  const spalten = n === 4 ? 2 : 3;
  const W = Math.max(spalten * 120 + 20, 270);
  const m = gesucht(p);
  const l = herausgehoben(p)[0];
  let s = '';
  let oben = 4;
  if ((o.hilfe >= 2 || o.vorrechnen) && m) {
    s += merkmalSchild((W - 140) / 2, 8, m);
    oben = 84;
  }
  // zwei Karten, die im Merkmal gleich sind (nicht die Lösung)
  const gleich = o.hilfe >= 3 && !o.vorrechnen ? p.dinge.map((_, i) => i).filter((i) => i !== l).slice(0, 2) : [];
  const gew = o.vorrechnen ? l : o.gewaehlt?.art === 'zahl' ? o.gewaehlt.wert - 1 : null;
  const k = kartenReihe(n, spalten, W, oben, (i, cx, cy) => dingSvg(p.dinge[i], cx, cy), { gewaehlt: gew, nummer: true, hell: (i) => (gleich.includes(i) ? 'schritt' : null) }, (i) => `Karte ${i + 1}`);
  s += k.svg;
  return `<svg class="aufgabe-svg" viewBox="0 0 ${W} ${oben + k.hoehe}" role="group" aria-label="Was passt nicht?">${s}</svg>`;
}

export const PASST_NICHT: Format<PasstNicht> = {
  id: 'passt-nicht',
  nr: 26,
  version: 1,
  bereich: 'logik',
  faehigkeit: 'L1',
  motor: 'auswahl',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'wasPasstNicht',
  stufen: 3,
  /** hängt nicht vom Zahlenraum ab: liest die Einstellung nicht */
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'bild' }),
  wahl: (p) => p.dinge.map((_, i) => ({ art: 'zahl', wert: i + 1 }) as Antwort),
  zeichne,
  /** Lernbeispiel: (1) zwei rote Kreise und ein blauer; (2) gewöhnliche Aufgabe der Stufe 1 aus dem Generator (vier Formen). */
  beispiele: () => {
    const d = (form: Form, farbe: FormFarbe): Ding => ({ form, farbe, gross: true, voll: true });
    return [{ dinge: [d('kreis', 'rot'), d('kreis', 'blau'), d('kreis', 'rot')] }, aufgabeAus(PASST_NICHT, 0, 1).bedingung];
  },
};
