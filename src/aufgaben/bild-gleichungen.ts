import { FIGUR_TOKEN, HONIG, HONIG_KANTE, HUNDERT_FARBE, HUNDERT_KANTE, LATERNE, LATERNE_KANTE, TINTE_LEISE, WEISS, ZIFFER_FARBEN, ZIFFER_KANTEN } from '../design/farbe';
import type { Antwort } from '../perlen/antwort';
import type { Einstellung, Format, ZeichenOptionen } from './format';
import type { Zufall } from '../core/zufall';
import { antwortNest, brett, gruppe, kachel, laterneRahmen, mengenBild, stufeGrenze, svgRahmen, zahl, zeichenForm } from './bildteile';

/**
 * Bild-Gleichungen (Nr. 68, Bild): Früchte haben einen Wert; gleiche Früchte – gleicher Wert. Zeilen sagen,
 * wie viel Früchte zusammen sind. Wie viel ist die gefragte Frucht wert?
 * Stufe 1: zwei Früchte – zwei gleiche (zusammen 8), dann eine davon und eine andere (zusammen 7);
 *          gefragt ist die andere. Zahlen eine Stufe unter dem Zahlenraum (bis 20 → bis 10, bis 100 → bis 20).
 * Stufe 2: schwerer wird die Zahl der Unbekannten – drei Früchte in einer Kette (zwei oder drei gleiche, dann
 *          je eine bekannte und eine neue); gefragt ist die letzte. Ganzer Zahlenraum.
 * Stufe 3: schwerer wird der Weg – keine Zeile aus lauter gleichen Früchten: drei Früchte (zwei gleiche und
 *          eine andere) und darunter das Paar allein; das Paar steckt in der langen Zeile. Ganzer Zahlenraum.
 * Werte sind natürliche Zahlen ab 1, zwei Früchte haben nie denselben Wert.
 *
 * Löser (unabhängig vom Generator, docs/LOESER.md, Abschnitt 6): probiert für jede Frucht jede Zahl 0–100
 * (Zeile für Zeile, eine Teilsumme über der Zeilensumme bricht ab) und sammelt den Wert der gefragten Frucht.
 * Falle: zwei Früchte, von denen man nur die Summe kennt – viele Lösungen.
 *
 * Hilfe auf dem Bild: Stufe 2 rahmt die Zeile ein, mit der man beginnt (lauter gleiche Früchte; in Stufe 3
 * das Paar), die übrigen gehen in den Halbschatten; Stufe 3 zeigt auf einer warmen Tafel, wie viel die erste
 * Frucht wert ist – als Zehnerstangen und Punkte (Stufe 3 des Formats: eine Klammer zeigt das Paar in der
 * langen Zeile). Keine Ziffer.
 */
export const FRUECHTE = ['erdbeere', 'zitrone', 'birne', 'pflaume', 'orange'] as const;
export type Frucht = (typeof FRUECHTE)[number];
export interface Zeile {
  fruechte: Frucht[];
  summe: number;
}
export interface BildGleichung {
  zeilen: Zeile[];
  frage: Frucht;
}

const summe = (fr: Frucht[], w: Map<Frucht, number>) => fr.reduce((s, f) => s + w.get(f)!, 0);

function erzeuge(z: Zufall, stufe: number, e: Einstellung): BildGleichung {
  const g = stufeGrenze(stufe, e.zahlenraum);
  for (;;) {
    const [A, B, C] = z.mischen(FRUECHTE);
    if (stufe === 1) {
      const a = z.ganz(1, Math.floor(g / 2));
      const b = z.ganz(1, g - a);
      if (a === b) continue;
      return { zeilen: [{ fruechte: [A, A], summe: 2 * a }, { fruechte: [A, B], summe: a + b }], frage: B };
    }
    if (stufe === 2) {
      const mal = z.ganz(2, 3);
      const a = z.ganz(1, Math.floor(g / mal));
      const b = z.ganz(1, g);
      const c = z.ganz(1, g);
      if (new Set([a, b, c]).size < 3 || a + b > g || b + c > g) continue;
      const w = new Map([[A, a], [B, b], [C, c]]);
      const zeilen = [Array<Frucht>(mal).fill(A), [A, B], [B, C]].map((fruechte) => ({ fruechte, summe: summe(fruechte, w) }));
      return { zeilen, frage: C };
    }
    // Stufe 3: [X, A, B] und [A, B], X ist A oder B; die Reihenfolge der Zeilen wechselt
    const a = z.ganz(1, g);
    const b = z.ganz(1, g);
    const X = z.eins([A, B]);
    const w = new Map([[A, a], [B, b]]);
    const lang = [X, A, B];
    if (a === b || summe(lang, w) > g) continue;
    const zeilen = [{ fruechte: lang, summe: summe(lang, w) }, { fruechte: [A, B], summe: a + b }];
    return { zeilen: z.zahl() < 0.5 ? zeilen : zeilen.reverse(), frage: z.eins([A, B]) };
  }
}

/**
 * Alle Belegungen der Früchte mit 0–100, die zu allen Zeilen passen (Rückverfolgung: eine Zeile, deren
 * Früchte alle belegt sind, muss stimmen; eine teilweise belegte darf ihre Summe nicht überschreiten).
 */
export function belegungen(b: BildGleichung): Map<Frucht, number>[] {
  const sorten = [...new Set([...b.zeilen.flatMap((z) => z.fruechte), b.frage])];
  const out: Map<Frucht, number>[] = [];
  const w = new Map<Frucht, number>();
  /** 'ok': alle Zeilen möglich; 'zuviel': eine Teilsumme ist zu groß (größere Werte erst recht); 'falsch' */
  const pruefe = (): 'ok' | 'zuviel' | 'falsch' => {
    let falsch = false;
    for (const z of b.zeilen) {
      let s = 0;
      let alle = true;
      for (const f of z.fruechte) {
        const v = w.get(f);
        if (v === undefined) alle = false;
        else s += v;
      }
      if (s > z.summe) return 'zuviel';
      if (alle && s !== z.summe) falsch = true;
    }
    return falsch ? 'falsch' : 'ok';
  };
  const probiere = (k: number): void => {
    if (k === sorten.length) {
      out.push(new Map(w));
      return;
    }
    for (let v = 0; v <= 100; v++) {
      w.set(sorten[k], v);
      const p = pruefe();
      if (p === 'zuviel') break;
      if (p === 'ok') probiere(k + 1);
    }
    w.delete(sorten[k]);
  };
  probiere(0);
  return out;
}

function loesungen(b: BildGleichung): Antwort[] {
  return [...new Set(belegungen(b).map((w) => w.get(b.frage)!))].map((wert) => ({ art: 'zahl', wert }));
}

/** Zeile, mit der man beginnt: lauter gleiche Früchte; sonst die kürzeste (das Paar) */
export function startZeile(b: BildGleichung): number {
  const gleich = b.zeilen.findIndex((z) => new Set(z.fruechte).size === 1);
  if (gleich >= 0) return gleich;
  return b.zeilen.reduce((m, z, i) => (z.fruechte.length < b.zeilen[m].fruechte.length ? i : m), 0);
}

/** Farben der Früchte: aus der Palette der Ziffern und Formen */
const FARBE: Record<Frucht, [string, string]> = {
  erdbeere: [ZIFFER_FARBEN[1], ZIFFER_KANTEN[1]],
  zitrone: [HONIG, HONIG_KANTE],
  birne: [ZIFFER_FARBEN[4], ZIFFER_KANTEN[4]],
  pflaume: [HUNDERT_FARBE, HUNDERT_KANTE],
  orange: [ZIFFER_FARBEN[2], ZIFFER_KANTEN[2]],
};

/** Blatt am Stiel */
const blatt = (x: number, y: number, dreh: number, g = 1) =>
  `<ellipse cx="${x}" cy="${y}" rx="${8 * g}" ry="${4.2 * g}" fill="${FIGUR_TOKEN.blatt}" transform="rotate(${dreh} ${x} ${y})"/>`;
const stiel = (x: number, y: number, h = 9) => `<rect x="${x - 1.8}" y="${y - h}" width="3.6" height="${h + 2}" rx="1.8" fill="${FIGUR_TOKEN['ast-kante']}"/>`;

/** Frucht mit Mitte (cx, cy), etwa 48 × 48; Kante unten, Licht oben links, kein dunkler Umriss */
export function frucht(f: Frucht, cx: number, cy: number, g = 1): string {
  const [farbe, kante] = FARBE[f];
  const t = (inhalt: string) => `<g data-frucht="${f}" transform="translate(${cx} ${cy}) scale(${g})">${inhalt}</g>`;
  const licht = (x: number, y: number, rx: number, ry: number) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${WEISS}" opacity="0.45" transform="rotate(-25 ${x} ${y})"/>`;
  switch (f) {
    case 'erdbeere': {
      const d = 'M0 -13 C 14 -17 24 -6 17 6 C 12 15 4 21 0 23 C -4 21 -12 15 -17 6 C -24 -6 -14 -17 0 -13 Z';
      let s = `<path d="${d}" fill="${kante}" transform="translate(0 2.5)"/><path d="${d}" fill="${farbe}"/>`;
      for (const [x, y] of [[-8, -4], [0, -5], [8, -4], [-11, 4], [-3, 4], [5, 4], [12, 3], [-6, 12], [2, 12], [-1, 18]]) s += `<ellipse cx="${x}" cy="${y}" rx="1.4" ry="2" fill="${LATERNE}"/>`;
      for (const r of [-60, -20, 20, 60]) s += blatt(Math.sin((r * Math.PI) / 180) * 8, -15 + Math.abs(r) / 12, r * 0.9 + (r < 0 ? -10 : 10), 0.85);
      return t(s + stiel(0, -16, 6) + licht(-9, -6, 4, 2.5));
    }
    case 'zitrone': {
      const d = 'M-23 0 C -23 -10 -12 -17 0 -17 C 12 -17 23 -10 23 0 C 23 10 12 17 0 17 C -12 17 -23 10 -23 0 Z';
      let s = `<g transform="rotate(-18)"><path d="${d}" fill="${kante}" transform="translate(0 2.5)"/>`;
      s += `<ellipse cx="-24" cy="1" rx="4" ry="3.6" fill="${kante}"/><ellipse cx="24" cy="1" rx="4" ry="3.6" fill="${kante}"/>`;
      s += `<path d="${d}" fill="${farbe}"/><ellipse cx="-24" cy="-1" rx="3.6" ry="3.2" fill="${farbe}"/><ellipse cx="24" cy="-1" rx="3.6" ry="3.2" fill="${farbe}"/>`;
      s += licht(-8, -8, 7, 3) + '</g>';
      return t(s);
    }
    case 'birne': {
      const d = 'M0 -20 C 7 -20 9 -12 10 -6 C 11 0 20 4 20 12 C 20 20 11 24 0 24 C -11 24 -20 20 -20 12 C -20 4 -11 0 -10 -6 C -9 -12 -7 -20 0 -20 Z';
      let s = `<path d="${d}" fill="${kante}" transform="translate(0 2.5)"/><path d="${d}" fill="${farbe}"/>`;
      s += stiel(1, -19, 8) + blatt(9, -24, -25) + licht(-9, 6, 4.5, 3);
      return t(s);
    }
    case 'pflaume': {
      let s = `<ellipse cx="0" cy="4.5" rx="18" ry="21" fill="${kante}"/><ellipse cx="0" cy="2" rx="18" ry="21" fill="${farbe}"/>`;
      s += `<path d="M3 -17 C 9 -6 9 10 3 21" fill="none" stroke="${kante}" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/>`;
      s += stiel(0, -18, 7) + blatt(-8, -21, 20, 0.9) + licht(-8, -6, 4.5, 3);
      return t(s);
    }
    case 'orange': {
      let s = `<circle cx="0" cy="5" r="20" fill="${kante}"/><circle cx="0" cy="2.5" r="20" fill="${farbe}"/>`;
      for (const [x, y] of [[-6, 6], [5, 10], [9, -2], [-2, 14], [-10, -2]]) s += `<circle cx="${x}" cy="${y}" r="1.2" fill="${kante}" opacity="0.6"/>`;
      s += stiel(0, -16, 5) + blatt(7, -19, -20) + licht(-8, -6, 5, 3);
      return t(s);
    }
  }
}

const FR = 54;
const PLUS = 30;
const GLEICH = 30;
const KB = 64;
const KH = 46;
const ZEILE_H = 66;
const ABSTAND = 16;
const W = 372;

/** x der Früchte und der Summe in einer Zeile (rechtsbündig: die Summen stehen untereinander) */
function zeilenLage(n: number): { fx: number[]; gx: number; sx: number; links: number } {
  const sx = W - 18 - KB;
  const gx = sx - GLEICH / 2 - 4;
  const fx: number[] = [];
  let x = gx - GLEICH / 2 - FR / 2 - 2;
  for (let k = n - 1; k >= 0; k--) {
    fx[k] = x;
    x -= FR + PLUS;
  }
  return { fx, gx, sx, links: fx[0] - FR / 2 - 12 };
}

function zeichne(b: BildGleichung, o: ZeichenOptionen): string {
  const hervor = o.hilfe >= 2 || !!o.vorrechnen;
  const schritt = o.hilfe >= 3 || !!o.vorrechnen;
  const start = startZeile(b);
  const einSorte = new Set(b.zeilen[start].fruechte).size === 1;
  const bel = belegungen(b);
  const wert = (f: Frucht) => (bel.length >= 1 ? bel[0].get(f)! : 0);
  const links = 14;
  let s = '';
  let y = 8;
  b.zeilen.forEach((z, i) => {
    const l = zeilenLage(z.fruechte.length);
    let t = '';
    const teil = hervor && i === start;
    if (teil) t += laterneRahmen(links - 6, y - 6, W - 2 * links + 12, ZEILE_H + 12, 18);
    t += brett(links, y, W - 2 * links, ZEILE_H);
    z.fruechte.forEach((f, k) => {
      t += frucht(f, l.fx[k], y + ZEILE_H / 2 - 1);
      if (k > 0) t += zahl((l.fx[k] + l.fx[k - 1]) / 2, y + ZEILE_H / 2, '+', 26, TINTE_LEISE);
    });
    t += zahl(l.gx, y + ZEILE_H / 2, '=', 26, TINTE_LEISE);
    t += kachel(l.sx, y + (ZEILE_H - KH) / 2 - 2, KB, KH) + zahl(l.sx + KB / 2, y + ZEILE_H / 2 - 2, z.summe, 26);
    s += gruppe(!hervor ? null : teil ? 'teil' : 'schatten', t);
    y += ZEILE_H + ABSTAND;
  });
  // Stufe 3 des Formats: das Paar steckt in der langen Zeile – Klammer darunter
  if (schritt && !einSorte) {
    const kurz = b.zeilen[start].fruechte;
    const langI = b.zeilen.findIndex((_, i) => i !== start);
    const lang = b.zeilen[langI].fruechte;
    const l = zeilenLage(lang.length);
    // Paar am Ende der langen Zeile (so baut sie der Generator; der Rest steht vorn)
    const k0 = lang.length - kurz.length;
    const x0 = l.fx[k0] - FR / 2 + 2;
    const x1 = l.fx[lang.length - 1] + FR / 2 - 2;
    const yz = 8 + langI * (ZEILE_H + ABSTAND) + ZEILE_H - 8;
    s += `<g data-hilfe="schritt"><path d="M${x0} ${yz - 6} Q${x0} ${yz + 2} ${x0 + 10} ${yz + 2} L${x1 - 10} ${yz + 2} Q${x1} ${yz + 2} ${x1} ${yz - 6}" fill="none" stroke="${LATERNE_KANTE}" stroke-width="5" stroke-linecap="round"/></g>`;
  }
  // Frage: Frucht = Nest
  y += 4;
  const fl = zeilenLage(1);
  s += frucht(b.frage, fl.fx[0], y + ZEILE_H / 2 - 1);
  s += zahl(fl.gx, y + ZEILE_H / 2, '=', 26, TINTE_LEISE);
  s += antwortNest(fl.sx, y + (ZEILE_H - KH) / 2 - 2, KB, KH, o, wert(b.frage), 26);
  y += ZEILE_H;
  // Schritt: wie viel die Frucht der ersten Zeile wert ist (Zehnerstangen und Punkte, keine Ziffer)
  if (schritt && einSorte) {
    const f = b.zeilen[start].fruechte[0];
    const m = mengenBild(wert(f), 0, 0);
    const bb = 54 + 30 + m.breite + 26;
    const ph = Math.max(m.hoehe + 24, 62);
    const x = (W - bb) / 2;
    const ty = y + 12;
    let t = `<rect x="${x}" y="${ty}" width="${bb}" height="${ph}" rx="16" fill="${LATERNE}" stroke="${LATERNE_KANTE}" stroke-width="3.5"/>`;
    t += frucht(f, x + 34, ty + ph / 2, 0.8);
    t += zeichenForm('gleich', x + 70, ty + ph / 2, 14, TINTE_LEISE);
    t += mengenBild(wert(f), x + 86, ty + (ph - m.hoehe) / 2).svg;
    s += `<g data-hilfe="schritt">${t}</g>`;
    y = ty + ph;
  }
  return svgRahmen(W, y + 10, s, 'Bild-Gleichungen');
}

export const BILD_GLEICHUNGEN: Format<BildGleichung> = {
  id: 'bild-gleichungen',
  nr: 68,
  version: 1,
  bereich: 'zahlen',
  faehigkeit: 'Z7',
  motor: 'bild',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'wieVielIstDieFrucht',
  stufen: 3,
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'zahl' }),
  zeichne,
  /**
   * Lernbeispiel: (1) eine Erdbeere ist 3 – wie viel ist die Erdbeere? (2) zwei Erdbeeren sind 6;
   * (3) gewöhnliche Aufgabe der Stufe 1: zwei Erdbeeren 4, Erdbeere und Zitrone 7 – die Zitrone. Alle einstellig.
   */
  beispiele: () => [
    { zeilen: [{ fruechte: ['erdbeere'], summe: 3 }], frage: 'erdbeere' },
    { zeilen: [{ fruechte: ['erdbeere', 'erdbeere'], summe: 6 }], frage: 'erdbeere' },
    {
      zeilen: [
        { fruechte: ['erdbeere', 'erdbeere'], summe: 4 },
        { fruechte: ['erdbeere', 'zitrone'], summe: 7 },
      ],
      frage: 'zitrone',
    },
  ],
};
