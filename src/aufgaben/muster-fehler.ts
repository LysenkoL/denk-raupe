import type { Antwort, Form } from '../perlen/antwort';
import type { Zufall } from '../core/zufall';
import { aufgabeAus, type Format, type ZeichenOptionen } from './format';
import { FOKUS, FORM_FARBEN, HOLZ, HOLZ_KANTE, LATERNE, LATERNE_KANTE, PAPIER, TINTE, TINTE_LEISE, WEISS, type FormFarbe } from '../design/farbe';
import { formPfad } from '../perlen/maler';

/**
 * Fehler im Muster (Nr. 20, Engine Auswahl, Antwort Platz als Zahl): eine Reihe aus Formen wiederholt sich – aber ein
 * Ding ist falsch. Das Kind tippt darauf; unter jedem Platz steht klein seine Nummer.
 * Stufe 1: Wiederholung aus zwei Dingen (AB), 6–8 Plätze; das falsche Ding ist in Form und Farbe anders.
 * Stufe 2: Wiederholung aus drei Dingen (ABC, AAB, ABB), 9 Plätze; das falsche Ding ist in Form und Farbe anders.
 * Stufe 3: schwerer wird die Ähnlichkeit – Wiederholung aus zwei bis vier Dingen, 8–10 Plätze; das falsche Ding
 *          unterscheidet sich nur in der Farbe ODER nur in der Form.
 * Der Löser (docs/LOESER.md, Abschnitt 6): alle Plätze und alle Ersatz-Dinge – welche einzelne Änderung macht die Reihe
 * zu einem Muster (Wiederholung, mindestens zweimal ganz zu sehen)? Genau ein Platz muss es sein; ist die Reihe schon
 * ein Muster, gibt es keinen Fehler.
 *
 * Hilfe auf dem Bild: Stufe 2 rahmt die erste Wiederholung ein; Stufe 3 rahmt jede ganze Wiederholung ein – der Fehler
 * steckt in einer davon (das Kind vergleicht selbst).
 */
export interface Element {
  form: Form;
  farbe: FormFarbe;
}
export interface MusterFehler {
  reihe: Element[];
}

const gleich = (a: Element, b: Element) => a.form === b.form && a.farbe === b.farbe;
const FORMEN: Form[] = ['kreis', 'quadrat', 'dreieck', 'raute', 'stern'];
const FARBEN: FormFarbe[] = ['rot', 'orange', 'gelb', 'gruen', 'blau', 'lila'];
const ALLE: Element[] = FORMEN.flatMap((form) => FARBEN.map((farbe) => ({ form, farbe })));

/** kürzeste Wiederholung, die mindestens zweimal ganz zu sehen ist, oder null */
export function periode(r: readonly Element[]): number | null {
  for (let p = 1; 2 * p <= r.length; p++) if (r.every((e, k) => k < p || gleich(e, r[k - p]))) return p;
  return null;
}

/** Plätze, an denen eine einzige Änderung die Reihe zum Muster macht */
export function fehlerPlaetze(r: readonly Element[]): number[] {
  if (periode(r) !== null) return [];
  const out: number[] = [];
  r.forEach((_, i) => {
    if (ALLE.some((e) => !gleich(e, r[i]) && periode(r.map((x, k) => (k === i ? e : x))) !== null)) out.push(i);
  });
  return out;
}

function loesungen(m: MusterFehler): Antwort[] {
  return fehlerPlaetze(m.reihe).map((i) => ({ art: 'zahl', wert: i + 1 }));
}

const BAUPLAENE: Record<number, number[][]> = { 1: [[0, 1]], 2: [[0, 1, 2], [0, 0, 1], [0, 1, 1]], 3: [[0, 1], [0, 1, 2], [0, 0, 1], [0, 1, 2, 3], [0, 1, 1, 2]] };

function erzeuge(z: Zufall, stufe: number): MusterFehler {
  for (;;) {
    const plan = z.eins(BAUPLAENE[stufe] ?? BAUPLAENE[3]);
    const p = plan.length;
    const n = stufe === 1 ? z.ganz(6, 8) : stufe === 2 ? 9 : z.ganz(Math.max(8, 2 * p + 1), 10);
    const teile = z.mischen(ALLE).slice(0, Math.max(...plan) + 1);
    // verschiedene Teile unterscheiden sich in Form und Farbe (das Muster ist klar zu sehen)
    if (teile.some((a, i) => teile.some((b, j) => i < j && (a.form === b.form || a.farbe === b.farbe)))) continue;
    const reihe = Array.from({ length: n }, (_, k) => teile[plan[k % p]]);
    const i = z.ganz(0, n - 1);
    const soll = reihe[i];
    const moeglich = ALLE.filter((e) => {
      if (stufe === 3) return (e.form === soll.form) !== (e.farbe === soll.farbe);
      return e.form !== soll.form && e.farbe !== soll.farbe;
    });
    reihe[i] = z.eins(moeglich);
    const l = fehlerPlaetze(reihe);
    if (l.length === 1 && l[0] === i) return { reihe };
  }
}

/* ---------- Bild ---------- */

const AB = 58;
const H = 96;

/**
 * Leiste aus Holz mit den Plätzen; ab 8 Plätzen in zwei Zeilen (wie Text: links nach rechts, dann die nächste Zeile),
 * damit jede Tippfläche auf dem Telefon groß genug bleibt. `hilfe` 2: erste Wiederholung eingerahmt; 3: jede ganze.
 */
function zeichne(m: MusterFehler, o: ZeichenOptionen): string {
  const n = m.reihe.length;
  const je = n >= 8 ? Math.ceil(n / 2) : n;
  const zeilen = Math.ceil(n / je);
  const W = je * AB + 16;
  const lage = (k: number): [number, number] => [8 + (k % je) * AB + AB / 2, Math.floor(k / je) * (H + 8)];
  // Periode zum Rahmen: die des richtigen Musters (Lösung zurückgesetzt)
  const l = fehlerPlaetze(m.reihe)[0];
  let p: number | null = null;
  if (l !== undefined) for (const e of ALLE) if (p === null) p = periode(m.reihe.map((x, k) => (k === l ? e : x)));
  let s = '';
  for (let z = 0; z < zeilen; z++) s += `<rect x="2" y="${z * (H + 8) + 10}" width="${W - 4}" height="${H - 34}" rx="16" fill="${HOLZ_KANTE}"/><rect x="2" y="${z * (H + 8) + 6}" width="${W - 4}" height="${H - 34}" rx="16" fill="${HOLZ}"/>`;
  if (p && (o.hilfe >= 2 || o.vorrechnen)) {
    const anzahl = o.hilfe >= 3 || o.vorrechnen ? Math.floor(n / p) : 1;
    // Rahmen je Wiederholung, an Zeilenenden geteilt
    for (let w = 0; w < anzahl; w++)
      for (let k = w * p; k < (w + 1) * p; ) {
        const zeile = Math.floor(k / je);
        const ende = Math.min((w + 1) * p, (zeile + 1) * je);
        const [x0, y0] = lage(k);
        s += `<rect data-hilfe="${w === 0 ? 'teil' : 'schritt'}" x="${x0 - AB / 2 + 1}" y="${y0 + 10}" width="${(ende - k) * AB - 2}" height="${H - 42}" rx="13" fill="${w === 0 ? LATERNE : 'none'}" stroke="${LATERNE_KANTE}" stroke-width="3.5"${w ? ' stroke-dasharray="8 6"' : ''}/>`;
        k = ende;
      }
  }
  const gew = o.vorrechnen ? l : o.gewaehlt?.art === 'zahl' ? o.gewaehlt.wert - 1 : null;
  m.reihe.forEach((e, k) => {
    const [cx, y] = lage(k);
    s += `<g class="wahl-ziel" data-wahl="${k}" role="button" tabindex="0" aria-label="Platz ${k + 1}" opacity="1">`;
    s += `<rect x="${cx - AB / 2 + 2}" y="${y + 8}" width="${AB - 4}" height="${H - 8}" rx="10" fill="${PAPIER}" opacity="0.01"/>`;
    s += `<circle cx="${cx}" cy="${y + 37}" r="22" fill="${WEISS}" opacity="0.5"/>`;
    s += formPfad(e.form, cx, y + 37, 18, FORM_FARBEN[e.farbe]);
    if (gew === k) s += `<rect${o.vorrechnen ? '' : ' data-inhalt=""'} x="${cx - AB / 2 + 2}" y="${y + 10}" width="${AB - 4}" height="${H - 12}" rx="11" fill="none" stroke="${FOKUS}" stroke-width="4.5"/>`;
    s += `<text x="${cx}" y="${y + H - 4}" text-anchor="middle" font-size="18" font-weight="800" fill="${gew === k ? TINTE : TINTE_LEISE}">${k + 1}</text>`;
    s += '</g>';
  });
  return `<svg class="aufgabe-svg" viewBox="0 0 ${W} ${zeilen * (H + 8) - 4}" role="group" aria-label="Fehler im Muster">${s}</svg>`;
}

export const MUSTER_FEHLER: Format<MusterFehler> = {
  id: 'muster-fehler',
  nr: 20,
  version: 1,
  bereich: 'muster',
  faehigkeit: 'M1',
  motor: 'auswahl',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'wasIstFalsch',
  stufen: 3,
  /** hängt nicht vom Zahlenraum ab: liest die Einstellung nicht */
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'bild' }),
  wahl: (m) => m.reihe.map((_, i) => ({ art: 'zahl', wert: i + 1 }) as Antwort),
  zeichne,
  /** Lernbeispiel: (1) sechs rote Kreise und ein blauer Stern in der Mitte (bei sechs Plätzen gäbe es zwei Fehlerplätze: Wiederholung aus drei); (2) gewöhnliche Aufgabe der Stufe 1 aus dem Generator. */
  beispiele: () => {
    const k: Element = { form: 'kreis', farbe: 'rot' };
    return [{ reihe: [k, k, k, { form: 'stern', farbe: 'blau' }, k, k, k] }, aufgabeAus(MUSTER_FEHLER, 0, 1).bedingung];
  },
};
