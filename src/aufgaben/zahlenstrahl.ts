import { FIGUR_TOKEN, HOLZ, HOLZ_KANTE, LATERNE_KANTE, TINTE_LEISE, WEISS } from '../design/farbe';
import type { Antwort } from '../perlen/antwort';
import type { Einstellung, Format, ZeichenOptionen } from './format';
import type { Zufall } from '../core/zufall';
import { antwortNest, gruppe, laterneRahmen, pfeilSpitze, stufeGrenze, svgRahmen, zahl } from './bildteile';

/**
 * Zahlenstrahl (Nr. 75, Bild): Striche in gleichem Abstand, einige mit Zahl. Welche Zahl zeigt der Pfeil?
 * Lange Striche bei Zehnern, mittlere bei Fünfern, kurze dazwischen (wie auf dem Lineal).
 * Stufe 1: von 0 an, jeder Strich eins weiter, beschriftet sind die Fünfer; Zahlen eine Stufe unter dem
 *          Zahlenraum (bis 20 → bis 10, bis 100 → bis 20).
 * Stufe 2: schwerer wird das Ablesen – nur die Zehner sind beschriftet (bis 10: nur 0 und 10); bis 100 ein
 *          Ausschnitt von zwanzig, der nicht bei 0 beginnt (z. B. 40 bis 60).
 * Stufe 3: schwerer wird der Abstand – ein Strich ist mehr als eins (2, 5 oder 10), beschriftet sind nur die
 *          beiden Enden; das Kind findet erst heraus, wie weit ein Strich ist.
 *
 * Die Frage „к какому десятку ближе“ (TZ, Nr. 75, ältere Stufen) braucht einen anderen festen Satz als „Welche
 * Zahl zeigt der Pfeil?“; ein Format hat genau einen Satz (docs/FORMATE.md, Abschnitt 3). Sie ist deshalb hier
 * nicht drin – offene Frage an die Autorin.
 *
 * Löser (unabhängig vom Generator): probiert jede Schrittweite und jeden Anfang, bei denen alle Striche
 * zwischen 0 und 100 liegen und jede gezeigte Zahl an ihrem Strich stimmt; sammelt die Zahl am Pfeil. Er
 * liest nur die beschrifteten Striche, nicht ihre Länge.
 *
 * Hilfe auf dem Bild: Stufe 2 rahmt die beiden Zahlen ein, zwischen denen (oder neben denen) der Pfeil steht,
 * die übrigen gehen in den Halbschatten; Stufe 3 zeigt die Hüpfer von der nächsten Zahl bis zum Pfeil, einen
 * je Strich. Keine Zahl dazu.
 */
export type Strich = 'lang' | 'mittel' | 'kurz';
export interface Zahlenstrahl {
  striche: Strich[];
  /** beschriftete Striche */
  marken: { strich: number; wert: number }[];
  /** Strich, auf den der Pfeil zeigt */
  pfeil: number;
}

const strichArt = (v: number): Strich => (v % 10 === 0 ? 'lang' : v % 5 === 0 ? 'mittel' : 'kurz');

function baue(von: number, schritt: number, anzahl: number, beschriftet: (v: number, i: number) => boolean, pfeil: number): Zahlenstrahl {
  const werte = Array.from({ length: anzahl }, (_, i) => von + i * schritt);
  return {
    striche: werte.map(strichArt),
    marken: werte.flatMap((wert, strich) => (beschriftet(wert, strich) ? [{ strich, wert }] : [])),
    pfeil,
  };
}

function erzeuge(z: Zufall, stufe: number, e: Einstellung): Zahlenstrahl {
  const zr = e.zahlenraum;
  if (stufe === 1) {
    const g = stufeGrenze(1, zr);
    const frei = Array.from({ length: g + 1 }, (_, i) => i).filter((v) => v % 5 !== 0);
    return baue(0, 1, g + 1, (v) => v % 5 === 0, z.eins(frei));
  }
  if (stufe === 2) {
    if (zr === 10) return baue(0, 1, 11, (v) => v % 10 === 0, z.ganz(1, 9));
    const von = zr === 20 ? 0 : 10 * z.ganz(0, 8);
    const frei = Array.from({ length: 21 }, (_, i) => i).filter((i) => (von + i) % 10 !== 0);
    return baue(von, 1, 21, (v) => v % 10 === 0, z.eins(frei));
  }
  // Stufe 3: Schritt größer als eins, nur die Enden beschriftet
  const art = zr === 10 ? { von: 0, schritt: 2, anzahl: 6 } : zr === 20 ? { von: 0, schritt: 2, anzahl: 11 } : z.eins([
    { von: 0, schritt: 10, anzahl: 11 },
    { von: 0, schritt: 5, anzahl: 11 },
    { von: 50, schritt: 5, anzahl: 11 },
    { von: 10 * z.ganz(0, 8), schritt: 2, anzahl: 11 },
  ]);
  return baue(art.von, art.schritt, art.anzahl, (_, i) => i === 0 || i === art.anzahl - 1, z.ganz(1, art.anzahl - 2));
}

/** Löser: jede Schrittweite (auch rückwärts) und jeder Anfang, die zu allen Zahlen passen */
function loesungen(s: Zahlenstrahl): Antwort[] {
  const out = new Set<number>();
  const n = s.striche.length;
  if (s.marken.length === 0) {
    for (let d = -100; d <= 100; d++) for (let a = 0; a <= 100; a++) if (d !== 0 && a + (n - 1) * d >= 0 && a + (n - 1) * d <= 100) out.add(a + s.pfeil * d);
  } else {
    const m0 = s.marken[0];
    for (let d = -100; d <= 100; d++) {
      if (d === 0) continue;
      const a = m0.wert - m0.strich * d;
      const b = a + (n - 1) * d;
      if (Math.min(a, b) < 0 || Math.max(a, b) > 100) continue;
      if (s.marken.every((m) => m.wert === a + m.strich * d)) out.add(a + s.pfeil * d);
    }
  }
  return [...out].map((wert) => ({ art: 'zahl', wert }));
}

/** die zwei beschrifteten Striche, an denen man abliest: links und rechts vom Pfeil, sonst die zwei nächsten */
export function nachbarMarken(s: Zahlenstrahl): number[] {
  const links = s.marken.filter((m) => m.strich < s.pfeil).at(-1);
  const rechts = s.marken.find((m) => m.strich > s.pfeil);
  if (links && rechts) return [links.strich, rechts.strich];
  const nah = [...s.marken].sort((a, b) => Math.abs(a.strich - s.pfeil) - Math.abs(b.strich - s.pfeil));
  return nah.slice(0, 2).map((m) => m.strich).sort((a, b) => a - b);
}

/** Strich, von dem die Hüpfer der Hilfe Stufe 3 ausgehen: die nächste Zahl (bei Gleichstand die linke) */
export function hilfeStart(s: Zahlenstrahl): number {
  return [...s.marken].sort((a, b) => Math.abs(a.strich - s.pfeil) - Math.abs(b.strich - s.pfeil) || a.strich - b.strich)[0].strich;
}

const W = 440;
const RAND = 34;
const LINIE_Y = 128;
const HOEHE: Record<Strich, number> = { lang: 40, mittel: 28, kurz: 17 };

function zeichne(s: Zahlenstrahl, o: ZeichenOptionen): string {
  const n = s.striche.length;
  const dx = (W - 2 * RAND) / (n - 1);
  const x = (i: number) => RAND + i * dx;
  const hervor = o.hilfe >= 2 || !!o.vorrechnen;
  const nachbarn = nachbarMarken(s);
  // Pfeil mit Nest oben, Strahl als Holzleiste, Zahlen darunter
  let t = '';
  t += `<rect x="${RAND - 22}" y="${LINIE_Y - 6 + 4}" width="${W - 2 * RAND + 44}" height="12" rx="6" fill="${HOLZ_KANTE}"/>`;
  t += `<rect x="${RAND - 22}" y="${LINIE_Y - 6}" width="${W - 2 * RAND + 44}" height="12" rx="6" fill="${HOLZ}"/>`;
  // Spitze rechts: der Strahl geht weiter
  t += `<path d="M${W - RAND + 22} ${LINIE_Y - 11} L${W - RAND + 36} ${LINIE_Y + 2} L${W - RAND + 22} ${LINIE_Y + 15} Z" fill="${HOLZ_KANTE}"/>`;
  s.striche.forEach((art, i) => {
    const h = HOEHE[art];
    t += `<rect data-strich="${art}" x="${x(i) - 1.75}" y="${LINIE_Y - h / 2}" width="3.5" height="${h}" rx="1.75" fill="${TINTE_LEISE}"/>`;
  });
  for (const m of s.marken) {
    const teil = hervor && nachbarn.includes(m.strich);
    const breite = m.wert >= 100 ? 50 : m.wert >= 10 ? 40 : 30;
    let g = '';
    if (teil) g += laterneRahmen(x(m.strich) - breite / 2 - 2, LINIE_Y + 24, breite + 4, 38, 10);
    g += zahl(x(m.strich), LINIE_Y + 43, m.wert, 22);
    t += gruppe(!hervor ? null : teil ? 'teil' : 'schatten', g);
  }
  if (o.hilfe >= 3 || o.vorrechnen) {
    const von = hilfeStart(s);
    const richtung = s.pfeil > von ? 1 : -1;
    let h = '';
    for (let i = von; i !== s.pfeil; i += richtung) {
      const a = x(i);
      const b = x(i + richtung);
      const hoch = Math.min(22, Math.abs(b - a) * 0.75);
      h += `<path d="M${a} ${LINIE_Y - 10} Q${(a + b) / 2} ${LINIE_Y - 10 - hoch * 2} ${b} ${LINIE_Y - 10}" fill="none" stroke="${LATERNE_KANTE}" stroke-width="4" stroke-linecap="round"/>`;
    }
    t += `<g data-hilfe="schritt">${h}</g>`;
  }
  // Pfeil von oben auf den Strich, an seinem Ende das Nest
  const px = x(s.pfeil);
  const nestB = 64;
  const nx = Math.min(Math.max(px - nestB / 2, 4), W - nestB - 4);
  t += `<rect x="${px - 3.5}" y="${62}" width="7" height="${LINIE_Y - 26 - 62}" rx="3.5" fill="${FIGUR_TOKEN['halstuch-kante']}"/>`;
  t += pfeilSpitze(px, LINIE_Y - 14, 90, FIGUR_TOKEN['halstuch-kante'], 15);
  t += `<rect x="${px - 3.5}" y="${60}" width="7" height="${LINIE_Y - 28 - 60}" rx="3.5" fill="${FIGUR_TOKEN.halstuch}"/>`;
  t += `<circle cx="${px - 1}" cy="${70}" r="1.6" fill="${WEISS}" opacity="0.5"/>`;
  const werte = loesungen(s);
  t += antwortNest(nx, 8, nestB, 48, o, werte.length === 1 && werte[0].art === 'zahl' ? werte[0].wert : 0, 26);
  return svgRahmen(W, LINIE_Y + 72, t, 'Zahlenstrahl');
}

export const ZAHLENSTRAHL: Format<Zahlenstrahl> = {
  id: 'zahlenstrahl',
  nr: 75,
  version: 1,
  bereich: 'zahlen',
  faehigkeit: 'Z5',
  motor: 'bild',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'welcheZahlZeigtDerPfeil',
  stufen: 3,
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'zahl' }),
  zeichne,
  /**
   * Lernbeispiel bis 10: (1) alle Zahlen stehen da, nur eine fehlt – die zwischen 2 und 4;
   * (2) nur 0, 5 und 10 stehen da, der Pfeil gleich vor der 5; (3) gewöhnliche Aufgabe der Stufe 1 – zwei nach der 5.
   */
  beispiele: () => [
    baue(0, 1, 11, (v) => v !== 3, 3),
    baue(0, 1, 11, (v) => v % 5 === 0, 4),
    baue(0, 1, 11, (v) => v % 5 === 0, 7),
  ],
};
