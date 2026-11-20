import type { Antwort } from '../perlen/antwort';
import type { Zufall } from '../core/zufall';
import { aufgabeAus, type Format, type ZeichenOptionen } from './format';
import { FIGUR_TOKEN, FORM_FARBEN, LATERNE, LATERNE_KANTE, PAPIER, TINTE, TINTE_LEISE, WEISS, kanteZu, type FormFarbe } from '../design/farbe';
import { nest as mulde } from './bildteile';

/**
 * Perlenkette (Nr. 23, Engine Reihe, Antwort Wahl): Perlen auf einer Schnur nach einer Regel („2 rot, 1 blau“). Die ersten
 * Perlen sind aufgefädelt, dann leere Plätze; ein Platz weiter hinten ist markiert – welche Perle kommt dorthin?
 * Stufe 1: Wiederholung aus zwei Perlen (AB), sechs aufgefädelt, gefragt Platz 8.
 * Stufe 2: Wiederholung aus drei (AAB, ABB, ABC), sechs aufgefädelt, gefragt Platz 9 oder 10.
 * Stufe 3: Wiederholung aus drei oder vier (AABB, AAAB, ABAC …), acht aufgefädelt, gefragt Platz 11 oder 12.
 * Der Löser (docs/LOESER.md, Abschnitt 6): alle Längen der Wiederholung, die zu den aufgefädelten Perlen passen und
 * mindestens zweimal ganz zu sehen sind; jede sagt eine Perle für den gefragten Platz voraus – alle müssen gleich sein.
 *
 * Hilfe auf dem Bild: Stufe 2 rahmt die erste Wiederholung ein; Stufe 3 setzt die nächste Perle nach den aufgefädelten
 * blass auf ihren Platz (ein Schritt weiter) – nur wenn das nicht schon der gefragte Platz ist.
 */
export interface Perlenkette {
  perlen: FormFarbe[];
  /** gefragter Platz, ab 0 gezählt; liegt hinter den aufgefädelten */
  frage: number;
  wahl: FormFarbe[];
}

export function vorhersagen(p: readonly FormFarbe[], platz: number): FormFarbe[] {
  const out = new Set<FormFarbe>();
  for (let n = 1; 2 * n <= p.length; n++) if (p.every((x, k) => k < n || x === p[k - n])) out.add(p[platz % n]);
  return [...out];
}

const als = (f: FormFarbe): Antwort => ({ art: 'form', form: 'kreis', farbe: f });

function loesungen(k: Perlenkette): Antwort[] {
  if (k.frage < k.perlen.length) return [];
  const v = vorhersagen(k.perlen, k.frage);
  return k.wahl.filter((w) => v.includes(w)).map(als).filter(() => v.length === 1);
}

const FARBEN: FormFarbe[] = ['rot', 'blau', 'gelb', 'gruen', 'lila', 'orange'];
const PLAENE: Record<number, number[][]> = { 1: [[0, 1]], 2: [[0, 0, 1], [0, 1, 1], [0, 1, 2]], 3: [[0, 0, 1, 1], [0, 0, 0, 1], [0, 1, 0, 2], [0, 0, 1, 2], [0, 1, 2]] };

function erzeuge(z: Zufall, stufe: number): Perlenkette {
  for (;;) {
    const plan = z.eins(PLAENE[stufe] ?? PLAENE[3]);
    const farben = z.mischen(FARBEN).slice(0, Math.max(...plan) + 1);
    const n = stufe === 3 ? 8 : 6;
    const perlen = Array.from({ length: n }, (_, k) => farben[plan[k % plan.length]]);
    const frage = stufe === 1 ? 7 : stufe === 2 ? z.ganz(8, 9) : z.ganz(10, 11);
    const richtig = farben[plan[frage % plan.length]];
    const wahl = z.mischen([richtig, ...z.mischen(FARBEN.filter((f) => f !== richtig && farben.includes(f))), ...z.mischen(FARBEN.filter((f) => !farben.includes(f)))].slice(0, stufe === 1 ? 3 : 4));
    if (wahl.length < 2) continue;
    const k = { perlen, frage, wahl };
    if (loesungen(k).length === 1) return k;
  }
}

/* ---------- Bild ---------- */

const AB = 30;
const R = 13;

function perle(cx: number, cy: number, f: FormFarbe, blass = false): string {
  const c = FORM_FARBEN[f];
  return `<g${blass ? ' opacity="0.45"' : ''}><circle cx="${cx}" cy="${cy + 2}" r="${R}" fill="${kanteZu(c)}"/><circle cx="${cx}" cy="${cy}" r="${R}" fill="${c}"/><ellipse cx="${cx - 4}" cy="${cy - 5}" rx="4.5" ry="3" fill="${WEISS}" opacity="0.6"/></g>`;
}

function zeichne(k: Perlenkette, o: ZeichenOptionen): string {
  const plaetze = k.frage + 1;
  // höchstens 8 Plätze je Zeile, damit die Perlen auf dem Telefon groß bleiben
  const je = Math.min(plaetze, 8);
  const W = je * AB + 40;
  const lage = (i: number): [number, number] => [24 + (i % je) * AB + AB / 2, 40 + Math.floor(i / je) * 64];
  let s = '';
  const zeilen = Math.ceil(plaetze / je);
  for (let z = 0; z < zeilen; z++) {
    const [x1, y] = lage(z * je);
    const [x2] = lage(Math.min(plaetze, (z + 1) * je) - 1);
    s += `<path d="M${x1 - 18} ${y}H${x2 + 18}" stroke="${FIGUR_TOKEN['ast-kante']}" stroke-width="3" stroke-linecap="round"/>`;
  }
  const p = Math.min(...[1, 2, 3, 4].filter((n) => k.perlen.every((x, i) => i < n || x === k.perlen[i - n])));
  if ((o.hilfe >= 2 || o.vorrechnen) && Number.isFinite(p)) {
    const [x] = lage(0);
    const [, y] = lage(0);
    s += `<rect data-hilfe="teil" x="${x - R - 5}" y="${y - R - 6}" width="${p * AB - AB + 2 * R + 10}" height="${2 * R + 14}" rx="${R + 6}" fill="${LATERNE}" stroke="${LATERNE_KANTE}" stroke-width="3"/>`;
  }
  k.perlen.forEach((f, i) => {
    const [x, y] = lage(i);
    s += perle(x, y, f);
  });
  for (let i = k.perlen.length; i < k.frage; i++) {
    const [x, y] = lage(i);
    if (i === k.perlen.length && o.hilfe >= 3 && !o.vorrechnen && Number.isFinite(p)) s += `<g data-hilfe="schritt">${perle(x, y, k.perlen[i % p], true)}</g>`;
    else s += `<circle cx="${x}" cy="${y}" r="${R - 3}" fill="${PAPIER}" stroke="${TINTE_LEISE}" stroke-width="2" stroke-dasharray="4 3"/>`;
  }
  const [fx, fy] = lage(k.frage);
  s += mulde(fx - 22, fy - 22, 44, 40);
  const zeig = o.vorrechnen ? loesungen(k)[0] : o.gewaehlt;
  if (zeig?.art === 'form') s += `<g${o.vorrechnen ? '' : ' data-inhalt=""'}>${perle(fx, fy, zeig.farbe)}</g>`;
  else s += `<text x="${fx}" y="${fy + 9}" text-anchor="middle" font-size="24" font-weight="800" fill="${TINTE_LEISE}">?</text>`;
  s += `<text x="${fx}" y="${fy + 42}" text-anchor="middle" font-size="16" font-weight="800" fill="${TINTE}">${k.frage + 1}</text>`;
  return `<svg class="aufgabe-svg" viewBox="0 0 ${W} ${40 + zeilen * 64}" role="img" aria-label="Perlenkette">${s}</svg>`;
}

export const PERLENKETTE: Format<Perlenkette> = {
  id: 'perlenkette',
  nr: 23,
  version: 1,
  bereich: 'muster',
  faehigkeit: 'M1',
  motor: 'reihe',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'welchePerleKommt',
  stufen: 3,
  /** hängt nicht vom Zahlenraum ab: liest die Einstellung nicht */
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'wahl' }),
  wahl: (k) => k.wahl.map(als),
  zeichne,
  /** Lernbeispiel: (1) rot, blau im Wechsel – gleich die nächste Perle; (2) gewöhnliche Aufgabe der Stufe 1 aus dem Generator. */
  beispiele: () => [{ perlen: ['rot', 'blau', 'rot', 'blau'], frage: 4, wahl: ['blau', 'rot'] }, aufgabeAus(PERLENKETTE, 0, 1).bedingung],
};
