import { LATERNE_KANTE, PAPIER, STEIN, mix } from '../design/farbe';
import type { Antwort } from '../perlen/antwort';
import type { Einstellung, Format, ZeichenOptionen } from './format';
import type { Zufall } from '../core/zufall';
import { antwortNest, gruppe, kachel, laterneRahmen, pfeilSpitze, svgRahmen, tablett, zahl } from './bildteile';

/**
 * Hunderterfeld (Nr. 74, Bild, 2. Klasse): Zahlen stehen zeilenweise, zehn in jeder Zeile, links oben die 1.
 * Einige Felder zeigen ihre Zahl; welche Zahl gehört in das Feld mit dem Fragezeichen?
 * Die Größe des Feldes kommt aus dem Zahlenraum: bis 10 eine Zeile, bis 20 zwei Zeilen, bis 100 zehn Zeilen.
 * Stufe 1: eine Zahl steht in derselben Zeile, ein bis drei Felder daneben – weiterzählen.
 * Stufe 2: schwerer wird der Weg – die Zahl steht in derselben Spalte (Zehnersprung) oder vier bis sechs
 *          Felder weit in derselben Zeile; dazu eine zweite Zahl irgendwo im Feld.
 * Stufe 3: schwerer wird die Richtung – keine Zahl in derselben Zeile oder Spalte: erst Zehner, dann Einer
 *          (in einer Zeile: fünf bis neun Felder weit).
 *
 * Löser (unabhängig vom Generator): probiert jede Zahl für das erste Feld, so dass alle Felder zwischen 0 und
 * 100 liegen und jede gezeigte Zahl an ihrem Platz stimmt (so bleiben ein Feld ab 0 und eines ab 1 möglich),
 * und sammelt, was dann im Fragefeld steht.
 *
 * Hilfe auf dem Bild: Stufe 2 rahmt die Zahl ein, von der aus man geht, die übrigen Zahlen gehen in den
 * Halbschatten; Stufe 3 zeichnet den ersten Weg als Pfad – senkrecht bis in die Zeile des Fragefelds,
 * liegt sie schon dort, waagerecht bis zum Fragefeld. Keine Zahl dazu.
 */
export interface Hunderterfeld {
  /** Zahl der Zeilen zu je zehn Feldern */
  zeilen: number;
  /** Felder mit Zahl (Platz ab 0, zeilenweise); die erste ist die, von der die Hilfe ausgeht */
  marken: { feld: number; wert: number }[];
  /** Platz des Fragefelds */
  frage: number;
}

export const SPALTEN = 10;

const zeileVon = (f: number) => Math.floor(f / SPALTEN);
const spalteVon = (f: number) => f % SPALTEN;

function erzeuge(z: Zufall, stufe: number, e: Einstellung): Hunderterfeld {
  const zeilen = e.zahlenraum / SPALTEN;
  const n = zeilen * SPALTEN;
  for (;;) {
    const frage = z.ganz(0, n - 1);
    const zf = zeileVon(frage);
    const sf = spalteVon(frage);
    const felder = Array.from({ length: n }, (_, i) => i).filter((i) => i !== frage);
    const abstand = (i: number) => ({ dz: Math.abs(zeileVon(i) - zf), ds: Math.abs(spalteVon(i) - sf) });
    let haupt: number[];
    if (stufe === 1) haupt = felder.filter((i) => abstand(i).dz === 0 && abstand(i).ds <= 3);
    else if (stufe === 2)
      haupt = felder.filter((i) => {
        const a = abstand(i);
        return (a.ds === 0 && a.dz <= 3) || (a.dz === 0 && a.ds >= 4 && a.ds <= 6);
      });
    else
      haupt = felder.filter((i) => {
        const a = abstand(i);
        return zeilen === 1 ? a.ds >= 5 : a.dz >= 1 && a.ds >= 1 && a.dz <= 4 && a.ds <= 4;
      });
    if (haupt.length === 0) continue;
    const h = z.eins(haupt);
    const marken = [{ feld: h, wert: h + 1 }];
    if (stufe >= 2 && zeilen > 1) {
      // zweite Zahl: nicht in Zeile oder Spalte des Fragefelds und nicht direkt daneben
      const weitere = felder.filter((i) => i !== h && abstand(i).dz !== 0 && abstand(i).ds !== 0 && abstand(i).dz + abstand(i).ds > 2);
      const w = z.eins(weitere);
      marken.push({ feld: w, wert: w + 1 });
    }
    return { zeilen, marken, frage };
  }
}

/** Löser: jede Zahl für das erste Feld, die zu allen gezeigten Zahlen passt; was steht dann im Fragefeld? */
function loesungen(h: Hunderterfeld): Antwort[] {
  const n = h.zeilen * SPALTEN;
  const out = new Set<number>();
  for (let start = 0; start + n - 1 <= 100; start++) if (h.marken.every((m) => m.wert === start + m.feld)) out.add(start + h.frage);
  return [...out].map((wert) => ({ art: 'zahl', wert }));
}

const ZELLE = 38;
const SPALT = 3;
const FUENF = 7;
const RAND = 14;

const lage = (f: number) => {
  const s = spalteVon(f);
  const z = zeileVon(f);
  return { x: RAND + s * (ZELLE + SPALT) + (s >= 5 ? FUENF : 0), y: RAND + z * (ZELLE + SPALT) + (z >= 5 ? FUENF : 0) };
};
const mitte = (f: number) => {
  const p = lage(f);
  return { x: p.x + ZELLE / 2, y: p.y + ZELLE / 2 };
};

/** Weg der Hilfe Stufe 3: von der ersten Zahl senkrecht bis in die Zeile des Fragefelds, sonst waagerecht hin */
export function hilfeWeg(h: Hunderterfeld): number[] {
  const von = h.marken[0].feld;
  const ziel = zeileVon(von) === zeileVon(h.frage) ? h.frage : zeileVon(h.frage) * SPALTEN + spalteVon(von);
  const weg = [von];
  let f = von;
  while (f !== ziel) {
    if (zeileVon(f) !== zeileVon(ziel)) f += zeileVon(ziel) > zeileVon(f) ? SPALTEN : -SPALTEN;
    else f += spalteVon(ziel) > spalteVon(f) ? 1 : -1;
    weg.push(f);
  }
  return weg;
}

function zeichne(h: Hunderterfeld, o: ZeichenOptionen): string {
  const n = h.zeilen * SPALTEN;
  const ende = lage(n - 1);
  const W = ende.x + ZELLE + RAND;
  const H = ende.y + ZELLE + RAND;
  const hervor = o.hilfe >= 2 || !!o.vorrechnen;
  const leer = mix(PAPIER, STEIN, 0.6);
  let s = tablett(0, 0, W, H, 16);
  for (let f = 0; f < n; f++) {
    if (f === h.frage || h.marken.some((m) => m.feld === f)) continue;
    const p = lage(f);
    s += `<rect x="${p.x}" y="${p.y}" width="${ZELLE}" height="${ZELLE}" rx="7" fill="${leer}"/>`;
  }
  h.marken.forEach((m, k) => {
    const p = lage(m.feld);
    let t = '';
    if (hervor && k === 0) t += laterneRahmen(p.x - 4, p.y - 4, ZELLE + 8, ZELLE + 11, 10);
    t += kachel(p.x, p.y, ZELLE, ZELLE - 3.5, 7) + zahl(p.x + ZELLE / 2, p.y + ZELLE / 2 - 1.5, m.wert, m.wert >= 100 ? 16 : 19);
    s += gruppe(!hervor ? null : k === 0 ? 'teil' : 'schatten', t);
  });
  if (o.hilfe >= 3 || o.vorrechnen) {
    const weg = hilfeWeg(h).map(mitte);
    let t = `<polyline points="${weg.map((p) => `${p.x},${p.y}`).join(' ')}" fill="none" stroke="${LATERNE_KANTE}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>`;
    weg.slice(1, -1).forEach((p) => (t += `<circle cx="${p.x}" cy="${p.y}" r="5" fill="${LATERNE_KANTE}"/>`));
    const a = weg[weg.length - 2];
    const b = weg[weg.length - 1];
    const winkel = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    t += pfeilSpitze(b.x, b.y, winkel, LATERNE_KANTE, 13);
    s += `<g data-hilfe="schritt">${t}</g>`;
  }
  const q = lage(h.frage);
  const nestHtml = antwortNest(q.x - 3, q.y - 3, ZELLE + 6, ZELLE + 2.5, o, h.frage + 1, 19);
  // das Fragefeld liegt über dem Pfad (Ende des Pfads am Rand des Nests)
  s += `<g data-frage="">${nestHtml}</g>`;
  return svgRahmen(W, H + 6, s, 'Hunderterfeld');
}

export const HUNDERTERFELD: Format<Hunderterfeld> = {
  id: 'hunderterfeld',
  nr: 74,
  version: 1,
  bereich: 'zahlen',
  faehigkeit: 'Z5',
  motor: 'bild',
  klasse: 2,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'welcheZahlImFeld',
  stufen: 3,
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'zahl' }),
  zeichne,
  /**
   * Lernbeispiel im Zwanzigerfeld: (1) die 1 steht links oben, das Fragefeld gleich daneben;
   * (2) die 5 steht da, das Fragefeld gleich daneben; (3) gewöhnliche Aufgabe der Stufe 1 – zwei Felder weiter.
   */
  beispiele: () => [
    { zeilen: 2, marken: [{ feld: 0, wert: 1 }], frage: 1 },
    { zeilen: 2, marken: [{ feld: 4, wert: 5 }], frage: 5 },
    { zeilen: 2, marken: [{ feld: 5, wert: 6 }], frage: 7 },
  ],
};
