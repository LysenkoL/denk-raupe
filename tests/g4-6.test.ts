import { describe, expect, it } from 'vitest';
import { FORMATE } from '../src/aufgaben';
import { aufgabeAus, ZAHLENRAEUME, type FormatId, type Zahlenraum } from '../src/aufgaben/format';
import { gleich, type Antwort } from '../src/perlen/antwort';
import { KIND } from '../src/i18n/kind';
import { ZAHLENHAUS, type Zahlenhaus } from '../src/aufgaben/zahlenhaus';
import { RECHENDREIECK, nachbarn, type Rechendreieck } from '../src/aufgaben/rechendreieck';
import { BILDER_GITTER, vorhersage, type BilderGitter } from '../src/aufgaben/bilder-gitter';
import { ZAHLENREIHE, fortsetzungen, type Zahlenreihe } from '../src/aufgaben/zahlenreihe';
import { PERLENKETTE, vorhersagen, type Perlenkette } from '../src/aufgaben/perlenkette';
import { ABC_REIHE, lueckenBuchstaben, type AbcReihe } from '../src/aufgaben/abc-reihe';
import { RAUPEN_WEG, gehen, type RaupenWeg } from '../src/aufgaben/raupen-weg';
import { LABYRINTH, folgen, type Labyrinth } from '../src/aufgaben/labyrinth';

/**
 * Gruppen Г4 (Raster mit einer Zelle: Nr. 4 mit Variante 5, 8, 21), Г5 (Reihe: Nr. 11, 23, 55), Г6 (Weg: Nr. 28, 40) –
 * Fallen für den Löser (docs/LOESER.md, Abschnitt 6), Grenzfälle, Stufen, Hilfe auf dem Bild.
 * (10 000 Aufgaben je Stufe: tests/formate.test.ts; Hilfe verrät nichts: tests/bereit.test.ts; Bildschirm: tests/satz.test.ts.)
 */

const IDS: FormatId[] = ['zahlenhaus', 'rechendreieck', 'bilder-gitter', 'zahlenreihe', 'perlenkette', 'abc-reihe', 'raupen-weg', 'labyrinth'];
const zahl = (wert: number): Antwort => ({ art: 'zahl', wert });

function aufgaben<B>(id: FormatId, n = 150, raeume: readonly Zahlenraum[] = [20]): { b: B; stufe: number; zahlenraum: Zahlenraum; wahl: Antwort[] | null }[] {
  const f = FORMATE[id];
  const out: { b: B; stufe: number; zahlenraum: Zahlenraum; wahl: Antwort[] | null }[] = [];
  for (const zahlenraum of raeume)
    for (let stufe = 1; stufe <= f.stufen; stufe++)
      for (let s = 0; s < n; s++) {
        const a = aufgabeAus(f, s * 40503 + stufe, stufe, { zahlenraum });
        out.push({ b: a.bedingung as B, stufe, zahlenraum, wahl: a.wahl });
      }
  return out;
}

describe('Г4–Г6: gemeinsam', () => {
  it('Pass: Engine laut Tabelle, feste Sätze, drei Stufen', () => {
    const motor: Partial<Record<FormatId, string>> = { zahlenhaus: 'raster', rechendreieck: 'raster', 'bilder-gitter': 'raster', zahlenreihe: 'reihe', perlenkette: 'reihe', 'abc-reihe': 'reihe', 'raupen-weg': 'weg', labyrinth: 'weg' };
    for (const id of IDS) {
      const f = FORMATE[id];
      expect([f.motor, f.druck, f.stufen]).toEqual([motor[id], false, 3]);
      expect(KIND.auftrag[f.auftrag].trim()).not.toBe('');
    }
  });

  it('ohne Antwort nichts eingesetzt und keine Hilfe; Hilfe 2 hebt hervor, Hilfe 3 zeigt einen Schritt', () => {
    for (const id of IDS) {
      const f = FORMATE[id];
      for (const { b } of aufgaben(id, 20)) {
        const svg0 = f.zeichne(b, { hilfe: 0, gewaehlt: null });
        expect(svg0).not.toContain('data-inhalt');
        expect(svg0).not.toContain('data-hilfe');
        expect(f.zeichne(b, { hilfe: 0, gewaehlt: f.loesungen(b)[0] })).toContain('data-inhalt');
        const svg2 = f.zeichne(b, { hilfe: 2, gewaehlt: null });
        expect(svg2, id).toContain('data-hilfe="teil"');
        expect(svg2, id).not.toContain('data-hilfe="schritt"');
        expect(f.zeichne(b, { hilfe: 3, gewaehlt: null, aehnlich: true }), id).toContain('data-hilfe="schritt"');
      }
    }
  });
});

describe('Zahlenhaus (Nr. 4, Variante Nr. 5)', () => {
  it('Lücke rechts und links; Grenzfälle 0 und Dachzahl', () => {
    expect(ZAHLENHAUS.loesungen({ dach: 10, stockwerke: [[3, 7], [4, null]] })).toEqual([zahl(6)]);
    expect(ZAHLENHAUS.loesungen({ dach: 10, stockwerke: [[null, 10]] })).toEqual([zahl(0)]);
    expect(ZAHLENHAUS.loesungen({ dach: 100, stockwerke: [[0, null]] })).toEqual([zahl(100)]);
  });
  it('Fallen: ein volles Stockwerk widerspricht dem Dach → keine Lösung; zwei Lücken → keine', () => {
    expect(ZAHLENHAUS.loesungen({ dach: 10, stockwerke: [[3, 6], [4, null]] })).toEqual([]);
    expect(ZAHLENHAUS.loesungen({ dach: 10, stockwerke: [[3, null], [4, null]] })).toEqual([]);
  });
  it('Stufen: 1 – Dach 10 (Verliebte Zahlen); 3 – Lücke auch links; alles im Zahlenraum', () => {
    let links = 0;
    for (const { b, stufe, zahlenraum } of aufgaben<Zahlenhaus>('zahlenhaus', 150, ZAHLENRAEUME)) {
      if (stufe === 1) expect(b.dach).toBe(10);
      expect(b.dach).toBeLessThanOrEqual(stufe === 1 ? 10 : zahlenraum);
      if (b.stockwerke.some(([a]) => a === null)) {
        links++;
        expect(stufe).toBe(3);
      }
    }
    expect(links).toBeGreaterThan(50);
  });
});

describe('Rechendreieck (Nr. 8)', () => {
  it('Seite, Ecke, nur Seiten: genau eine Zahl', () => {
    expect(RECHENDREIECK.loesungen({ zahlen: { a: 3, b: 4, c: 1 }, frage: 'ab' })).toEqual([zahl(7)]);
    expect(RECHENDREIECK.loesungen({ zahlen: { b: 4, c: 1, ab: 7, ca: 4 }, frage: 'a' })).toEqual([zahl(3)]);
    expect(RECHENDREIECK.loesungen({ zahlen: { ab: 7, bc: 5, ca: 4 }, frage: 'b' })).toEqual([zahl(4)]);
  });
  it('Falle: zu wenig gezeigt (nur eine Ecke und eine Seite) → mehrere Lösungen; Widerspruch → keine', () => {
    expect(RECHENDREIECK.loesungen({ zahlen: { a: 2, bc: 5 }, frage: 'b' }).length).toBeGreaterThan(1);
    expect(RECHENDREIECK.loesungen({ zahlen: { a: 2, b: 3, ab: 6 }, frage: 'c' })).toEqual([]);
  });
  it('Stufen und Hilfe: die Hilfe hebt nur gezeigte Zahlen hervor', () => {
    for (const { b, stufe } of aufgaben<Rechendreieck>('rechendreieck')) {
      expect(b.frage.length).toBe(stufe === 1 ? 2 : 1);
      if (stufe === 3) expect(Object.keys(b.zahlen).sort()).toEqual(['ab', 'bc', 'ca']);
      const n = nachbarn(b);
      expect(n.length).toBeGreaterThan(0);
      for (const p of n) expect(b.zahlen[p]).toBeDefined();
    }
  });
});

describe('Bilder-Gitter (Nr. 21)', () => {
  const e = (form: 'kreis' | 'stern' | 'dreieck', farbe: 'rot' | 'blau' | 'gelb') => ({ form, farbe, klein: false });
  it('Falle (docs/LOESER.md): keine Regel passt zu Zeilen oder Spalten → nicht bestimmt, keine Lösung', () => {
    const [a, b] = [e('stern', 'rot'), e('kreis', 'rot')];
    const g: BilderGitter = { felder: [a, b, a, b, a, b, a, a, null], perlen: [a, b] };
    expect(vorhersage(g, 'form')).toBeUndefined();
    expect(BILDER_GITTER.loesungen(g)).toEqual([]);
    // Zeilen gleich: die Zeile sagt „Kreis“
    expect(vorhersage({ felder: [a, a, a, a, a, a, b, b, null], perlen: [] }, 'form')).toBe('kreis');
  });
  it('Stufen: Zahl der Perlen; die Lösung erfüllt alle bestimmten Merkmale', () => {
    for (const { b, stufe, wahl } of aufgaben<BilderGitter>('bilder-gitter')) {
      expect(wahl).toHaveLength(stufe === 1 ? 3 : 4);
      for (const m of ['form', 'farbe', 'klein'] as const) expect(vorhersage(b, m)).toBeDefined();
      expect(BILDER_GITTER.loesungen(b)).toHaveLength(1);
    }
  });
});

describe('Zahlenreihe (Nr. 11)', () => {
  it('Falle aus docs/LOESER.md: 2, 4, 8 – Verdoppeln 16, wachsender Schritt 14; deshalb mindestens vier Zahlen', () => {
    expect(fortsetzungen([2, 4, 8]).sort((a, b) => a - b)).toEqual([14, 16]);
    expect(fortsetzungen([2, 4, 8, 16])).toEqual([32]);
  });
  it('Regeln: gleicher Schritt, rückwärts, Wechsel zweier Schritte', () => {
    expect(ZAHLENREIHE.loesungen({ zahlen: [2, 4, 6, 8] })).toEqual([zahl(10)]);
    expect(ZAHLENREIHE.loesungen({ zahlen: [20, 17, 14, 11, 8] })).toEqual([zahl(5)]);
    expect(ZAHLENREIHE.loesungen({ zahlen: [2, 5, 4, 7, 6, 9] })).toEqual([zahl(8)]);
  });
  it('Stufen: vier, fünf, sechs (Wechsel) oder fünf (Verdoppeln) Zahlen; alles im Zahlenraum', () => {
    for (const { b, stufe, zahlenraum } of aufgaben<Zahlenreihe>('zahlenreihe', 150, ZAHLENRAEUME)) {
      expect(b.zahlen.length).toBe(stufe === 1 ? 4 : stufe === 2 ? 5 : b.zahlen.length);
      if (stufe === 3) expect([5, 6]).toContain(b.zahlen.length);
      const l = (ZAHLENREIHE.loesungen(b)[0] as { wert: number }).wert;
      expect(Math.max(l, ...b.zahlen)).toBeLessThanOrEqual(stufe === 1 ? (zahlenraum === 100 ? 20 : 10) : zahlenraum);
    }
  });
});

describe('Perlenkette (Nr. 23)', () => {
  it('Falle: weniger als zwei ganze Wiederholungen zu sehen → keine sichere Vorhersage', () => {
    // „rot, rot, blau“ nur anderthalbmal zu sehen: keine Regel ist sicher
    expect(vorhersagen(['rot', 'rot', 'blau', 'rot', 'rot'], 9)).toEqual([]);
    expect(vorhersagen(['rot', 'rot', 'blau', 'rot', 'rot', 'blau'], 9)).toEqual(['rot']);
    expect(vorhersagen(['rot', 'blau', 'gelb', 'rot'], 5)).toEqual([]);
  });
  it('Stufen: gefragter Platz 8, 9–10, 11–12 – immer hinter den aufgefädelten', () => {
    for (const { b, stufe } of aufgaben<Perlenkette>('perlenkette')) {
      expect(b.frage).toBeGreaterThanOrEqual(b.perlen.length);
      expect(b.frage + 1).toBeGreaterThanOrEqual(stufe === 1 ? 8 : stufe === 2 ? 9 : 11);
      expect(PERLENKETTE.loesungen(b)).toHaveLength(1);
    }
  });
});

describe('ABC-Reihe (Nr. 55)', () => {
  it('Lücke vorn, in der Mitte, hinten; jeder zweite; rückwärts', () => {
    expect(lueckenBuchstaben(['A', 'B', null, 'D'])).toEqual(['C']);
    expect(lueckenBuchstaben([null, 'B', 'C'])).toEqual(['A']);
    expect(lueckenBuchstaben(['A', 'C', 'E', null])).toEqual(['G']);
    expect(lueckenBuchstaben(['H', 'G', null, 'E'])).toEqual(['F']);
  });
  it('Falle: über das Alphabet hinaus → keine Lösung', () => {
    expect(ABC_REIHE.loesungen({ reihe: ['W', 'Y', null], wahl: ['A'] })).toEqual([]);
  });
  it('Stufen: Länge und Schritt', () => {
    for (const { b, stufe } of aufgaben<AbcReihe>('abc-reihe')) {
      expect(b.reihe.length).toBe(stufe === 1 ? 4 : 5);
      expect(ABC_REIHE.loesungen(b)).toHaveLength(1);
    }
  });
});

describe('Raupen-Weg (Nr. 28) und Labyrinth (Nr. 40)', () => {
  it('Raupen-Weg: Kreis → keine Lösung; hinaus ohne Tor → keine', () => {
    const kreis: RaupenWeg = { n: 2, pfeile: ['rechts', 'unten', 'oben', 'links'], start: 0, tore: [{ feld: 1, richtung: 'rechts' }] };
    expect(gehen(kreis).tor).toBeNull();
    expect(RAUPEN_WEG.loesungen({ ...kreis, pfeile: ['rechts', 'rechts', 'oben', 'links'], tore: [{ feld: 1, richtung: 'oben' }] })).toEqual([]);
  });
  it('Raupen-Weg: Stufen – Größe und Länge des Wegs', () => {
    for (const { b, stufe } of aufgaben<RaupenWeg>('raupen-weg')) {
      const n = gehen(b).felder.length - 1;
      expect(b.n).toBe(stufe === 1 ? 3 : 4);
      const [min, max] = stufe === 1 ? [2, 3] : stufe === 2 ? [3, 5] : [5, 8];
      expect(n >= min && n <= max).toBe(true);
    }
  });
  it('Labyrinth: zwei Brücken auf gleicher Höhe an einem Weg → mehrdeutig, keine Lösung', () => {
    const l: Labyrinth = { wege: 3, bruecken: [{ links: 0, hoehe: 4 }, { links: 1, hoehe: 4 }], start: 1 };
    expect(LABYRINTH.loesungen(l)).toEqual([]);
    expect(folgen({ wege: 3, bruecken: [{ links: 0, hoehe: 4 }, { links: 1, hoehe: 6 }], start: 0 }).ausgang).toBe(2);
  });
  it('Labyrinth: Stufen – Wege und Brücken; mindestens einmal hinüber', () => {
    for (const { b, stufe } of aufgaben<Labyrinth>('labyrinth')) {
      expect(b.wege).toBe(stufe + 2);
      expect(b.bruecken).toHaveLength(stufe === 1 ? 2 : stufe === 2 ? 4 : 7);
      expect(folgen(b).bruecken.length).toBeGreaterThanOrEqual(1);
    }
  });
});
void gleich;
