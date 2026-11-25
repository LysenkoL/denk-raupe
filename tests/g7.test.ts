import { describe, expect, it } from 'vitest';
import { FORMATE } from '../src/aufgaben';
import { aufgabeAus, ZAHLENRAEUME, type FormatId, type Zahlenraum } from '../src/aufgaben/format';
import { GROSS_KLEIN, type GrossKlein } from '../src/aufgaben/gross-klein';
import { ZEHNER_PAARE, paare as zehnerPaare, reste, type ZehnerPaare } from '../src/aufgaben/zehner-paare';
import { SCHUETTELBOX, type Schuettelbox } from '../src/aufgaben/schuettelbox';
import { GLEICHES_PAAR, paare, type GleichesPaar } from '../src/aufgaben/gleiches-paar';
import { BLITZBLICK, type Blitzblick } from '../src/aufgaben/blitzblick';
import { MINI_SUDOKU, belegungen, kandidaten, type MiniSudoku } from '../src/aufgaben/mini-sudoku';

/**
 * Gruppe Г7 (Verbinden, Bauen, Blick, Raster mit mehreren Zellen): Nr. 64, 76, 3, 49, 2, 25 – Fallen für den Löser
 * (docs/LOESER.md, Abschnitt 6), Grenzfälle, Stufen. (10 000 Aufgaben je Stufe: tests/formate.test.ts; Hilfe verrät nichts:
 * tests/bereit.test.ts; Bedienung im Browser – Paar, Blick, Raster: tests/satz.test.ts.)
 */

function aufgaben<B>(id: FormatId, n = 120, raeume: readonly Zahlenraum[] = [20]): { b: B; stufe: number; zahlenraum: Zahlenraum }[] {
  const f = FORMATE[id];
  const out: { b: B; stufe: number; zahlenraum: Zahlenraum }[] = [];
  for (const zahlenraum of raeume) for (let stufe = 1; stufe <= f.stufen; stufe++) for (let s = 0; s < n; s++) out.push({ b: aufgabeAus(f, s * 40503 + stufe, stufe, { zahlenraum }).bedingung as B, stufe, zahlenraum });
  return out;
}

describe('Г7: gemeinsam', () => {
  it('Hilfe 2 hebt hervor, Hilfe 3 zeigt einen Schritt (an der ähnlichen Aufgabe immer); ohne Antwort nichts eingesetzt', () => {
    for (const id of ['gross-klein', 'zehner-paare', 'schuettelbox', 'gleiches-paar', 'blitzblick', 'mini-sudoku'] as FormatId[]) {
      const f = FORMATE[id];
      for (const { b } of aufgaben(id, 15)) {
        const svg0 = f.zeichne(b, { hilfe: 0, gewaehlt: null });
        expect(svg0, id).not.toContain('data-hilfe');
        expect(svg0, id).not.toContain('data-inhalt');
        expect(f.zeichne(b, { hilfe: 2, gewaehlt: null }), id).toContain('data-hilfe="teil"');
        expect(f.zeichne(b, { hilfe: 3, gewaehlt: null, aehnlich: true }), id).toContain('data-hilfe="schritt"');
      }
    }
  });
});

describe('Groß und klein (Nr. 64)', () => {
  it('nur der kleine Buchstabe zum großen passt; Stufe 3 mit Verwechslern', () => {
    expect(GROSS_KLEIN.loesungen({ gross: 'D', wahl: ['b', 'd', 'p', 'q'] })).toEqual([{ art: 'buchstabe', wert: 'd' }]);
    expect(GROSS_KLEIN.loesungen({ gross: 'D', wahl: ['b', 'p'] })).toEqual([]);
    for (const { b, stufe } of aufgaben<GrossKlein>('gross-klein')) {
      expect(b.wahl).toHaveLength(stufe === 1 ? 3 : 4);
      expect(b.wahl).toContain(b.gross.toLowerCase());
    }
  });
});

describe('Zehner-Paare (Nr. 76)', () => {
  it('Falle (docs/LOESER.md): Reste aller Teilungen – derselbe Rest ist eindeutig, verschiedene nicht', () => {
    expect(reste({ ziel: 10, zahlen: [3, 7, 4] })).toEqual([4]);
    // 3 + 7 und 7 + 3: übrig bleibt 3 oder 7 – zwei Antworten
    expect(reste({ ziel: 10, zahlen: [3, 7, 3, 7, 3] })).toEqual([3]);
    expect(reste({ ziel: 10, zahlen: [5, 5, 5] })).toEqual([5]);
    expect(ZEHNER_PAARE.loesungen({ ziel: 10, zahlen: [1, 9, 2, 8, 3, 6] })).toEqual([]);
  });
  it('Stufen: 5, 7, 9 Zahlen; die Hilfe teilt ohne den Rest', () => {
    for (const { b, stufe } of aufgaben<ZehnerPaare>('zehner-paare', 120, ZAHLENRAEUME)) {
      expect(b.zahlen).toHaveLength(stufe === 1 ? 5 : stufe === 2 ? 7 : 9);
      const p = zehnerPaare(b);
      expect(p).toHaveLength((b.zahlen.length - 1) / 2);
      for (const [x, y] of p) expect(b.zahlen[x] + b.zahlen[y]).toBe(b.ziel);
    }
  });
});

describe('Schüttelbox (Nr. 3)', () => {
  it('versteckt = Schild minus offen; auch 0; mehr offen als auf dem Schild → keine Lösung', () => {
    expect(SCHUETTELBOX.loesungen({ gesamt: 7, offen: 4, farbe: 'rot' })).toEqual([{ art: 'zahl', wert: 3 }]);
    expect(SCHUETTELBOX.loesungen({ gesamt: 5, offen: 5, farbe: 'rot' })).toEqual([{ art: 'zahl', wert: 0 }]);
    expect(SCHUETTELBOX.loesungen({ gesamt: 3, offen: 4, farbe: 'rot' })).toEqual([]);
    for (const { b, stufe, zahlenraum } of aufgaben<Schuettelbox>('schuettelbox', 100, ZAHLENRAEUME)) {
      const [a, c] = stufe === 1 ? [3, 6] : stufe === 2 ? [5, 10] : zahlenraum === 10 ? [7, 10] : [10, 20];
      expect(b.gesamt >= a && b.gesamt <= c && b.offen >= 1).toBe(true);
    }
  });
});

describe('Gleiches Paar (Nr. 49)', () => {
  const k = (punkte: 1 | 2 | 3, farbe: 'rot' | 'blau' = 'rot') => ({ form: 'kreis' as const, farbe, punkte });
  it('Falle: zwei Paare → zwei Lösungen; kein Paar → keine', () => {
    expect(GLEICHES_PAAR.loesungen({ karten: [k(1), k(1), k(2), k(2)] })).toHaveLength(2);
    expect(GLEICHES_PAAR.loesungen({ karten: [k(1), k(2), k(3)] })).toEqual([]);
    expect(GLEICHES_PAAR.loesungen({ karten: [k(1), k(2), k(1, 'blau'), k(2)] })).toEqual([{ art: 'sammel', zeichen: 'paar', wert: [2, 4] }]);
  });
  it('Stufen: 4, 6, 8 Karten; ab Stufe 2 unterscheiden sich die anderen vom Paar in genau einem Merkmal', () => {
    for (const { b, stufe } of aufgaben<GleichesPaar>('gleiches-paar')) {
      expect(b.karten).toHaveLength(stufe === 1 ? 4 : stufe === 2 ? 6 : 8);
      const [i, j] = paare(b)[0];
      const p = b.karten[i - 1];
      b.karten.forEach((x, n) => {
        if (n === i - 1 || n === j - 1) return;
        const d = (x.form !== p.form ? 1 : 0) + (x.farbe !== p.farbe ? 1 : 0) + (x.punkte !== p.punkte ? 1 : 0);
        if (stufe === 1) expect(d).toBeGreaterThanOrEqual(2);
        else expect(d).toBe(1);
      });
    }
  });
  it('Eingabe: Tippen im Bild, mehrere Dinge, keine Wahl der Perle', () => {
    expect(GLEICHES_PAAR.eingabe({ karten: [] })).toEqual({ art: 'bild', mehrfach: true });
    expect(aufgabeAus(GLEICHES_PAAR, 1, 1).wahl).toBeNull();
  });
});

describe('Blitzblick (Nr. 2)', () => {
  it('Falle: zwei Punkte berühren sich → mehrdeutig; Stufen 2–5, 4–8, 6–10 (Fünferreihen)', () => {
    expect(BLITZBLICK.loesungen({ punkte: [{ x: 50, y: 50 }, { x: 60, y: 50 }], farbe: 'rot', breite: 200, hoehe: 100 })).toHaveLength(2);
    for (const { b, stufe } of aufgaben<Blitzblick>('blitzblick')) {
      const n = b.punkte.length;
      const [a, c] = stufe === 1 ? [2, 5] : stufe === 2 ? [4, 8] : [6, 10];
      expect(n >= a && n <= c).toBe(true);
      // zugedeckt: die Punkte liegen in der Blick-Gruppe, die Blätter darüber
      const svg = BLITZBLICK.zeichne(b, { hilfe: 0, gewaehlt: null });
      expect(svg).toContain('data-blick="1"');
      expect(svg.indexOf('blick-inhalt')).toBeLessThan(svg.indexOf('blick-blatt'));
      expect(BLITZBLICK.zeichne(b, { hilfe: 2, gewaehlt: null })).toContain('--blick-dauer:4s');
    }
  });
});

describe('Mini-Sudoku (Nr. 25)', () => {
  const z = [{ form: 'kreis' as const, farbe: 'rot' as const }, { form: 'stern' as const, farbe: 'gelb' as const }, { form: 'dreieck' as const, farbe: 'blau' as const }];
  it('Falle (docs/LOESER.md): Gitter mit zwei Belegungen → zwei Lösungen; Widerspruch im Anfang → keine', () => {
    const zwei: MiniSudoku = { n: 3, start: [0, -1, -1, -1, -1, -1, -1, -1, -1], zeichen: z };
    expect(MINI_SUDOKU.loesungen(zwei)).toHaveLength(2);
    expect(MINI_SUDOKU.loesungen({ n: 3, start: [0, 0, -1, -1, -1, -1, -1, -1, -1], zeichen: z })).toEqual([]);
    expect(MINI_SUDOKU.loesungen({ n: 3, start: [0, 1, 2, 1, 2, 0, 2, 0, -1], zeichen: z })).toEqual([{ art: 'sammel', zeichen: 'gitter', wert: [0, 1, 2, 1, 2, 0, 2, 0, 1] }]);
  });
  it('4 × 4: auch die Blöcke zählen', () => {
    const start = [0, 1, 2, 3, 2, 3, 0, 1, 1, 0, 3, 2, 3, 2, 1, -1];
    expect(kandidaten({ n: 4 }, start, 15)).toEqual([0]);
  });
  it('Stufen: 3 × 3 mit 2 und 4–5 leeren, 4 × 4 mit 6–8 leeren; die Lösung erfüllt alle Regeln', () => {
    for (const { b, stufe } of aufgaben<MiniSudoku>('mini-sudoku', 80)) {
      const leer = b.start.filter((v) => v === -1).length;
      expect(b.n).toBe(stufe === 3 ? 4 : 3);
      expect(stufe === 1 ? leer === 2 : stufe === 2 ? leer >= 4 && leer <= 5 : leer >= 6 && leer <= 8).toBe(true);
      const voll = belegungen(b)[0];
      for (let r = 0; r < b.n; r++) {
        expect(new Set(voll.slice(r * b.n, r * b.n + b.n)).size).toBe(b.n);
        expect(new Set(Array.from({ length: b.n }, (_, i) => voll[i * b.n + r])).size).toBe(b.n);
      }
    }
  });
});
