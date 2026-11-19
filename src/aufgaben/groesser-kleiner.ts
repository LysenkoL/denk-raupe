import type { Antwort } from '../perlen/antwort';
import type { Zufall } from '../core/zufall';
import type { Einstellung, Format, ZeichenOptionen } from './format';
import { gewaehlteZahl, hilfeRahmen, kachel, kleinerRaum, nest, punkte, punktefeld, schatten, schild, svgHuelle, zeichen, type PunktArt } from './zaehlen';

/**
 * Größer oder kleiner (Nr. 14, Engine Bild): welche Zahl passt? 5 < ? < 7. Die Zahl ist genau eine.
 * Stufe 1: eine Kette „a < ? < b“ mit kleinen Zahlen; bis 10, bei Zahlenraum 100 bis 20.
 * Stufe 2: schwerer wird das Lesen – ganzer Zahlenraum, und die Kette steht auch andersherum: „b > ? > a“.
 * Stufe 3: schwerer wird das Zusammensetzen – zwei getrennte Bedingungen auf zwei Schildern, das „?“ steht mal
 *          links, mal rechts vom Zeichen („? > 13“ und „15 > ?“); beide zusammen lassen eine Zahl übrig.
 * Zeichen: nur < und > aus dem gemeinsamen Satz der Zeichen. Der Löser probiert jede Zahl 0–100 gegen alle Bedingungen.
 *
 * Hilfe auf dem Bild: Stufe 2 rahmt die erste Bedingung warm ein, die zweite geht in den Halbschatten; Stufe 3 legt
 * die Zahlen als Punkte darunter: so viele wie die kleine Zahl, ein leerer Punkt, dann einer bis zur großen Zahl.
 */
export interface Vergleich {
  /** null = „?“ */
  links: number | null;
  zeichen: '<' | '>';
  rechts: number | null;
}
export interface GroesserKleiner {
  bedingungen: Vergleich[];
  /** true: beide Bedingungen als eine Kette „a < ? < b“ (die mittlere Zahl gehört zu beiden) */
  kette: boolean;
}

export const BREITE = 340;
const KW = 70;
const KH = 62;
const ZW = 40;

function gilt(v: number, b: Vergleich): boolean {
  const l = b.links ?? v;
  const r = b.rechts ?? v;
  return b.zeichen === '<' ? l < r : l > r;
}

/** Ketten- oder Einzelbedingungen zu den Grenzen a < ? < b */
function bauen(z: Zufall, a: number, b: number, stufe: number): GroesserKleiner {
  if (stufe === 1) return { kette: true, bedingungen: [{ links: a, zeichen: '<', rechts: null }, { links: null, zeichen: '<', rechts: b }] };
  if (stufe === 2) {
    if (z.zahl() < 0.5) return { kette: true, bedingungen: [{ links: a, zeichen: '<', rechts: null }, { links: null, zeichen: '<', rechts: b }] };
    return { kette: true, bedingungen: [{ links: b, zeichen: '>', rechts: null }, { links: null, zeichen: '>', rechts: a }] };
  }
  const unten: Vergleich = z.zahl() < 0.5 ? { links: null, zeichen: '>', rechts: a } : { links: a, zeichen: '<', rechts: null };
  const oben: Vergleich = z.zahl() < 0.5 ? { links: null, zeichen: '<', rechts: b } : { links: b, zeichen: '>', rechts: null };
  return { kette: false, bedingungen: z.mischen([unten, oben]) };
}

function erzeuge(z: Zufall, stufe: number, e: Einstellung): GroesserKleiner {
  const g = stufe === 1 ? kleinerRaum(e.zahlenraum) : e.zahlenraum;
  const a = z.ganz(0, g - 2);
  return bauen(z, a, a + 2, stufe);
}

/** Löser: jede Zahl 0–100, die alle Bedingungen erfüllt */
function loesungen(g: GroesserKleiner): Antwort[] {
  const out: Antwort[] = [];
  for (let v = 0; v <= 100; v++) if (g.bedingungen.every((b) => gilt(v, b))) out.push({ art: 'zahl', wert: v });
  return out;
}

/** untere und obere Grenze aus den Bedingungen (für die Punkte der Hilfe) */
export function grenzen(g: GroesserKleiner): [number, number] {
  let unten = -1;
  let oben = 101;
  for (const b of g.bedingungen) {
    const zahl = (b.links ?? b.rechts) as number;
    // „? < x“ oder „x > ?“: obere Grenze; sonst untere
    const obere = (b.links === null && b.zeichen === '<') || (b.rechts === null && b.zeichen === '>');
    if (obere) oben = Math.min(oben, zahl);
    else unten = Math.max(unten, zahl);
  }
  return [unten, oben];
}

export function hilfePunkte(g: GroesserKleiner): PunktArt[] {
  const [a, b] = grenzen(g);
  return [...punkte(a, 'erster'), ...punkte(b - a - 1, 'leer'), ...punkte(1, 'zweiter')];
}

/**
 * Kachel oder Nest; im Nest die Zahl des Kindes (in jedem Nest dieselbe). Gibt die Breite zurück.
 */
function glied(x: number, y: number, v: number | null, o: ZeichenOptionen, loesung: number | null): string {
  if (v !== null) return kachel(x, y, KW, KH, String(v), String(v).length > 2 ? 26 : 30);
  return nest(x, y, KW, KH - 4, loesung ?? gewaehlteZahl(o.gewaehlt), { loesung: loesung !== null });
}

/**
 * Kette in einer Reihe oder zwei Schilder untereinander. `hilfe` 2: erste Bedingung warm eingerahmt, die zweite im
 * Halbschatten; 3: dazu die Punkte. `vorrechnen`: beide eingerahmt, im Nest die Lösung.
 */
function zeichne(g: GroesserKleiner, o: ZeichenOptionen): string {
  const loesung = o.vorrechnen ? (loesungen(g)[0] as { wert: number }).wert : null;
  const hilfe2 = o.hilfe >= 2 && !o.vorrechnen;
  let s = '';
  let H: number;
  if (g.kette) {
    const [b1, b2] = g.bedingungen;
    const w = 3 * KW + 2 * ZW + 4 * 6;
    const x0 = (BREITE - w) / 2;
    const y = 16;
    const x = (k: number) => x0 + k * (KW + ZW + 12);
    if (hilfe2 || o.vorrechnen) s += hilfeRahmen(x(0) - 6, y - 6, KW + ZW + 18, KH + 16, 'teil');
    if (o.vorrechnen) s += hilfeRahmen(x(1) + KW + 3, y - 6, KW + ZW + 15, KH + 16, 'teil');
    s += glied(x(0), y, b1.links, o, loesung);
    s += zeichen(x(0) + KW + 6 + ZW / 2, y + KH / 2, b1.zeichen, 38);
    s += glied(x(1), y, null, o, loesung);
    const zweite = zeichen(x(1) + KW + 6 + ZW / 2, y + KH / 2, b2.zeichen, 38) + glied(x(2), y, b2.rechts, o, loesung);
    s += hilfe2 ? schatten(zweite) : zweite;
    H = y + KH + 24;
  } else {
    const w = 2 * KW + ZW + 12;
    const sw = w + 40;
    const sx = (BREITE - sw) / 2;
    g.bedingungen.forEach((b, i) => {
      const y = 12 + i * (KH + 50);
      const x0 = sx + 20;
      let t = '';
      if ((hilfe2 && i === 0) || o.vorrechnen) t += hilfeRahmen(sx - 7, y - 7, sw + 14, KH + 34, 'teil');
      t += schild(sx, y, sw, KH + 20);
      t += glied(x0, y + 10, b.links, o, loesung);
      t += zeichen(x0 + KW + 6 + ZW / 2, y + 10 + KH / 2, b.zeichen, 38);
      t += glied(x0 + KW + ZW + 12, y + 10, b.rechts, o, loesung);
      s += hilfe2 && i > 0 ? schatten(t) : t;
    });
    H = 12 + 2 * (KH + 50) - 18;
  }
  if (o.hilfe >= 3 && !o.vorrechnen) {
    const f = punktefeld(hilfePunkte(g), BREITE, H);
    s += f.svg;
    H += f.hoehe + 6;
  }
  return svgHuelle(BREITE, H, 'Größer oder kleiner', s);
}

export const GROESSER_KLEINER: Format<GroesserKleiner> = {
  id: 'groesser-kleiner',
  nr: 14,
  version: 1,
  bereich: 'zahlen',
  faehigkeit: 'Z5',
  motor: 'bild',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'welcheZahlPasst',
  stufen: 3,
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'zahl' }),
  zeichne,
  /** Lernbeispiel: (1) 0 < ? < 2; (2) 3 < ? < 5; (3) gewöhnliche Aufgabe der Stufe 1: 6 < ? < 8 */
  beispiele: () =>
    [0, 3, 6].map((a) => ({ kette: true, bedingungen: [{ links: a, zeichen: '<' as const, rechts: null }, { links: null, zeichen: '<' as const, rechts: a + 2 }] })),
};
