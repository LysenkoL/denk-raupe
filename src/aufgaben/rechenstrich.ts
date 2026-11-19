import { FIGUR_TOKEN, HOLZ, HOLZ_KANTE, LATERNE, LATERNE_KANTE, TINTE, TINTE_LEISE } from '../design/farbe';
import type { Antwort } from '../perlen/antwort';
import type { Einstellung, Format, ZeichenOptionen } from './format';
import type { Zufall } from '../core/zufall';
import { antwortNest, gruppe, kachel, mengenBild, pfeilSpitze, stufeGrenze, svgRahmen, zahl } from './bildteile';

/**
 * Rechenstrich (Nr. 98, Bild): ein leerer Zahlenstrich ohne Striche, eine Startzahl und zwei Sprünge.
 * Wo kommt die Raupe an? Ältere Stufe: wie weit war ein Sprung?
 * Stufe 1: zwei Sprünge vorwärts, keiner über einen Zehner hinweg; Zahlen eine Stufe unter dem Zahlenraum
 *          (bis 20 → bis 10, bis 100 → bis 20).
 * Stufe 2: schwerer wird der Zehnerübergang – vorwärts oder rückwärts, der erste Sprung geht genau bis zum
 *          Zehner, der zweite darüber hinaus (38 + 2 → 40, + 15 → 55); bis 10 zwei beliebige Sprünge in eine
 *          Richtung. Ganzer Zahlenraum.
 * Stufe 3: schwerer wird die Frage – das Ziel steht da, ein Sprung fehlt (umgekehrte Aufgabe).
 * Die Bögen sind ungefähr so lang wie die Sprünge, aber nie kürzer als ein Mindestmaß: der Strich ist nicht
 * maßstabsgetreu, das Bild verrät die Zahl nicht.
 *
 * Löser (unabhängig vom Generator): setzt jede Zahl 0–100 für das Fragezeichen ein, rechnet die Sprünge nach
 * und prüft, ob jede Landestelle zwischen 0 und 100 liegt und das Ziel stimmt.
 *
 * Hilfe auf dem Bild: Stufe 2 hebt den ersten Sprung warm hervor, der zweite geht in den Halbschatten;
 * Stufe 3 zeigt unter der Landestelle des ersten Sprungs, wie viel dort ist – als Zehnerstangen und Punkte,
 * ohne Ziffer.
 */
export type Richtung = 'plus' | 'minus';
export interface Rechenstrich {
  start: number;
  /** Sprünge in Reihenfolge; `laenge` null = gefragt */
  spruenge: { zeichen: Richtung; laenge: number | null }[];
  /** Ziel; null = gefragt */
  ziel: number | null;
}

/** geht der Sprung von a nach b über einen Zehner hinweg? (genau auf dem Zehner landen zählt nicht) */
const ueberZehner = (a: number, b: number) => Math.floor(Math.min(a, b) / 10) < Math.floor((Math.max(a, b) - 1) / 10);

function erzeuge(z: Zufall, stufe: number, e: Einstellung): Rechenstrich {
  const g = stufeGrenze(stufe, e.zahlenraum);
  for (;;) {
    if (stufe === 1) {
      const start = z.ganz(1, g - 2);
      const j1 = z.ganz(1, Math.min(9, g - start - 1));
      const j2 = z.ganz(1, Math.min(9, g - start - j1));
      if (ueberZehner(start, start + j1) || ueberZehner(start + j1, start + j1 + j2)) continue;
      return { start, spruenge: [{ zeichen: 'plus', laenge: j1 }, { zeichen: 'plus', laenge: j2 }], ziel: null };
    }
    const vor = z.zahl() < 0.5;
    const zeichen: Richtung = vor ? 'plus' : 'minus';
    let start: number;
    let j1: number;
    let j2: number;
    if (g === 10) {
      start = z.ganz(1, 9);
      j1 = z.ganz(1, 5);
      j2 = z.ganz(1, 5);
    } else {
      start = z.ganz(1, g - 1);
      if (start % 10 === 0) continue;
      j1 = vor ? 10 - (start % 10) : start % 10;
      j2 = z.ganz(2, Math.min(g === 20 ? 9 : 39, g));
    }
    const mitte = vor ? start + j1 : start - j1;
    const ende = vor ? mitte + j2 : mitte - j2;
    if (ende < 0 || ende > g || mitte < 0 || mitte > g) continue;
    // Stufe 2 bis 20 und mehr: der zweite Sprung geht über den nächsten Zehner hinaus
    if (g > 10 && (j2 < 2 || ende % 10 === 0)) continue;
    if (stufe === 2) return { start, spruenge: [{ zeichen, laenge: j1 }, { zeichen, laenge: j2 }], ziel: null };
    const fehlt = z.ganz(0, 1);
    return {
      start,
      spruenge: [
        { zeichen, laenge: fehlt === 0 ? null : j1 },
        { zeichen, laenge: fehlt === 1 ? null : j2 },
      ],
      ziel: ende,
    };
  }
}

/** Landestellen mit diesen Sprunglängen; null, wenn eine Stelle aus 0–100 fällt */
function stellen(r: Rechenstrich, laengen: number[]): number[] | null {
  const out = [r.start];
  let x = r.start;
  for (const [i, s] of r.spruenge.entries()) {
    x = s.zeichen === 'plus' ? x + laengen[i] : x - laengen[i];
    if (x < 0 || x > 100) return null;
    out.push(x);
  }
  return out;
}

/**
 * Löser: jede Zahl 0–100 für jedes Fragezeichen einsetzen (bei mehreren alle Kombinationen) und nachrechnen.
 * Gesammelt wird der fehlende Sprung, sonst das Ziel.
 */
function loesungen(r: Rechenstrich): Antwort[] {
  const offen = r.spruenge.flatMap((s, i) => (s.laenge === null ? [i] : []));
  if (offen.length === 0 && r.ziel !== null) return [];
  const werte = new Set<number>();
  const probiere = (belegt: number[]): void => {
    if (belegt.length === offen.length) {
      const p = stellen(r, r.spruenge.map((s, i) => s.laenge ?? belegt[offen.indexOf(i)]));
      if (!p || (r.ziel !== null && p[p.length - 1] !== r.ziel)) return;
      werte.add(offen.length ? belegt[0] : p[p.length - 1]);
      return;
    }
    for (let v = 0; v <= 100; v++) probiere([...belegt, v]);
  };
  probiere([]);
  return [...werte].map((wert) => ({ art: 'zahl', wert }));
}

/** Längen aller Sprünge, das Fragezeichen durch die Lösung ersetzt (nur fürs Bild) */
function laengenMit(r: Rechenstrich, l: number): number[] {
  return r.spruenge.map((s) => s.laenge ?? l);
}

const W = 440;
const RAND = 30;
const LINIE_Y = 150;
const MIN_BOGEN = 100;

/** x der Landestellen: Bögen ungefähr nach Länge, nie kürzer als MIN_BOGEN; vorwärts von links, rückwärts von rechts */
function lagen(r: Rechenstrich, werte: number[]): number[] {
  const laengen = werte.slice(1).map((w, i) => Math.abs(w - werte[i]));
  const summe = laengen.reduce((a, b) => a + b, 0) || 1;
  const verfuegbar = W - 2 * RAND - 40;
  let breiten = laengen.map((l) => Math.max(MIN_BOGEN, (l / summe) * verfuegbar));
  const gesamt = breiten.reduce((a, b) => a + b, 0);
  if (gesamt > verfuegbar) breiten = breiten.map((b) => MIN_BOGEN + ((b - MIN_BOGEN) * (verfuegbar - MIN_BOGEN * breiten.length)) / Math.max(1, gesamt - MIN_BOGEN * breiten.length));
  const breit = breiten.reduce((a, b) => a + b, 0);
  const vor = r.spruenge[0].zeichen === 'plus';
  let x = vor ? (W - breit) / 2 : (W + breit) / 2;
  const out = [x];
  for (const b of breiten) out.push((x += vor ? b : -b));
  return out;
}

/** Schild über einem Bogen: „+2“ auf Holz; der gefragte Sprung: Zeichen und Nest */
function schild(cx: number, y: number, s: { zeichen: Richtung; laenge: number | null }, o: ZeichenOptionen, loesung: number): string {
  const z = s.zeichen === 'plus' ? '+' : '−';
  if (s.laenge === null) {
    return zahl(cx - 34, y + 22, z, 28) + antwortNest(cx - 20, y, 58, 44, o, loesung, 24);
  }
  const text = `${z}${s.laenge}`;
  const b = 22 + text.length * 14;
  return kachel(cx - b / 2, y + 2, b, 40, 12) + zahl(cx, y + 22, text, 24);
}

function zeichne(r: Rechenstrich, o: ZeichenOptionen): string {
  const loes = loesungen(r);
  const l = loes.length === 1 && loes[0].art === 'zahl' ? loes[0].wert : 0;
  const werte = stellen(r, laengenMit(r, l)) ?? r.spruenge.map(() => r.start).concat(r.start);
  const xs = lagen(r, werte);
  const hervor = o.hilfe >= 2 || !!o.vorrechnen;
  let t = '';
  // leerer Strich aus Holz
  const links = Math.min(...xs) - 26;
  const rechts = Math.max(...xs) + 26;
  t += `<rect x="${links}" y="${LINIE_Y - 5 + 4}" width="${rechts - links}" height="10" rx="5" fill="${HOLZ_KANTE}"/>`;
  t += `<rect x="${links}" y="${LINIE_Y - 5}" width="${rechts - links}" height="10" rx="5" fill="${HOLZ}"/>`;
  xs.forEach((x) => (t += `<rect x="${x - 1.75}" y="${LINIE_Y - 15}" width="3.5" height="30" rx="1.75" fill="${TINTE_LEISE}"/>`));
  // Sprünge
  r.spruenge.forEach((s, i) => {
    const a = xs[i];
    const b = xs[i + 1];
    const hoch = Math.min(78, Math.abs(b - a) * 0.5);
    const scheitel = LINIE_Y - 16 - hoch;
    let g = '';
    const bogen = `M${a} ${LINIE_Y - 16} Q${(a + b) / 2} ${LINIE_Y - 16 - hoch * 2} ${b} ${LINIE_Y - 18}`;
    if (hervor && i === 0) g += `<path d="${bogen}" fill="none" stroke="${LATERNE}" stroke-width="16" stroke-linecap="round"/>`;
    g += `<path d="${bogen}" fill="none" stroke="${FIGUR_TOKEN['ast-kante']}" stroke-width="5" stroke-linecap="round"/>`;
    const winkel = (Math.atan2(hoch * 0.9, (b - a) / 2) * 180) / Math.PI;
    g += pfeilSpitze(b, LINIE_Y - 17, b > a ? winkel : 180 - winkel, FIGUR_TOKEN['ast-kante'], 13);
    g += schild((a + b) / 2, scheitel - 52, s, o, l);
    t += gruppe(!hervor ? null : i === 0 ? 'teil' : 'schatten', g);
  });
  // Zahlen unter dem Strich: Start, Ziel (oder Nest); die Mitte bleibt leer
  t += gruppe(hervor ? 'teil' : null, (hervor ? `<rect x="${xs[0] - 28}" y="${LINIE_Y + 18}" width="56" height="40" rx="10" fill="${LATERNE}" stroke="${LATERNE_KANTE}" stroke-width="3.5"/>` : '') + zahl(xs[0], LINIE_Y + 38, r.start, 24));
  const xe = xs[xs.length - 1];
  if (r.ziel === null) t += antwortNest(xe - 30, LINIE_Y + 18, 60, 44, o, l, 24);
  else t += zahl(xe, LINIE_Y + 38, r.ziel, 24, TINTE);
  let H = LINIE_Y + 72;
  if (o.hilfe >= 3 || o.vorrechnen) {
    const mitte = werte[1];
    const m = mengenBild(mitte, 0, 0);
    const pb = m.breite + 28;
    const xm = xs[1];
    const px = Math.min(Math.max(xm - pb / 2, 4), W - pb - 4);
    const py = LINIE_Y + 74;
    let h = `<rect x="${xm - 2.5}" y="${LINIE_Y + 14}" width="5" height="${py - LINIE_Y - 12}" rx="2.5" fill="${LATERNE_KANTE}"/>`;
    h += `<rect x="${px}" y="${py}" width="${pb}" height="${m.hoehe + 24}" rx="14" fill="${LATERNE}" stroke="${LATERNE_KANTE}" stroke-width="3.5"/>`;
    h += mengenBild(mitte, px + 14, py + 12).svg;
    t += `<g data-hilfe="schritt">${h}</g>`;
    H = py + m.hoehe + 32;
  }
  return svgRahmen(W, H, t, 'Rechenstrich');
}

export const RECHENSTRICH: Format<Rechenstrich> = {
  id: 'rechenstrich',
  nr: 98,
  version: 1,
  bereich: 'zahlen',
  faehigkeit: 'Z3',
  motor: 'bild',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'welcheZahlFehlt',
  stufen: 3,
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'zahl' }),
  zeichne,
  /**
   * Lernbeispiel: (1) ein Sprung, 2 + 1; (2) zwei kleine Sprünge, 2 + 1 + 2; (3) gewöhnliche Aufgabe der Stufe 1:
   * 3 + 2 + 4. Alle Antworten einstellig.
   */
  beispiele: () => [
    { start: 2, spruenge: [{ zeichen: 'plus', laenge: 1 }], ziel: null },
    { start: 2, spruenge: [{ zeichen: 'plus', laenge: 1 }, { zeichen: 'plus', laenge: 2 }], ziel: null },
    { start: 3, spruenge: [{ zeichen: 'plus', laenge: 2 }, { zeichen: 'plus', laenge: 4 }], ziel: null },
  ],
};

