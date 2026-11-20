import { describe, expect, it } from 'vitest';
import { tippe, zahlfeld, type Taste, type Zahlfeld } from '../src/satz/zahleingabe';

/** Zahl in ein Fenster eingeben (docs/PLAN.md, A10; ersetzt die Plätze aus A5) – reine Logik, ohne Bildschirm */

const z = (ziffer: number): Taste => ({ art: 'ziffer', ziffer });
const loeschen: Taste = { art: 'loeschen' };
const folge = (feld: Zahlfeld, ...t: Taste[]): number | null => t.reduce<number | null>((w, x) => tippe(w, x, feld), null);

describe('Feld', () => {
  it('aus Format und Zahlenraum, nie aus der Aufgabe: bis 99, 100 nur bei „bis 100“, eine Stelle nur einstellig', () => {
    expect(zahlfeld({ art: 'zahl' }, 10)).toBe(99);
    expect(zahlfeld({ art: 'zahl' }, 20)).toBe(99);
    expect(zahlfeld({ art: 'zahl' }, 100)).toBe(100);
    expect(zahlfeld({ art: 'zahl', einstellig: true }, 100)).toBe(9);
  });
});

describe('Tippen', () => {
  it('1 und 4 ergeben 14; führende Null verschwindet', () => {
    expect(folge(99, z(1), z(4))).toBe(14);
    expect(folge(99, z(0), z(4))).toBe(4);
    expect(folge(99, z(0))).toBe(0);
  });
  it('passt die Zahl nicht mehr, beginnt sie neu', () => {
    expect(folge(99, z(1), z(4), z(5))).toBe(5);
    expect(folge(100, z(1), z(0), z(0))).toBe(100);
    expect(folge(100, z(1), z(0), z(1))).toBe(1);
    expect(folge(100, z(9), z(9), z(9))).toBe(9);
    expect(folge(9, z(3), z(7))).toBe(7);
  });
  it('Löschen nimmt die letzte Ziffer; leer bleibt leer', () => {
    expect(folge(99, z(1), z(4), loeschen)).toBe(1);
    expect(folge(99, z(1), z(4), loeschen, loeschen)).toBeNull();
    expect(folge(99, loeschen)).toBeNull();
    expect(folge(100, z(1), z(0), z(0), loeschen)).toBe(10);
  });
  it('jede Zahl im Feld ist erreichbar, das Feld sagt nichts über die Antwort', () => {
    for (const feld of [99, 100] as Zahlfeld[])
      for (let n = 0; n <= feld; n++) expect(folge(feld, ...[...String(n)].map((c) => z(Number(c))))).toBe(n);
  });
});
