import { describe, expect, it } from 'vitest';
import { FORMATE } from '../src/aufgaben';
import { aufgabeAus, ZAHLENRAEUME, type FormatId, type Zahlenraum } from '../src/aufgaben/format';
import { gleich, type Antwort } from '../src/perlen/antwort';
import { KIND } from '../src/i18n/kind';
import { UHR, ablesen, tagesStunde, uhrFuer, type Uhr } from '../src/aufgaben/uhr';
import { GELD, hilfePunkte, type Geld } from '../src/aufgaben/geld';
import { zaehlePunkte } from '../src/aufgaben/zaehlen';

/**
 * Gruppe Г2в (Engine Bild): Nr. 18 Uhr (Antwort Wahl einer Uhrzeit), Nr. 17 Geld (Antwort Zahl in ganzen Euro) –
 * Fallen für den Löser, Grenzfälle, Stufen, Hilfe auf dem Bild, das Bild verrät nichts.
 * (10 000 Aufgaben je Stufe und Zahlenraum, Pass: tests/formate.test.ts; Lernbeispiel: tests/lernbeispiel.test.ts;
 * Bildschirm: tests/satz.test.ts.)
 */

const texte = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
const zeit = (stunde: number, minute: number): Antwort => ({ art: 'zeit', stunde, minute });

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

describe('Г2в: gemeinsam', () => {
  it('Pass und Sätze: Uhr – Wahl, „Wie spät ist es?“; Geld – Zahl, „Wie viel Euro sind es?“', () => {
    expect([UHR.motor, UHR.druck, UHR.stufen, KIND.auftrag[UHR.auftrag]]).toEqual(['bild', false, 3, 'Wie spät ist es?']);
    expect([GELD.motor, GELD.druck, GELD.stufen, KIND.auftrag[GELD.auftrag]]).toEqual(['bild', false, 3, 'Wie viel Euro sind es?']);
    expect(UHR.eingabe(uhrFuer(3, 0))).toEqual({ art: 'wahl' });
    expect(GELD.eingabe({ stuecke: [1], preis: null })).toEqual({ art: 'zahl' });
  });

  it('ohne Antwort kein Inhalt im Nest und keine Hilfe; Hilfe 2 und 3 schreiben keine neue Zahl; die Antwort des Kindes sieht gleich aus, ob sie stimmt', () => {
    for (const id of ['uhr', 'geld'] as const) {
      const f = FORMATE[id];
      for (const { b, wahl } of aufgaben(id, 40)) {
        const svg0 = f.zeichne(b, { hilfe: 0, gewaehlt: null });
        expect(svg0).not.toContain('data-inhalt');
        expect(svg0).not.toContain('data-hilfe');
        expect(texte(svg0)).toContain('?');
        for (const hilfe of [2, 3] as const) expect(texte(f.zeichne(b, { hilfe, gewaehlt: null }))).toEqual(texte(svg0));
        const l = f.loesungen(b)[0];
        const anders: Antwort = wahl ? wahl.find((w) => !gleich(w, l))! : { art: 'zahl', wert: (l as { wert: number }).wert + 1 };
        const ohne = (svg: string) => svg.replace(/<text data-inhalt=""[^>]*>[^<]*<\/text>/, 'X');
        expect(ohne(f.zeichne(b, { hilfe: 0, gewaehlt: l }))).toBe(ohne(f.zeichne(b, { hilfe: 0, gewaehlt: anders })));
      }
    }
  });

  it('Hilfe 2 hebt einen Teil hervor; Hilfe 3 zeigt einen Schritt (an der ähnlichen Aufgabe immer)', () => {
    for (const id of ['uhr', 'geld'] as const) {
      const f = FORMATE[id];
      for (const { b } of aufgaben(id, 40)) {
        const svg2 = f.zeichne(b, { hilfe: 2, gewaehlt: null });
        expect(svg2).toContain('data-hilfe="teil"');
        expect(svg2).not.toContain('data-hilfe="schritt"');
        expect(f.zeichne(b, { hilfe: 3, gewaehlt: null, aehnlich: true })).toContain('data-hilfe="schritt"');
        if (!f.schrittVerraet?.(b)) expect(f.zeichne(b, { hilfe: 3, gewaehlt: null })).toContain('data-hilfe="schritt"');
      }
    }
  });
});

describe('Uhr (Nr. 18)', () => {
  it('Ablesen: jede Viertelstunde auf dem Zifferblatt; 12 statt 0', () => {
    for (let h = 0; h < 12; h++) for (const m of [0, 15, 30, 45]) expect(ablesen(uhrFuer(h, m))).toEqual({ stunde: h || 12, minute: m });
    expect(UHR.loesungen(uhrFuer(12, 0))).toEqual([zeit(12, 0)]);
    expect(UHR.loesungen(uhrFuer(7, 30))).toEqual([zeit(7, 30)]);
  });

  it('Fallen: Zeiger passen nicht zusammen (halb, aber kleiner Zeiger genau auf der Zahl) → keine Lösung; Minuten nicht auf einem Viertel → keine', () => {
    expect(UHR.loesungen({ stundenWinkel: 7 * 30, minutenWinkel: 180, tageszeit: 'keine' })).toEqual([]);
    expect(UHR.loesungen({ stundenWinkel: 7 * 30 + 5, minutenWinkel: 60, tageszeit: 'keine' })).toEqual([]);
  });

  it('Sonne und Mond: Nachmittag +12, Vormittag bleibt, Mond am Abend +12; Grenzstunden sind nicht eindeutig', () => {
    expect([3, 5, 9, 11].map((h) => tagesStunde(h, 'sonne'))).toEqual([15, 17, 9, 11]);
    expect([8, 11].map((h) => tagesStunde(h, 'mond'))).toEqual([20, 23]);
    for (const h of [6, 7, 12]) {
      expect(tagesStunde(h, 'sonne')).toBeNull();
      expect(tagesStunde(h, 'mond')).toBeNull();
    }
    expect(UHR.loesungen(uhrFuer(3, 0, 'sonne'))).toEqual([zeit(15, 0)]);
    expect(UHR.loesungen(uhrFuer(7, 0, 'sonne'))).toEqual([]);
  });

  it('Stufen: 1 – volle und halbe Stunden, drei Perlen; 2 – auch Viertel; 3 – Sonne oder Mond, darunter dieselbe Zeit ohne Tageszeit', () => {
    let viertel = 0;
    for (const { b, stufe, wahl } of aufgaben<Uhr>('uhr', 150, [20])) {
      const a = ablesen(b)!;
      const l = UHR.loesungen(b)[0] as Extract<Antwort, { art: 'zeit' }>;
      if (stufe === 1) {
        expect([0, 30]).toContain(a.minute);
        expect(b.tageszeit).toBe('keine');
        expect(wahl).toHaveLength(3);
        // halb 8 ≠ 8:30: die Stunde danach (vor) liegt in der Wahl
        if (a.minute === 30) expect(wahl!.some((w) => gleich(w, zeit((a.stunde % 12) + 1, 30)))).toBe(true);
      }
      if (stufe === 2 && [15, 45].includes(a.minute)) viertel++;
      if (stufe === 3) {
        expect(b.tageszeit).not.toBe('keine');
        if (l.stunde !== a.stunde) expect(wahl!.some((w) => gleich(w, zeit(a.stunde, a.minute)))).toBe(true);
      }
      expect(UHR.schrittVerraet!(b)).toBe(a.minute === 0);
    }
    expect(viertel).toBeGreaterThan(70);
  });
});

describe('Geld (Nr. 17)', () => {
  it('Grenzfälle: eine Münze, nur Scheine, großes Rückgeld', () => {
    expect(GELD.loesungen({ stuecke: [1], preis: null })).toEqual([{ art: 'zahl', wert: 1 }]);
    expect(GELD.loesungen({ stuecke: [50, 20, 20, 10], preis: null })).toEqual([{ art: 'zahl', wert: 100 }]);
    expect(GELD.loesungen({ stuecke: [50], preis: 1 })).toEqual([{ art: 'zahl', wert: 49 }]);
  });

  it('Falle: bezahlt ist nicht mehr als der Preis → kein Rückgeld, keine Lösung', () => {
    expect(GELD.loesungen({ stuecke: [10], preis: 10 })).toEqual([]);
    expect(GELD.loesungen({ stuecke: [5], preis: 7 })).toEqual([]);
  });

  it('Stufen: 1 – nur 1 € und 2 €, sortiert, bis 10; 2 – Münzen und Scheine, bis zum Zahlenraum; 3 – Rückgeld mit einem Schein', () => {
    for (const { b, stufe, zahlenraum } of aufgaben<Geld>('geld', 150)) {
      const n = (GELD.loesungen(b)[0] as { wert: number }).wert;
      if (stufe === 1) {
        expect(b.stuecke.every((w) => w <= 2)).toBe(true);
        expect([...b.stuecke].sort((x, y) => y - x)).toEqual(b.stuecke);
        expect(n).toBeLessThanOrEqual(10);
      }
      if (stufe === 2) {
        expect(b.stuecke.some((w) => w >= 5) && b.stuecke.some((w) => w < 5)).toBe(true);
        expect(n).toBeLessThanOrEqual(zahlenraum);
        if (zahlenraum < 100) expect(b.stuecke.every((w) => w <= 10)).toBe(true);
      }
      if (stufe === 3) {
        expect(b.stuecke).toHaveLength(1);
        expect(b.preis).not.toBeNull();
        expect(b.stuecke[0]).toBeLessThanOrEqual(zahlenraum);
      }
    }
  });

  it('Hilfe 3: ein Punkt je Euro; beim Rückgeld ist der Preis durchgestrichen, übrig bleibt das Rückgeld', () => {
    expect(zaehlePunkte(hilfePunkte({ stuecke: [5, 2, 1], preis: null }))).toEqual({ erster: 6, zweiter: 2, leer: 0, weg: 0 });
    expect(zaehlePunkte(hilfePunkte({ stuecke: [10], preis: 7 }))).toEqual({ erster: 3, zweiter: 0, leer: 0, weg: 7 });
  });
});
