import { describe, expect, it } from 'vitest';
import { anzahlPlaetze, ausWert, leer, schritt, stellenwerte, wertVon, type Handlung, type Plaetze } from '../src/satz/zahleingabe';

/** Zahl in die Plätze eingeben (docs/PLAN.md, A5) – reine Logik, ohne Bildschirm */

const z = (ziffer: number): Handlung => ({ art: 'ziffer', ziffer });
const platz = (p: number): Handlung => ({ art: 'platz', platz: p });
const loeschen: Handlung = { art: 'loeschen' };
const tippe = (max: number, ...h: Handlung[]): Plaetze => h.reduce((p, x) => schritt(p, x, max), leer(max));
/** Plätze bis 20: 0 = Z, 1 = E */
const Z = 0;
const E = 1;

describe('Plätze: wie viele, welche', () => {
  it('unter 10 ein Platz, bis 99 zwei, ab 100 drei', () => {
    expect(anzahlPlaetze(9)).toBe(1);
    expect(anzahlPlaetze(10)).toBe(2);
    expect(anzahlPlaetze(20)).toBe(2);
    expect(anzahlPlaetze(99)).toBe(2);
    expect(anzahlPlaetze(100)).toBe(3);
    expect(stellenwerte(5)).toEqual(['E']);
    expect(stellenwerte(20)).toEqual(['Z', 'E']);
    expect(stellenwerte(100)).toEqual(['H', 'Z', 'E']);
  });

  it('nach Neuladen: gespeicherte Zahl rechtsbündig, nichts gewählt', () => {
    expect(ausWert(14, 20)).toEqual({ stellen: [1, 4], gewaehlt: null, zuletzt: null });
    expect(ausWert(7, 20).stellen).toEqual([null, 7]);
    expect(ausWert(100, 100).stellen).toEqual([1, 0, 0]);
    expect(ausWert(null, 20).stellen).toEqual([null, null]);
    for (const w of [0, 5, 10, 19, 20]) expect(wertVon(ausWert(w, 20))).toBe(w);
  });
});

describe('gewöhnliches Tippen', () => {
  it('1 und 4 ergeben 14: die erste Ziffer geht in E, die zweite schiebt sie nach Z', () => {
    expect(tippe(20, z(1)).stellen).toEqual([null, 1]);
    expect(wertVon(tippe(20, z(1)))).toBe(1);
    const p = tippe(20, z(1), z(4));
    expect(p.stellen).toEqual([1, 4]);
    expect(wertVon(p)).toBe(14);
  });

  it('die dritte Ziffer beginnt die Zahl neu', () => {
    expect(tippe(20, z(1), z(4), z(7)).stellen).toEqual([null, 7]);
    expect(tippe(99, z(4), z(2), z(5)).stellen).toEqual([null, 5]);
    // bis 100: nur 100 hat drei Ziffern – 1, 4, 5 beginnt neu, nach 100 auch
    expect(wertVon(tippe(100, z(1), z(4), z(5)))).toBe(5);
    expect(wertVon(tippe(100, z(1), z(0), z(0), z(3)))).toBe(3);
  });

  it('bis 100: 1, 0, 0 ergibt 100 (1 Hunderter, 0 Zehner, 0 Einer)', () => {
    const p = tippe(100, z(1), z(0), z(0));
    expect(p.stellen).toEqual([1, 0, 0]);
    expect(wertVon(p)).toBe(100);
  });

  it('größer als max wird nicht eingegeben: die Zahl beginnt neu', () => {
    // bis 20: 2 dann 5 gäbe 25
    expect(wertVon(tippe(20, z(2), z(5)))).toBe(5);
    expect(wertVon(tippe(10, z(1), z(1)))).toBe(1);
    expect(wertVon(tippe(10, z(1), z(0)))).toBe(10);
    // ein Platz bis 5: 7 geht nicht
    expect(wertVon(tippe(5, z(7)))).toBeNull();
    expect(wertVon(tippe(5, z(3), z(7)))).toBe(3);
    // bis 100: kein Wert über 100
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
    expect(tippe(20, z(0), z(5)).stellen).toEqual([null, 5]);
    expect(tippe(20, z(0), z(0)).stellen).toEqual([null, 0]);
    expect(wertVon(tippe(20, z(0), z(0)))).toBe(0);
  });
});

describe('Platz wählen', () => {
  it('Platz E, 4, Platz Z, 1 ergeben 14', () => {
    const p = tippe(20, platz(E), z(4));
    expect(p.stellen).toEqual([null, 4]);
    // E ersetzt, Z ist leer → die Wahl geht von selbst auf Z
    expect(p.gewaehlt).toBe(Z);
    const q = tippe(20, platz(E), z(4), platz(Z), z(1));
    expect(q.stellen).toEqual([1, 4]);
    expect(wertVon(q)).toBe(14);
    // beide belegt → nichts mehr gewählt
    expect(q.gewaehlt).toBeNull();
    // ohne den Tipp auf Z dasselbe
    expect(wertVon(tippe(20, platz(E), z(4), z(1)))).toBe(14);
  });

  it('Platz Z, 1, dann 4 ergeben 14; mit nur Z belegt gibt es noch keine Zahl', () => {
    const p = tippe(20, platz(Z), z(1));
    expect(p.stellen).toEqual([1, null]);
    expect(wertVon(p)).toBeNull();
    expect(p.gewaehlt).toBe(E);
    expect(wertVon(schritt(p, z(4), 20))).toBe(14);
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
    expect(tippe(20, platz(Z)).gewaehlt).toBe(Z);
    expect(tippe(20, platz(Z), platz(Z)).gewaehlt).toBe(Z);
    expect(tippe(20, platz(Z), platz(E)).gewaehlt).toBe(E);
    // Wahl allein ändert keine Ziffer
    expect(tippe(20, z(1), z(4), platz(Z)).stellen).toEqual([1, 4]);
  });

  it('größer als max: die Ziffer im gewählten Platz ändert nichts', () => {
    const p = tippe(20, z(1), z(4), platz(Z));
    // 34 und 24 wären größer als 20: die 14 bleibt
    expect(schritt(p, z(3), 20)).toEqual(p);
    expect(schritt(p, z(2), 20)).toEqual(p);
    expect(wertVon(schritt(p, z(2), 20))).toBe(14);
    // leeres E: Z = 2 geht (20 ist möglich), Z = 3 nicht
    expect(tippe(20, platz(Z), z(3)).stellen).toEqual([null, null]);
    expect(tippe(20, platz(Z), z(2)).stellen).toEqual([2, null]);
    // dann ist nur 0 in E möglich: 20
    expect(wertVon(tippe(20, platz(Z), z(2), z(5)))).toBeNull();
    expect(wertVon(tippe(20, platz(Z), z(2), z(0)))).toBe(20);
  });

  it('bis 100: 100 auch über die Plätze; H nimmt nur, was 100 nicht übersteigt', () => {
    const H = 0;
    expect(wertVon(tippe(100, platz(H), z(1), z(0), z(0)))).toBe(100);
    expect(tippe(100, platz(H), z(2)).stellen).toEqual([null, null, null]);
    expect(tippe(100, z(4), z(5), platz(H), z(1)).stellen).toEqual([null, 4, 5]);
  });

  it('Null in Z bei belegtem E wird zur einstelligen Zahl', () => {
    const p = tippe(20, z(1), z(4), platz(Z), z(0));
    expect(p.stellen).toEqual([null, 4]);
    expect(wertVon(p)).toBe(4);
    // erst Z = 0, dann E = 4: auch 4
    const q = tippe(20, platz(Z), z(0));
    expect(q.stellen).toEqual([0, null]);
    expect(wertVon(q)).toBeNull();
    expect(schritt(q, z(4), 20).stellen).toEqual([null, 4]);
  });
});

describe('Löschen', () => {
  it('ohne Wahl: die zuletzt getippte Ziffer, die anderen bleiben an ihrem Platz', () => {
    const p = tippe(20, z(1), z(4), loeschen);
    expect(p.stellen).toEqual([1, null]);
    expect(wertVon(p)).toBeNull();
    // die nächste Ziffer füllt E: 15
    expect(wertVon(schritt(p, z(5), 20))).toBe(15);
    // nochmal Löschen: leer
    expect(schritt(p, loeschen, 20).stellen).toEqual([null, null]);
    // zuletzt in Z getippt (E zuerst): Löschen nimmt die Ziffer in Z
    expect(tippe(20, platz(E), z(4), z(1), loeschen).stellen).toEqual([null, 4]);
    // nach Neuladen (zuletzt unbekannt): die rechteste Ziffer
    expect(schritt(ausWert(14, 20), loeschen, 20).stellen).toEqual([1, null]);
    // leer bleibt leer
    expect(schritt(leer(20), loeschen, 20)).toEqual(leer(20));
  });

  it('mit Wahl: nur der gewählte Platz, die Wahl bleibt', () => {
    const p = tippe(20, z(1), z(4), platz(Z), loeschen);
    expect(p.stellen).toEqual([null, 4]);
    expect(wertVon(p)).toBe(4);
    expect(p.gewaehlt).toBe(Z);
    const q = tippe(20, z(1), z(4), platz(E), loeschen);
    expect(q.stellen).toEqual([1, null]);
    expect(q.gewaehlt).toBe(E);
    // gleich die Ersatzziffer: 12
    expect(wertVon(schritt(q, z(2), 20))).toBe(12);
  });

  it('gewählter Platz leer (Wahl ist von selbst weitergegangen): die zuletzt getippte Ziffer', () => {
    // E, 4 → die Wahl steht auf dem leeren Z; Löschen nimmt die 4
    const p = tippe(20, platz(E), z(4), loeschen);
    expect(p.stellen).toEqual([null, null]);
    // alles leer: keine Wahl mehr, die nächste Ziffer geht wieder in E
    expect(p.gewaehlt).toBeNull();
    expect(schritt(p, z(7), 20).stellen).toEqual([null, 7]);
    // 10, Platz Z, zweimal Löschen, 7 → 7 (nicht 70)
    expect(wertVon(tippe(20, z(1), z(0), platz(Z), loeschen, loeschen, z(7)))).toBe(7);
  });

  it('bis 100: H aus 100 löschen ergibt 0 (Null in Z bei belegtem E)', () => {
    const p = tippe(100, z(1), z(0), z(0), platz(0), loeschen);
    expect(p.stellen).toEqual([null, null, 0]);
    expect(wertVon(p)).toBe(0);
  });
});
