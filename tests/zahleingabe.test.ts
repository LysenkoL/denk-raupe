import { describe, expect, it } from 'vitest';
import { anzahlPlaetze, ausWert, leer, schritt, stellenwerte, wertVon, zahlfeld, type Handlung, type Plaetze, type Zahlfeld } from '../src/satz/zahleingabe';

/** Zahl in die Plätze eingeben (docs/PLAN.md, A5) – reine Logik, ohne Bildschirm */

const z = (ziffer: number): Handlung => ({ art: 'ziffer', ziffer });
const platz = (p: number): Handlung => ({ art: 'platz', platz: p });
const loeschen: Handlung = { art: 'loeschen' };
const tippe = (feld: Zahlfeld, ...h: Handlung[]): Plaetze => h.reduce((p, x) => schritt(p, x, feld), leer(feld));
/** Plätze bei Z und E: 0 = Z, 1 = E */
const Z = 0;
const E = 1;

describe('Plätze: wie viele, welche', () => {
  it('Feld aus Format und Zahlenraum, nie aus der Aufgabe: Z und E bis 99, H nur bei „bis 100“, E allein nur einstellig', () => {
    expect(zahlfeld({ art: 'zahl' }, 10)).toBe(99);
    expect(zahlfeld({ art: 'zahl' }, 20)).toBe(99);
    expect(zahlfeld({ art: 'zahl' }, 100)).toBe(100);
    expect(zahlfeld({ art: 'zahl', einstellig: true }, 100)).toBe(9);
    expect(anzahlPlaetze(9)).toBe(1);
    expect(anzahlPlaetze(99)).toBe(2);
    expect(anzahlPlaetze(100)).toBe(3);
    expect(stellenwerte(9)).toEqual(['E']);
    expect(stellenwerte(99)).toEqual(['Z', 'E']);
    expect(stellenwerte(100)).toEqual(['H', 'Z', 'E']);
  });

  it('nach Neuladen: gespeicherte Zahl rechtsbündig, nichts gewählt', () => {
    expect(ausWert(14, 99)).toEqual({ stellen: [1, 4], gewaehlt: null, zuletzt: null });
    expect(ausWert(7, 99).stellen).toEqual([null, 7]);
    expect(ausWert(100, 100).stellen).toEqual([1, 0, 0]);
    expect(ausWert(null, 99).stellen).toEqual([null, null]);
    for (const w of [0, 5, 10, 19, 20, 99]) expect(wertVon(ausWert(w, 99))).toBe(w);
  });
});

describe('gewöhnliches Tippen', () => {
  it('1 und 4 ergeben 14: die erste Ziffer geht in E, die zweite schiebt sie nach Z', () => {
    expect(tippe(99, z(1)).stellen).toEqual([null, 1]);
    expect(wertVon(tippe(99, z(1)))).toBe(1);
    const p = tippe(99, z(1), z(4));
    expect(p.stellen).toEqual([1, 4]);
    expect(wertVon(p)).toBe(14);
  });

  it('die dritte Ziffer beginnt die Zahl neu', () => {
    expect(tippe(99, z(1), z(4), z(7)).stellen).toEqual([null, 7]);
    expect(tippe(99, z(9), z(9), z(5)).stellen).toEqual([null, 5]);
    // bis 100: nur 100 hat drei Ziffern – 1, 4, 5 beginnt neu, nach 100 auch
    expect(wertVon(tippe(100, z(1), z(4), z(5)))).toBe(5);
    expect(wertVon(tippe(100, z(1), z(0), z(0), z(3)))).toBe(3);
  });

  it('bis 100: 1, 0, 0 ergibt 100 (1 Hunderter, 0 Zehner, 0 Einer)', () => {
    const p = tippe(100, z(1), z(0), z(0));
    expect(p.stellen).toEqual([1, 0, 0]);
    expect(wertVon(p)).toBe(100);
  });

  it('harte Regel 7: jede Zahl des Feldes lässt sich tippen, keine darüber', () => {
    const felder: Zahlfeld[] = [9, 99, 100];
    for (const feld of felder)
      for (let w = 0; w <= feld; w++) {
        const p = tippe(feld, ...[...String(w)].map((d) => z(Number(d))));
        expect(wertVon(p), `${w} im Feld ${feld}`).toBe(w);
        expect(p.stellen.length).toBe(anzahlPlaetze(feld));
      }
    // auch über die Plätze, in jeder Reihenfolge: E zuerst, dann Z
    for (let w = 10; w <= 99; w++) expect(wertVon(tippe(99, platz(E), z(w % 10), platz(Z), z(Math.floor(w / 10))))).toBe(w);
    // bis 100: kein Wert über 100 – 1, 4, 5 beginnt neu
    expect(wertVon(tippe(100, z(1), z(4), z(5)))).toBe(5);
    for (let a = 0; a < 10; a++) for (let b = 0; b < 10; b++) for (let c = 0; c < 10; c++) {
      const w = wertVon(tippe(100, z(a), z(b), z(c)));
      expect(w === null || w <= 100).toBe(true);
    }
  });

  it('ein Platz bei Antworten bis 9: jede Ziffer ersetzt die vorige', () => {
    const p = tippe(9, z(3));
    expect(p.stellen).toEqual([3]);
    expect(tippe(9, z(3), z(8)).stellen).toEqual([8]);
    expect(wertVon(tippe(9, z(0)))).toBe(0);
  });

  it('führende Null: 0 dann 5 ist 5, 0 dann 0 ist 0', () => {
    expect(tippe(99, z(0), z(5)).stellen).toEqual([null, 5]);
    expect(tippe(99, z(0), z(0)).stellen).toEqual([null, 0]);
    expect(wertVon(tippe(99, z(0), z(0)))).toBe(0);
  });
});

describe('Platz wählen', () => {
  it('Platz E, 4, Platz Z, 1 ergeben 14', () => {
    const p = tippe(99, platz(E), z(4));
    expect(p.stellen).toEqual([null, 4]);
    // E ersetzt, Z ist leer → die Wahl geht von selbst auf Z
    expect(p.gewaehlt).toBe(Z);
    const q = tippe(99, platz(E), z(4), platz(Z), z(1));
    expect(q.stellen).toEqual([1, 4]);
    expect(wertVon(q)).toBe(14);
    // beide belegt → nichts mehr gewählt
    expect(q.gewaehlt).toBeNull();
    // ohne den Tipp auf Z dasselbe
    expect(wertVon(tippe(99, platz(E), z(4), z(1)))).toBe(14);
  });

  it('Platz Z, 1, dann 4 ergeben 14; mit nur Z belegt gibt es noch keine Zahl', () => {
    const p = tippe(99, platz(Z), z(1));
    expect(p.stellen).toEqual([1, null]);
    expect(wertVon(p)).toBeNull();
    expect(p.gewaehlt).toBe(E);
    expect(wertVon(schritt(p, z(4), 99))).toBe(14);
  });

  it('eine Ziffer ersetzen: 14 → Platz Z, 2 → 24; danach ist nichts gewählt', () => {
    const p = tippe(99, z(1), z(4), platz(Z), z(2));
    expect(p.stellen).toEqual([2, 4]);
    expect(wertVon(p)).toBe(24);
    expect(p.gewaehlt).toBeNull();
    // Einer ersetzen: 14 → Platz E, 7 → 17
    expect(wertVon(tippe(99, z(1), z(4), platz(E), z(7)))).toBe(17);
    // gespeicherte Zahl nach Neuladen
    expect(wertVon(schritt(schritt(ausWert(42, 99), platz(Z), 99), z(2), 99))).toBe(22);
  });

  it('Tipp auf einen Platz wählt ihn, auch wenn er schon gewählt ist', () => {
    expect(tippe(99, platz(Z)).gewaehlt).toBe(Z);
    expect(tippe(99, platz(Z), platz(Z)).gewaehlt).toBe(Z);
    expect(tippe(99, platz(Z), platz(E)).gewaehlt).toBe(E);
    // Wahl allein ändert keine Ziffer
    expect(tippe(99, z(1), z(4), platz(Z)).stellen).toEqual([1, 4]);
  });

  it('im gewählten Platz geht jede Ziffer: 14 → Platz Z, 9 → 94', () => {
    for (let d = 0; d <= 9; d++) expect(wertVon(tippe(99, z(1), z(4), platz(Z), z(d)))).toBe(d * 10 + 4);
    for (let d = 0; d <= 9; d++) expect(wertVon(tippe(99, z(1), z(4), platz(E), z(d)))).toBe(10 + d);
  });

  it('bis 100: 100 auch über die Plätze; H nimmt nur, was 100 nicht übersteigt', () => {
    const H = 0;
    expect(wertVon(tippe(100, platz(H), z(1), z(0), z(0)))).toBe(100);
    expect(tippe(100, platz(H), z(2)).stellen).toEqual([null, null, null]);
    expect(tippe(100, z(4), z(5), platz(H), z(1)).stellen).toEqual([null, 4, 5]);
  });

  it('Null in Z bei belegtem E wird zur einstelligen Zahl', () => {
    const p = tippe(99, z(1), z(4), platz(Z), z(0));
    expect(p.stellen).toEqual([null, 4]);
    expect(wertVon(p)).toBe(4);
    // erst Z = 0, dann E = 4: auch 4
    const q = tippe(99, platz(Z), z(0));
    expect(q.stellen).toEqual([0, null]);
    expect(wertVon(q)).toBeNull();
    expect(schritt(q, z(4), 99).stellen).toEqual([null, 4]);
  });
});

describe('Löschen', () => {
  it('ohne Wahl: die zuletzt getippte Ziffer, die anderen bleiben an ihrem Platz', () => {
    const p = tippe(99, z(1), z(4), loeschen);
    expect(p.stellen).toEqual([1, null]);
    expect(wertVon(p)).toBeNull();
    // die nächste Ziffer füllt E: 15
    expect(wertVon(schritt(p, z(5), 99))).toBe(15);
    // nochmal Löschen: leer
    expect(schritt(p, loeschen, 99).stellen).toEqual([null, null]);
    // zuletzt in Z getippt (E zuerst): Löschen nimmt die Ziffer in Z
    expect(tippe(99, platz(E), z(4), z(1), loeschen).stellen).toEqual([null, 4]);
    // nach Neuladen (zuletzt unbekannt): die rechteste Ziffer
    expect(schritt(ausWert(14, 99), loeschen, 99).stellen).toEqual([1, null]);
    // leer bleibt leer
    expect(schritt(leer(99), loeschen, 99)).toEqual(leer(99));
  });

  it('mit Wahl: nur der gewählte Platz, die Wahl bleibt', () => {
    const p = tippe(99, z(1), z(4), platz(Z), loeschen);
    expect(p.stellen).toEqual([null, 4]);
    expect(wertVon(p)).toBe(4);
    expect(p.gewaehlt).toBe(Z);
    const q = tippe(99, z(1), z(4), platz(E), loeschen);
    expect(q.stellen).toEqual([1, null]);
    expect(q.gewaehlt).toBe(E);
    // gleich die Ersatzziffer: 12
    expect(wertVon(schritt(q, z(2), 99))).toBe(12);
  });

  it('gewählter Platz leer (Wahl ist von selbst weitergegangen): die zuletzt getippte Ziffer', () => {
    // E, 4 → die Wahl steht auf dem leeren Z; Löschen nimmt die 4
    const p = tippe(99, platz(E), z(4), loeschen);
    expect(p.stellen).toEqual([null, null]);
    // alles leer: keine Wahl mehr, die nächste Ziffer geht wieder in E
    expect(p.gewaehlt).toBeNull();
    expect(schritt(p, z(7), 99).stellen).toEqual([null, 7]);
    // 10, Platz Z, zweimal Löschen, 7 → 7 (nicht 70)
    expect(wertVon(tippe(99, z(1), z(0), platz(Z), loeschen, loeschen, z(7)))).toBe(7);
  });

  it('bis 100: H aus 100 löschen ergibt 0 (Null in Z bei belegtem E)', () => {
    const p = tippe(100, z(1), z(0), z(0), platz(0), loeschen);
    expect(p.stellen).toEqual([null, null, 0]);
    expect(wertVon(p)).toBe(0);
  });
});
