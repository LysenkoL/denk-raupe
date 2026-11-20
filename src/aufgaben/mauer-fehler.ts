import type { Antwort } from '../perlen/antwort';
import type { Zufall } from '../core/zufall';
import { aufgabeAus, type Einstellung, type Format, type ZeichenOptionen } from './format';
import { FOKUS, LATERNE, LATERNE_KANTE, STEIN, STEIN_KANTE, TINTE, WEISS } from '../design/farbe';
import { kleinerRaum } from './zaehlen';

/**
 * Fehler in der Mauer (Nr. 95, Engine Auswahl, Antwort Zahl auf dem Stein): eine fertig ausgerechnete Zahlenmauer –
 * jeder Stein ist die Summe der zwei Steine darunter –, aber ein Stein stimmt nicht. Das Kind tippt auf ihn.
 * Stufe 1: drei Reihen, Zahlen bis 10 (bei Zahlenraum 100 bis 20).
 * Stufe 2: drei Reihen im ganzen Zahlenraum.
 * Stufe 3: vier Reihen im ganzen Zahlenraum (bis 10 passen keine vier Reihen mit verschiedenen Zahlen: dort drei Reihen,
 *          der Fehler nur um 1 daneben).
 * Alle Zahlen einer Mauer sind verschieden (die Perle zeigt die Zahl des Steins, sie muss den Stein eindeutig nennen).
 * Der Löser probiert jeden Stein: lässt sich die Mauer richtig machen, indem man NUR diesen Stein ändert? Genau ein
 * solcher Stein muss es sein (docs/LOESER.md, Abschnitt 6: „все замены одного кирпича; ровно одна делает стену верной“).
 *
 * Hilfe auf dem Bild: Stufe 2 rahmt die oberste Dreiergruppe ein (oben und die zwei darunter) – „so prüfst du“;
 * Stufe 3 macht eine Dreiergruppe blass, die stimmt und den falschen Stein nicht enthält – dort ist der Fehler nicht.
 */
export interface MauerFehler {
  /** Reihen von unten nach oben, alle ausgefüllt */
  reihen: number[][];
}

const steine = (m: MauerFehler): [number, number][] => m.reihen.flatMap((r, i) => r.map((_, j) => [i, j] as [number, number]));

/** Dreiergruppen: Stein (i+1, j) = (i, j) + (i, j+1) */
function gruppen(m: MauerFehler): { oben: [number, number]; unten: [[number, number], [number, number]] }[] {
  const out: { oben: [number, number]; unten: [[number, number], [number, number]] }[] = [];
  for (let i = 0; i + 1 < m.reihen.length; i++) for (let j = 0; j < m.reihen[i + 1].length; j++) out.push({ oben: [i + 1, j], unten: [[i, j], [i, j + 1]] });
  return out;
}
const wert = (r: number[][], [i, j]: [number, number]) => r[i][j];
const stimmt = (r: number[][], g: ReturnType<typeof gruppen>[number]) => wert(r, g.oben) === wert(r, g.unten[0]) + wert(r, g.unten[1]);
const enthaelt = (g: ReturnType<typeof gruppen>[number], [i, j]: [number, number]) => [g.oben, ...g.unten].some(([a, b]) => a === i && b === j);

/** Steine, deren Änderung allein die Mauer richtig macht */
export function reparierbar(m: MauerFehler): [number, number][] {
  const gs = gruppen(m);
  return steine(m).filter((st) => {
    // alle Gruppen ohne diesen Stein stimmen schon
    if (gs.some((g) => !enthaelt(g, st) && !stimmt(m.reihen, g))) return false;
    // ein Wert, der alle Gruppen mit diesem Stein erfüllt
    const kandidaten = gs.filter((g) => enthaelt(g, st)).map((g) => {
      const [i, j] = st;
      if (g.oben[0] === i && g.oben[1] === j) return wert(m.reihen, g.unten[0]) + wert(m.reihen, g.unten[1]);
      const anderer = g.unten.find(([a, b]) => a !== i || b !== j)!;
      return wert(m.reihen, g.oben) - wert(m.reihen, anderer);
    });
    if (!kandidaten.length || kandidaten.some((v) => v !== kandidaten[0] || v < 0)) return false;
    return kandidaten[0] !== wert(m.reihen, st);
  });
}

function loesungen(m: MauerFehler): Antwort[] {
  return reparierbar(m).map((st) => ({ art: 'zahl', wert: wert(m.reihen, st) }));
}

function baue(basis: number[]): number[][] {
  const r = [basis];
  while (r[r.length - 1].length > 1) {
    const u = r[r.length - 1];
    r.push(u.slice(1).map((v, k) => u[k] + v));
  }
  return r;
}

function erzeuge(z: Zufall, stufe: number, e: Einstellung): MauerFehler {
  const grenze = stufe === 1 ? kleinerRaum(e.zahlenraum) : e.zahlenraum;
  // bis 10 passen keine vier Reihen mit lauter verschiedenen Zahlen: dort bleibt Stufe 3 bei drei Reihen, der Fehler ist nur ±1
  const breite = stufe === 3 && grenze > 10 ? 4 : 3;
  const nurEins = stufe === 3 && breite === 3;
  for (;;) {
    // Basis so, dass der oberste Stein höchstens die Grenze ist (Gewichte 1, 2, 1 bzw. 1, 3, 3, 1)
    const basis = Array.from({ length: breite }, () => z.ganz(0, Math.floor(grenze / (breite === 3 ? 2 : 4))));
    const reihen = baue(basis);
    if (reihen[reihen.length - 1][0] > grenze || reihen[reihen.length - 1][0] < grenze * 0.4) continue;
    const st = z.eins(steine({ reihen }));
    const d = nurEins ? z.eins([-1, 1]) : z.eins([-3, -2, -1, 1, 2, 3]);
    const falsch = reihen[st[0]][st[1]] + d;
    if (falsch < 0 || falsch > grenze) continue;
    reihen[st[0]] = [...reihen[st[0]]];
    reihen[st[0]][st[1]] = falsch;
    const alle = reihen.flat();
    if (new Set(alle).size !== alle.length) continue;
    return { reihen };
  }
}

/** Gruppe, die Stufe 3 blass macht: die erste, die stimmt und den falschen Stein nicht enthält */
export function blasseGruppe(m: MauerFehler): ReturnType<typeof gruppen>[number] | null {
  const f = reparierbar(m)[0];
  if (!f) return null;
  return gruppen(m).find((g) => stimmt(m.reihen, g) && !enthaelt(g, f)) ?? null;
}
const schrittVerraet = (m: MauerFehler) => blasseGruppe(m) === null;
/** wie viele Dreiergruppen nicht stimmen */
export const falscheGruppen = (m: MauerFehler) => gruppen(m).filter((g) => !stimmt(m.reihen, g)).length;

/* ---------- Bild ---------- */

const SW = 72;
const SH = 50;

function zeichne(m: MauerFehler, o: ZeichenOptionen): string {
  const breite = m.reihen[0].length;
  const W = breite * SW + 24;
  const H = m.reihen.length * SH + 24;
  const lage = ([i, j]: [number, number]): [number, number] => [12 + j * SW + (i * SW) / 2, H - 12 - (i + 1) * SH];
  const liste = steine(m);
  const gew = o.vorrechnen ? loesungen(m)[0] : o.gewaehlt;
  let s = '';
  // Hilfe 2: oberste Dreiergruppe warm eingerahmt
  const oberste = gruppen(m)[gruppen(m).length - 1];
  if (o.hilfe >= 2 || o.vorrechnen) {
    const [x, y] = lage(oberste.oben);
    s += `<path data-hilfe="teil" d="M${x - 6} ${y - 6}H${x + SW + 4}V${y + SH - 2}H${x + SW / 2 + SW + 4}V${y + 2 * SH + 4}H${x - SW / 2 - 6}V${y + SH - 2}H${x - 6}Z" fill="${LATERNE}" stroke="${LATERNE_KANTE}" stroke-width="3.5" stroke-linejoin="round"/>`;
  }
  const blass = o.hilfe >= 3 && !o.vorrechnen ? (o.aehnlich || !schrittVerraet(m) ? blasseGruppe(m) : null) : null;
  liste.forEach((st, k) => {
    const [x, y] = lage(st);
    const v = wert(m.reihen, st);
    const istBlass = !!blass && enthaelt(blass, st);
    const gewaehlt = gew?.art === 'zahl' && gew.wert === v;
    s += `<g class="wahl-ziel" data-wahl="${k}" role="button" tabindex="0" aria-label="Stein ${v}" opacity="${istBlass ? 0.25 : 1}"${istBlass ? ' data-hilfe="schritt"' : ''}>`;
    s += `<rect x="${x + 2}" y="${y + 3.5}" width="${SW - 4}" height="${SH - 4}" rx="8" fill="${STEIN_KANTE}"/>`;
    s += `<rect x="${x + 2}" y="${y}" width="${SW - 4}" height="${SH - 4}" rx="8" fill="${STEIN}"/>`;
    s += `<rect x="${x + 8}" y="${y + 3}" width="${SW - 16}" height="3" rx="1.5" fill="${WEISS}" opacity="0.45"/>`;
    s += `<text x="${x + SW / 2}" y="${y + SH / 2 + 8}" text-anchor="middle" font-size="24" font-weight="800" fill="${TINTE}">${v}</text>`;
    if (gewaehlt) s += `<rect${o.vorrechnen ? '' : ' data-inhalt=""'} x="${x - 2}" y="${y - 4}" width="${SW + 4}" height="${SH + 4}" rx="11" fill="none" stroke="${FOKUS}" stroke-width="5"/>`;
    s += '</g>';
  });
  return `<svg class="aufgabe-svg" viewBox="0 0 ${W} ${H}" role="group" aria-label="Fehler in der Mauer">${s}</svg>`;
}

export const MAUER_FEHLER: Format<MauerFehler> = {
  id: 'mauer-fehler',
  nr: 95,
  version: 1,
  bereich: 'zahlen',
  faehigkeit: 'Z3',
  motor: 'auswahl',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'welcherSteinFalsch',
  stufen: 3,
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'bild' }),
  wahl: (m) => steine(m).map((st) => ({ art: 'zahl', wert: wert(m.reihen, st) }) as Antwort),
  zeichne,
  schrittVerraet,
  /**
   * Lernbeispiel: (1) der oberste Stein ist falsch (10 statt 9) – nur eine Dreiergruppe stimmt nicht; (2) gewöhnliche
   * Aufgabe der Stufe 1 aus dem Generator, bei der zwei Dreiergruppen nicht stimmen.
   */
  beispiele: () => {
    let zweite: MauerFehler | null = null;
    for (let s = 0; !zweite; s++) {
      const m = aufgabeAus(MAUER_FEHLER, s * 2654435761, 1).bedingung;
      if (falscheGruppen(m) >= 2) zweite = m;
    }
    return [{ reihen: [[1, 3, 2], [4, 5], [10]] }, zweite];
  },
};
