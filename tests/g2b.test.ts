import { describe, expect, it } from 'vitest';
import { FORMATE } from '../src/aufgaben';
import { aufgabeAus, ZAHLENRAEUME, type FormatId, type Zahlenraum } from '../src/aufgaben/format';
import { gleich, type Antwort } from '../src/perlen/antwort';
import { KIND } from '../src/i18n/kind';
import { MESSEN, type Messen } from '../src/aufgaben/messen';
import { AUFGABENFAMILIE, ergebnis, familie, type Aufgabenfamilie, type Rechnung } from '../src/aufgaben/aufgabenfamilie';
import { WELCHE_AUFGABE, bild, gezaehlt, type WelcheAufgabe } from '../src/aufgaben/welche-aufgabe';
import { GEHEIMSCHRIFT, BUCHSTABEN, type Geheimschrift } from '../src/aufgaben/geheimschrift';

/**
 * Gruppe Г2б (Engine Bild): Nr. 83 (Antwort Zahl), 89, 92, 59 (Antwort Wahl) nach docs/FORMATE.md, Abschnitt 4 –
 * Fallen für den Löser, Grenzfälle, Stufen, Hilfe Stufen 2 und 3 auf dem Bild, das Bild verrät nichts.
 * (10 000 Aufgaben je Stufe und Zahlenraum, ein Samen – eine Aufgabe, Pass: tests/formate.test.ts;
 * Lernbeispiel: tests/lernbeispiel.test.ts; Bildschirm auf drei Größen: tests/satz.test.ts.)
 */

const G2B: FormatId[] = ['messen', 'aufgabenfamilie', 'welche-aufgabe', 'geheimschrift'];
const texte = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
const r = (links: number, zeichen: Rechnung['zeichen'], rechts: number): Rechnung => ({ links, zeichen, rechts });

function aufgaben<B>(id: FormatId, n = 200, raeume: readonly Zahlenraum[] = ZAHLENRAEUME): { b: B; stufe: number; zahlenraum: Zahlenraum; wahl: Antwort[] | null }[] {
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

describe('Г2б: gemeinsam', () => {
  it('Pass: Engine Bild, nur Bildschirm, drei Stufen, feste Sätze, Eingabe Zahl oder Wahl', () => {
    const satz: Partial<Record<FormatId, [string, string]>> = {
      messen: ['Wie lang ist es?', 'zahl'],
      aufgabenfamilie: ['Welche Aufgabe gehört dazu?', 'wahl'],
      'welche-aufgabe': ['Welche Aufgabe passt?', 'wahl'],
      geheimschrift: ['Welcher Buchstabe ist es?', 'wahl'],
    };
    for (const id of G2B) {
      const f = FORMATE[id];
      expect(f.motor).toBe('bild');
      expect(f.druck).toBe(false);
      expect(f.stufen).toBe(3);
      expect(KIND.auftrag[f.auftrag]).toBe(satz[id]![0]);
      for (const { b } of aufgaben(id, 10)) expect(f.eingabe(b)).toEqual({ art: satz[id]![1] });
    }
  });

  it('ohne Antwort kein Inhalt im Nest und keine Hilfe; die Antwort des Kindes sieht im Nest gleich aus, ob sie stimmt', () => {
    for (const id of G2B) {
      const f = FORMATE[id];
      for (const { b, wahl } of aufgaben(id, 40)) {
        const svg0 = f.zeichne(b, { hilfe: 0, gewaehlt: null });
        expect(svg0).not.toContain('data-inhalt');
        expect(svg0).not.toContain('data-hilfe');
        expect(texte(svg0)).toContain('?');
        const l = f.loesungen(b)[0];
        const anders: Antwort = wahl ? wahl.find((w) => !gleich(w, l))! : { art: 'zahl', wert: (l as { wert: number }).wert + 1 };
        const nest = (svg: string) => svg.match(/<(g|text) data-inhalt="".*?<\/\1>/)![0];
        const ohne = (svg: string) => svg.replace(nest(svg), 'X');
        const richtig = f.zeichne(b, { hilfe: 0, gewaehlt: l });
        expect(ohne(richtig)).toBe(ohne(f.zeichne(b, { hilfe: 0, gewaehlt: anders })));
        expect(texte(richtig)).not.toContain('?');
      }
    }
  });

  it('Hilfe 2 hebt einen Teil warm hervor; Hilfe 3 zeigt dazu einen Schritt (an der ähnlichen Aufgabe immer)', () => {
    for (const id of G2B) {
      const f = FORMATE[id];
      for (const { b } of aufgaben(id, 40)) {
        const svg2 = f.zeichne(b, { hilfe: 2, gewaehlt: null });
        expect(svg2, id).toContain('data-hilfe="teil"');
        expect(svg2, id).not.toContain('data-hilfe="schritt"');
        expect(f.zeichne(b, { hilfe: 3, gewaehlt: null, aehnlich: true }), id).toContain('data-hilfe="schritt"');
        if (!f.schrittVerraet?.(b)) expect(f.zeichne(b, { hilfe: 3, gewaehlt: null }), id).toContain('data-hilfe="schritt"');
      }
    }
  });

  it('Wahl: 3 oder 4 verschiedene Perlen, die Lösung genau einmal, an jeder Stelle', () => {
    for (const id of ['aufgabenfamilie', 'welche-aufgabe', 'geheimschrift'] as const) {
      const stellen = new Set<number>();
      for (const { b, wahl } of aufgaben(id, 100)) {
        const l = FORMATE[id].loesungen(b)[0];
        expect([3, 4]).toContain(wahl!.length);
        expect(wahl!.filter((w) => gleich(w, l))).toHaveLength(1);
        stellen.add(wahl!.findIndex((w) => gleich(w, l)));
      }
      expect(stellen.size, id).toBe(4);
    }
  });
});

describe('Messen (Nr. 83)', () => {
  const m = (start: number, laenge: number, lineal = 12): Messen => ({ start, laenge, lineal, beschriftung: 1, farbe: 'rot' });

  it('Grenzfälle: 1 cm, bis an das Ende des Lineals, Anfang nicht bei 0', () => {
    expect(MESSEN.loesungen(m(0, 1))).toEqual([{ art: 'zahl', wert: 1 }]);
    expect(MESSEN.loesungen(m(0, 12))).toEqual([{ art: 'zahl', wert: 12 }]);
    expect(MESSEN.loesungen(m(5, 7))).toEqual([{ art: 'zahl', wert: 7 }]);
  });

  it('Fallen: Ende zwischen zwei Strichen → zwei Antworten; über das Lineal hinaus → keine', () => {
    expect(MESSEN.loesungen(m(0, 4.5))).toHaveLength(2);
    expect(MESSEN.loesungen(m(0.5, 4))).toHaveLength(2);
    expect(MESSEN.loesungen(m(3, 10))).toHaveLength(0);
  });

  it('Stufen: Anfang 0 und alle Zahlen; nur Fünfer; Anfang 1–5; das Lineal reicht über das Stäbchen hinaus; Zahlenraum 10', () => {
    for (const { b, stufe, zahlenraum } of aufgaben<Messen>('messen', 150)) {
      expect(b.start === 0).toBe(stufe < 3);
      expect(b.beschriftung).toBe(stufe === 2 ? 5 : 1);
      if (stufe === 3) expect(b.start >= 1 && b.start <= 5).toBe(true);
      expect(b.lineal).toBeGreaterThan(b.start + b.laenge);
      if (zahlenraum === 10) expect(b.start + b.laenge).toBeLessThanOrEqual(10);
      // am Lineal stehen genau die beschrifteten Zahlen, im Nest „?“
      const zahlen = texte(MESSEN.zeichne(b, { hilfe: 0, gewaehlt: null })).filter((t) => /^\d+$/.test(t)).map(Number);
      expect(zahlen.every((z) => z % b.beschriftung === 0)).toBe(true);
    }
  });

  it('Hilfe 3: so viele warme Zentimeter, wie das Stäbchen lang ist – ohne Zahl', () => {
    for (const { b } of aufgaben<Messen>('messen', 30, [20])) {
      const svg = MESSEN.zeichne(b, { hilfe: 3, gewaehlt: null });
      expect((svg.match(/<rect data-hilfe="schritt"/g) ?? []).length).toBe(b.laenge);
      expect(texte(svg)).toEqual(texte(MESSEN.zeichne(b, { hilfe: 0, gewaehlt: null })));
    }
  });
});

describe('Aufgabenfamilie (Nr. 89)', () => {
  it('Familie aus drei Zahlen: Plus/Minus und Mal/Geteilt, gleich von welcher Aufgabe aus', () => {
    const sortiert = (x: Rechnung[]) => x.map((y) => `${y.links}${y.zeichen}${y.rechts}`).sort();
    expect(sortiert(familie(r(3, 'plus', 7)))).toEqual(sortiert([r(3, 'plus', 7), r(7, 'plus', 3), r(10, 'minus', 3), r(10, 'minus', 7)]));
    expect(sortiert(familie(r(10, 'minus', 7)))).toEqual(sortiert(familie(r(3, 'plus', 7))));
    expect(sortiert(familie(r(15, 'geteilt', 5)))).toEqual(sortiert([r(3, 'mal', 5), r(5, 'mal', 3), r(15, 'geteilt', 3), r(15, 'geteilt', 5)]));
    expect(ergebnis(r(3, 'minus', 7))).toBeNull();
    expect(ergebnis(r(7, 'geteilt', 2))).toBeNull();
  });

  it('Falle: zwei Familienmitglieder unter den Perlen → zwei Lösungen; keins → keine', () => {
    const a = r(3, 'plus', 7);
    expect(AUFGABENFAMILIE.loesungen({ aufgabe: a, perlen: [r(7, 'plus', 3), r(10, 'minus', 3), r(4, 'plus', 7)] })).toHaveLength(2);
    expect(AUFGABENFAMILIE.loesungen({ aufgabe: a, perlen: [r(3, 'plus', 7), r(4, 'plus', 7)] })).toHaveLength(0);
  });

  it('Stufen: 1 – Tauschaufgabe; 2 – Umkehraufgabe; 3 – Minusaufgabe auf dem Schild, bis 100 auch Mal und Geteilt; alles im Zahlenraum', () => {
    let mal = 0;
    for (const { b, stufe, zahlenraum } of aufgaben<Aufgabenfamilie>('aufgabenfamilie', 150)) {
      const l = AUFGABENFAMILIE.loesungen(b)[0] as Extract<Antwort, { art: 'ausdruck' }>;
      if (stufe === 1) expect([b.aufgabe.zeichen, l.zeichen]).toEqual(['plus', 'plus']);
      if (stufe === 2) expect([b.aufgabe.zeichen, l.zeichen]).toEqual(['plus', 'minus']);
      if (stufe === 3) expect(['minus', 'mal', 'geteilt']).toContain(b.aufgabe.zeichen);
      if (['mal', 'geteilt'].includes(b.aufgabe.zeichen)) {
        mal++;
        expect(zahlenraum).toBe(100);
      }
      for (const p of [b.aufgabe, ...b.perlen]) {
        expect(ergebnis(p)).not.toBeNull();
        expect(Math.max(p.links, p.rechts, ergebnis(p)!)).toBeLessThanOrEqual(stufe === 1 ? (zahlenraum === 100 ? 20 : 10) : zahlenraum);
      }
      // die Aufgabe selbst steht nie unter den Perlen
      expect(b.perlen.some((p) => p.links === b.aufgabe.links && p.zeichen === b.aufgabe.zeichen && p.rechts === b.aufgabe.rechts)).toBe(false);
    }
    expect(mal).toBeGreaterThan(30);
  });
});

describe('Welche Aufgabe passt? (Nr. 92)', () => {
  const w = (da: number, aenderung: number, art: 'dazu' | 'weg', perlen: Rechnung[]): WelcheAufgabe => ({ da, aenderung, art, form: 'kreis', farbe: 'rot', perlen });

  it('Beispiel aus dem Brief: 5 da, 2 gehen weg → 5 − 2 unter 5 − 2, 5 + 2, 7 − 2', () => {
    expect(WELCHE_AUFGABE.loesungen(w(5, 2, 'weg', [r(5, 'minus', 2), r(5, 'plus', 2), r(7, 'minus', 2)]))).toEqual([{ art: 'ausdruck', links: 5, zeichen: 'minus', rechts: 2 }]);
    const g = gezaehlt(bild(w(5, 2, 'weg', [])));
    expect([g.da, g.weg, g.dazu, g.sicher]).toEqual([5, 2, 0, true]);
  });

  it('Falle: Aufgabe und Tauschaufgabe bei „dazu“ – beide passen → verworfen', () => {
    expect(WELCHE_AUFGABE.loesungen(w(5, 2, 'dazu', [r(5, 'plus', 2), r(2, 'plus', 5), r(7, 'minus', 2)]))).toHaveLength(2);
  });

  it('Stufen: Zahl der Perlen; Stufe 3 – alle Perlen aus denselben drei Zahlen; nie die Tauschaufgabe; höchstens 20 Dinge', () => {
    for (const { b, stufe, zahlenraum } of aufgaben<WelcheAufgabe>('welche-aufgabe', 150)) {
      expect(b.perlen).toHaveLength(stufe === 1 ? 3 : 4);
      const c = b.art === 'dazu' ? b.da + b.aenderung : b.da - b.aenderung;
      if (stufe === 3) for (const p of b.perlen) expect([b.da, b.aenderung, c]).toEqual(expect.arrayContaining([p.links, p.rechts]));
      if (b.art === 'dazu') expect(b.perlen.some((p) => p.zeichen === 'plus' && p.links === b.aenderung && p.rechts === b.da)).toBe(false);
      expect(b.da + (b.art === 'dazu' ? b.aenderung : 0)).toBeLessThanOrEqual(Math.min(20, stufe === 1 && zahlenraum === 20 ? 10 : zahlenraum));
    }
  });
});

describe('Geheimschrift (Nr. 59)', () => {
  const G = GEHEIMSCHRIFT;
  const zeichen = (form: 'kreis' | 'stern', farbe: 'rot' | 'blau') => ({ form, farbe });

  it('der Löser vergleicht Form UND Farbe; fehlt das Zeichen im Schlüssel, keine Lösung; doppelt mit zwei Buchstaben, zwei', () => {
    const schluessel = [{ zeichen: zeichen('stern', 'rot'), buchstabe: 'T' }, { zeichen: zeichen('stern', 'blau'), buchstabe: 'M' }];
    expect(G.loesungen({ schluessel, schrift: [zeichen('stern', 'blau')], stelle: 0 })).toEqual([{ art: 'buchstabe', wert: 'M' }]);
    expect(G.loesungen({ schluessel, schrift: [zeichen('kreis', 'blau')], stelle: 0 })).toEqual([]);
    expect(G.loesungen({ schluessel: [...schluessel, { zeichen: zeichen('stern', 'blau'), buchstabe: 'A' }], schrift: [zeichen('stern', 'blau')], stelle: 0 })).toHaveLength(2);
  });

  it('Stufen: Paare und Länge der Schrift; Buchstaben verschieden und aus der Liste; Stufe 3 – das Zeichen hat einen Zwilling gleicher Form, sein Buchstabe ist in der Wahl', () => {
    for (const { b, stufe, wahl } of aufgaben<Geheimschrift>('geheimschrift', 150, [20])) {
      const n = b.schluessel.length;
      if (stufe === 1) expect([n, b.schrift.length]).toEqual([3, 1]);
      if (stufe === 2) expect(n === 5 && b.schrift.length >= 3 && b.schrift.length <= 4).toBe(true);
      if (stufe === 3) {
        expect(n >= 6 && n <= 8 && b.schrift.length >= 4).toBe(true);
        const ziel = b.schrift[b.stelle];
        const zwilling = b.schluessel.find((p) => p.zeichen.form === ziel.form && p.zeichen.farbe !== ziel.farbe)!;
        expect(zwilling).toBeDefined();
        expect(wahl!.some((x) => gleich(x, { art: 'buchstabe', wert: zwilling.buchstabe }))).toBe(true);
      }
      expect(new Set(b.schluessel.map((p) => p.buchstabe)).size).toBe(n);
      for (const p of b.schluessel) expect(BUCHSTABEN).toContain(p.buchstabe);
    }
  });
});
