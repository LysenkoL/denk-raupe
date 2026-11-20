import type { Antwort } from '../perlen/antwort';
import type { Zufall } from '../core/zufall';
import { aufgabeAus, type Format, type ZeichenOptionen } from './format';
import { FIGUR_TOKEN, FOKUS, LATERNE_KANTE, PAPIER, TINTE } from '../design/farbe';
import { raupenKopf } from './oben-unten';

/**
 * Labyrinth (Nr. 40, Engine Weg, Antwort Tippen auf einen Ausgang): senkrechte Wege führen von oben nach unten; waagerechte
 * Brücken verbinden zwei Nachbarwege. Die Raupe geht von oben los; kommt sie an eine Brücke, muss sie hinüber und geht auf
 * dem anderen Weg weiter nach unten. An welchem Ausgang kommt sie an?
 * Stufe 1: drei Wege, zwei Brücken. Stufe 2: vier Wege, vier Brücken. Stufe 3: fünf Wege, sieben Brücken.
 * Der Löser geht den Weg ab. Zwei Brücken auf derselben Höhe an einem Weg wären mehrdeutig (welche zuerst?) – dann gibt es
 * keine Lösung. Die Raupe muss mindestens einmal hinüber.
 *
 * Hilfe auf dem Bild: Stufe 2 hebt den Weg der Raupe bis zur ersten Brücke hervor; Stufe 3 dazu die erste Brücke und das
 * Stück bis zur zweiten (bei einer einzigen Brücke an der ähnlichen Aufgabe).
 */
export interface Bruecke {
  /** linker Weg (0 …), Höhe 1 … 9 */
  links: number;
  hoehe: number;
}
export interface Labyrinth {
  wege: number;
  bruecken: Bruecke[];
  start: number;
}

/** Weg der Raupe: Stücke [Weg, von Höhe, bis Höhe] und benutzte Brücken; Ausgang oder null */
export function folgen(l: Labyrinth): { stuecke: [number, number, number][]; bruecken: number[]; ausgang: number | null } {
  const stuecke: [number, number, number][] = [];
  const benutzt: number[] = [];
  let [w, h] = [l.start, 0];
  for (;;) {
    const hier = l.bruecken.map((b, i) => ({ b, i })).filter(({ b }) => (b.links === w || b.links + 1 === w) && b.hoehe > h).sort((a, b) => a.b.hoehe - b.b.hoehe);
    if (hier.length > 1 && hier[0].b.hoehe === hier[1].b.hoehe) return { stuecke, bruecken: benutzt, ausgang: null };
    if (!hier.length) {
      stuecke.push([w, h, 10]);
      return { stuecke, bruecken: benutzt, ausgang: w };
    }
    const { b, i } = hier[0];
    stuecke.push([w, h, b.hoehe]);
    benutzt.push(i);
    w = b.links === w ? w + 1 : w - 1;
    h = b.hoehe;
  }
}

function loesungen(l: Labyrinth): Antwort[] {
  const f = folgen(l);
  // jede Brücke auf einer Höhe, die an einem Weg schon eine andere hat, ist mehrdeutig
  const doppelt = l.bruecken.some((a, i) => l.bruecken.some((b, j) => i < j && a.hoehe === b.hoehe && Math.abs(a.links - b.links) <= 1));
  return f.ausgang === null || doppelt ? [] : [{ art: 'zahl', wert: f.ausgang + 1 }];
}

function erzeuge(z: Zufall, stufe: number): Labyrinth {
  const wege = stufe + 2;
  const zahl = stufe === 1 ? 2 : stufe === 2 ? 4 : 7;
  for (;;) {
    const hoehen = z.mischen([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, zahl);
    const bruecken = hoehen.map((hoehe) => ({ links: z.ganz(0, wege - 2), hoehe }));
    const start = z.ganz(0, wege - 1);
    const l = { wege, bruecken, start };
    const f = folgen(l);
    if (loesungen(l).length !== 1 || f.bruecken.length < (stufe === 3 ? 3 : 1)) continue;
    // der Ausgang ist nicht direkt unter dem Start (sonst rät man ihn ohne Weg)
    if (f.ausgang === start && stufe > 1) continue;
    return l;
  }
}

const schrittVerraet = (l: Labyrinth) => folgen(l).bruecken.length < 2;

/* ---------- Bild ---------- */

const AB = 62;
const OBEN = 64;
const HS = 26;

function zeichne(l: Labyrinth, o: ZeichenOptionen): string {
  const W = l.wege * AB + 24;
  const x = (w: number) => 12 + w * AB + AB / 2;
  const y = (h: number) => OBEN + h * HS;
  const H = y(10) + 60;
  let s = '';
  const f = folgen(l);
  const spur = (stuecke: [number, number, number][], art: string, br: number[]) => {
    let t = stuecke.map(([w, a, b]) => `<path d="M${x(w)} ${y(a)}V${y(b)}" />`).join('');
    t += br.map((i) => `<path d="M${x(l.bruecken[i].links)} ${y(l.bruecken[i].hoehe)}H${x(l.bruecken[i].links + 1)}" />`).join('');
    return `<g data-hilfe="${art}" fill="none" stroke="${LATERNE_KANTE}" stroke-width="13" stroke-linecap="round" opacity="0.75">${t}</g>`;
  };
  if (o.vorrechnen) s += spur(f.stuecke, 'teil', f.bruecken);
  else {
    if (o.hilfe >= 2) s += spur(f.stuecke.slice(0, 1), 'teil', []);
    if (o.hilfe >= 3 && (o.aehnlich || !schrittVerraet(l))) s += spur(f.stuecke.slice(1, 2), 'schritt', f.bruecken.slice(0, 1));
  }
  for (let w = 0; w < l.wege; w++) s += `<path d="M${x(w)} ${y(0)}V${y(10)}" stroke="${FIGUR_TOKEN['ast-kante']}" stroke-width="6" stroke-linecap="round"/>`;
  for (const b of l.bruecken) s += `<path d="M${x(b.links)} ${y(b.hoehe)}H${x(b.links + 1)}" stroke="${FIGUR_TOKEN.ast}" stroke-width="7" stroke-linecap="round"/>`;
  s += raupenKopf(x(l.start), OBEN - 30, 22);
  const gew = o.vorrechnen ? f.ausgang : o.gewaehlt?.art === 'zahl' ? o.gewaehlt.wert - 1 : null;
  for (let w = 0; w < l.wege; w++) {
    const cx = x(w);
    const cy = y(10) + 30;
    s += `<g class="wahl-ziel" data-wahl="${w}" role="button" tabindex="0" aria-label="Ausgang ${w + 1}" opacity="1">`;
    s += `<circle cx="${cx}" cy="${cy}" r="26" fill="${PAPIER}" opacity="0.01"/>`;
    s += `<rect x="${cx - 21}" y="${cy - 21}" width="42" height="42" rx="11" fill="${FIGUR_TOKEN.blatt}" stroke="${FIGUR_TOKEN['blatt-kante']}" stroke-width="3"/>`;
    s += `<text x="${cx}" y="${cy + 8}" text-anchor="middle" font-size="22" font-weight="800" fill="${TINTE}">${w + 1}</text>`;
    if (gew === w) s += `<rect${o.vorrechnen ? '' : ' data-inhalt=""'} x="${cx - 27}" y="${cy - 27}" width="54" height="54" rx="15" fill="none" stroke="${FOKUS}" stroke-width="5"/>`;
    s += '</g>';
  }
  return `<svg class="aufgabe-svg" viewBox="0 0 ${W} ${H}" role="group" aria-label="Labyrinth">${s}</svg>`;
}

export const LABYRINTH: Format<Labyrinth> = {
  id: 'labyrinth',
  nr: 40,
  version: 1,
  bereich: 'raum',
  faehigkeit: 'R4',
  motor: 'weg',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'woKommtSieAn',
  stufen: 3,
  /** hängt nicht vom Zahlenraum ab: liest die Einstellung nicht */
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'bild' }),
  wahl: (l) => Array.from({ length: l.wege }, (_, i) => ({ art: 'zahl', wert: i + 1 }) as Antwort),
  zeichne,
  schrittVerraet,
  /** Lernbeispiel: (1) zwei Wege, eine Brücke; (2) gewöhnliche Aufgabe der Stufe 1 aus dem Generator. */
  beispiele: () => [{ wege: 2, bruecken: [{ links: 0, hoehe: 5 }], start: 0 }, aufgabeAus(LABYRINTH, 0, 1).bedingung],
};
