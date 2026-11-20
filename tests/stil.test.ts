import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { FARB_TOKEN, FIGUR_TOKEN, kontrast, leuchtdichte, mix } from '../src/design/farbe';
import { FORMATE } from '../src/aufgaben';
import { aufgabeAus } from '../src/aufgaben/format';
import { blattSvg, korbSvg, vorderteilSvg } from '../src/bilder/figuren';
import { K1, figur } from '../src/bilder/bilder';
import { szeneHtml } from '../src/satz/szene';
import { neuerSatz, setzeAntwort, vergleiche } from '../src/satz/vergleich';

/**
 * docs/STIL.md, Abschnitt 14 (A9): Token der Bewegung und der Figuren wie im Dokument und in tokens.css,
 * Kontrast, keine dünnen Linien und keine schwarzen Umrisse, keine alten Bilder auf dem Satz-Bildschirm.
 * Was nur im Browser zu sehen ist (gleicher Zustand ohne Bewegung, nichts unter dem Blatt, 360 px, Tablet),
 * prüft tests/layout.test.ts, Abschnitt „Stil (A9)“.
 */
const stile = resolve(__dirname, '../src/styles');
const tokens = readFileSync(join(stile, 'tokens.css'), 'utf8');
const css = ['app.css', 'stil.css', 'tokens.css'].map((f) => readFileSync(join(stile, f), 'utf8')).join('\n');
const roh = (name: string) => tokens.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1]?.trim();
const zahl = (name: string) => parseFloat(roh(name) ?? 'NaN');

function dateien(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? dateien(p) : [p];
  });
}
const quellen = dateien(resolve(__dirname, '../src')).filter((f) => f.endsWith('.ts'));

describe('Bewegung (docs/STIL.md, Abschnitt 9): Token wie in der Tabelle', () => {
  it('Zeiten', () => {
    const ms: [string, number][] = [
      ['druck-runter', 80],
      ['druck-zurueck', 240],
      ['setzen', 260],
      ['perle-flug', 220],
      ['welle', 40],
      ['folgen', 180],
      ['blatt-heben', 350],
      ['blatt-abstand', 220],
      ['wackeln', 480],
      ['korb-flug', 500],
      ['zurueck', 320],
    ];
    for (const [n, w] of ms) expect(roh(n), n).toBe(`${w}ms`);
    // Blinzeln alle 5–6 s
    expect(roh('blinzeln')).toMatch(/ms$/);
    expect(zahl('blinzeln')).toBeGreaterThanOrEqual(5000);
    expect(zahl('blinzeln')).toBeLessThanOrEqual(6000);
  });

  it('Maße der Bewegung: Teil ins Nest 1,06 → 0,98 → 1; Blatt wiegt −7°, +6°, −3°; Fühler 2–3°; Pupillen 2–3 px; Hebung 4 px', () => {
    expect([roh('setzen-gross'), roh('setzen-klein')]).toEqual(['1.06', '0.98']);
    expect([roh('wackel-1'), roh('wackel-2'), roh('wackel-3')]).toEqual(['-7deg', '6deg', '-3deg']);
    expect(roh('fuehler-winkel')).toMatch(/deg$/);
    expect(zahl('fuehler-winkel')).toBeGreaterThanOrEqual(2);
    expect(zahl('fuehler-winkel')).toBeLessThanOrEqual(3);
    expect(roh('blick-weg')).toMatch(/px$/);
    expect(zahl('blick-weg')).toBeGreaterThanOrEqual(2);
    expect(zahl('blick-weg')).toBeLessThanOrEqual(3);
    expect(roh('heben-wahl')).toBe('4px');
  });

  it('eine Federkurve in den Token; sonst keine eigene Kurve in den Stilen', () => {
    expect(roh('feder')).toMatch(/^cubic-bezier\(/);
    const kurven = css.match(/cubic-bezier\([^)]*\)/g) ?? [];
    expect(kurven).toHaveLength(1);
    expect(css.match(/linear\(/g) ?? []).toHaveLength(0);
  });

  it('Zeiten in app.css nur aus Token (keine Millisekunden an Ort und Stelle)', () => {
    const app = readFileSync(join(stile, 'app.css'), 'utf8');
    expect(app.match(/\b[1-9]\d*ms\b/g) ?? []).toEqual([]);
  });
});

describe('Figuren-Token: farbe.ts und tokens.css gleich', () => {
  it('jede Figurenfarbe steht gleich in tokens.css', () => {
    for (const [n, c] of Object.entries(FIGUR_TOKEN)) expect(roh(n)?.toUpperCase(), `--${n}`).toBe(c);
  });

  it('Figuren und Felder benutzen keine Farbe außerhalb der Token', () => {
    for (const f of quellen.filter((q) => /(figuren|szene|zahlenmauer|muster|wer-ist-es|screens[\\/]satz)\.ts$/.test(q))) {
      const text = readFileSync(f, 'utf8');
      expect(text.match(/['"`]#[0-9A-Fa-f]{6}['"`]/g) ?? [], f).toEqual([]);
    }
  });
});

describe('Kontrast (docs/STIL.md, Abschnitt 4): Text ≥ 4,5', () => {
  it('Schrift auf jeder Fläche des Satzes', () => {
    const T = FARB_TOKEN;
    // Tablett: Holz, etwas dunkler gemischt (app.css, .lotte)
    const tablett = mix(T.holz, T['holz-kante'], 0.12);
    const flaechen: [string, string, string][] = [
      ['Tinte auf Papier', T.tinte, T.papier],
      ['Tinte auf Holz', T.tinte, T.holz],
      ['Tinte auf Tablett', T.tinte, tablett],
      ['Tinte auf Holzknopf', T.tinte, T.holzknopf],
      ['Tinte auf Honig', T.tinte, T.honig],
      ['Tinte auf Laterne', T.tinte, T.laterne],
      ['Tinte auf Stein', T.tinte, T.stein],
      ['Tinte auf Nest', T.tinte, FIGUR_TOKEN.nest],
      ['leise auf Holz', T['tinte-leise'], T.holz],
      ['leise auf Tablett', T['tinte-leise'], tablett],
      ['leise auf Papier', T['tinte-leise'], T.papier],
      ['leise auf Holzknopf', T['tinte-leise'], T.holzknopf],
      ['leise auf Nest („?“ im leeren Stein)', T['tinte-leise'], mix(FIGUR_TOKEN.nest, T.papier, 0.55)],
    ];
    for (const [name, schrift, flaeche] of flaechen) expect(kontrast(schrift, flaeche), name).toBeGreaterThanOrEqual(4.5);
  });
});

describe('Linien und Umrisse (docs/STIL.md, Abschnitte 1 und 5)', () => {
  it('in den Stilen keine Linie dünner als 2 px', () => {
    const breiten = [...css.matchAll(/(?:border(?:-[a-z]+)*|outline(?:-width)?|stroke-width)\s*:\s*([^;]+);/g)].map((m) => m[1]);
    for (const b of breiten) for (const px of b.matchAll(/(\d*\.?\d+)px/g)) {
      const v = parseFloat(px[1]);
      if (v > 0) expect(v, b).toBeGreaterThanOrEqual(2);
    }
    // Ränder ohne Token-Breite (z. B. „1px solid“) gibt es nicht
    expect(css).not.toMatch(/border[^;:]*:\s*[01](\.\d+)?px/);
  });

  it('keine schwarzen Umrisse: kein Schwarz und kein Blauschwarz der alten Zeichnungen, weder in Stilen noch im Code', () => {
    expect(css).not.toMatch(/#000\b|#000000|\bblack\b|#1B2033/i);
    for (const f of quellen) expect(readFileSync(f, 'utf8'), f).not.toMatch(/#1B2033|stroke="#000|stroke="black/i);
  });

  it('Figuren ohne Umriss: Raupe, Zwilling, Blätter, Korb, Ast haben keinen dunklen Strich', () => {
    const ast = szeneHtml(vergleiche(setzeAntwort(neuerSatz(2), 0, { art: 'zahl', wert: 4 }), () => false).satz, { korb: 3 });
    const svg = [vorderteilSvg('kind'), vorderteilSvg('kind', 'denkt'), vorderteilSvg('zwilling'), blattSvg(), blattSvg(true), korbSvg(true), ast].join('');
    for (const m of svg.matchAll(/stroke="(#[0-9A-Fa-f]{6})"([^>]*)/g)) {
      const strich = m[1];
      // erlaubt: der Trennring der Perle (Tinte, Fassung statt Umriss) und die Augen „freut sich“ (Lidbogen, kein Umriss)
      if (/vector-effect="non-scaling-stroke"/.test(m[2])) continue;
      expect(leuchtdichte(strich), `${strich}${m[2]}`).toBeGreaterThan(0.05);
    }
  });
});

describe('Bilder des Satz-Bildschirms: keine alten, K1 an einer Stelle', () => {
  it('keine Datei importiert die alten Bilder (kopf*, blatt*, korb*.webp); Bilder aus K1 (src/bilder/k1/) sind erlaubt', () => {
    for (const f of quellen) expect(readFileSync(f, 'utf8'), f).not.toMatch(/(?<!k1\/)(kopf|blatt|korb)[\w-]*\.webp/);
  });

  it('solange K1 leer ist, zeichnet jede Figur ein SVG; ein Eintrag in K1 ersetzt es durch das Bild', () => {
    expect(K1).toEqual({});
    expect(figur('zwilling')).toMatch(/^<svg class="figur-svg"/);
    K1.zwilling = 'zwilling.webp';
    try {
      expect(figur('zwilling')).toBe('<img class="figur-bild" src="zwilling.webp" alt="" draggable="false">');
    } finally {
      delete K1.zwilling;
    }
  });

  it('Zahlenmauer: Punkte der Hilfe 3 haben einen Radius von mindestens 7 Einheiten (bis 100 gut zu zählen)', () => {
    const a = aufgabeAus(FORMATE.zahlenmauer, 11, 2, { zahlenraum: 100 });
    const svg = FORMATE.zahlenmauer.zeichne(a.bedingung, { hilfe: 3, gewaehlt: null });
    const r = [...svg.matchAll(/<circle data-punkt="(\w+)"[^>]* r="([\d.]+)"/g)].map((m) => [m[1], Number(m[2])] as const);
    expect(r.length).toBeGreaterThan(0);
    for (const [art, v] of r) expect(v + (art === 'leer' ? 1.25 : 0), art).toBeGreaterThanOrEqual(7);
  });
});
