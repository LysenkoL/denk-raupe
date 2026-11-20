import { describe, expect, it } from 'vitest';
import { FORMATE } from '../src/aufgaben';
import { aufgabeAus, ZAHLENRAEUME, type FormatId, type Zahlenraum } from '../src/aufgaben/format';
import { gleich, type Antwort } from '../src/perlen/antwort';
import { KIND } from '../src/i18n/kind';
import { MUSTER_FEHLER, fehlerPlaetze, periode, type MusterFehler } from '../src/aufgaben/muster-fehler';
import { PASST_NICHT, herausgehoben, type Ding, type PasstNicht } from '../src/aufgaben/passt-nicht';
import { ZWEI_KREISE, stelleVon, type ZweiKreise } from '../src/aufgaben/zwei-kreise';
import { SPIEGEL, type Spiegel } from '../src/aufgaben/spiegel';
import { DREHEN, type Drehen } from '../src/aufgaben/drehen';
import { SPIEGELACHSE, symmetrisch, type Spiegelachse } from '../src/aufgaben/spiegelachse';
import { DIAGRAMM, type Diagramm } from '../src/aufgaben/diagramm';
import { MAUER_FEHLER, reparierbar, type MauerFehler } from '../src/aufgaben/mauer-fehler';
import { drehungen, spiegelLR, zuschneiden, gleichesGitter } from '../src/aufgaben/zellen';

/**
 * Gruppe Г3 (Engine Auswahl): Nr. 20, 26, 27, 35, 36, 79, 84, 95 – Tippen auf ein Ding im Bild. Fallen aus
 * docs/LOESER.md, Grenzfälle, Stufen, Hilfe auf dem Bild. (10 000 Aufgaben je Stufe: tests/formate.test.ts;
 * „Hilfe lässt nie nur die richtige Antwort sichtbar“: tests/bereit.test.ts; Bildschirm: tests/satz.test.ts.)
 */

const G3: FormatId[] = ['muster-fehler', 'passt-nicht', 'zwei-kreise', 'spiegel', 'drehen', 'spiegelachse', 'diagramm', 'mauer-fehler'];

function aufgaben<B>(id: FormatId, n = 150, raeume: readonly Zahlenraum[] = [20]): { b: B; stufe: number; zahlenraum: Zahlenraum; wahl: Antwort[] }[] {
  const f = FORMATE[id];
  const out: { b: B; stufe: number; zahlenraum: Zahlenraum; wahl: Antwort[] }[] = [];
  for (const zahlenraum of raeume)
    for (let stufe = 1; stufe <= f.stufen; stufe++)
      for (let s = 0; s < n; s++) {
        const a = aufgabeAus(f, s * 40503 + stufe, stufe, { zahlenraum });
        out.push({ b: a.bedingung as B, stufe, zahlenraum, wahl: a.wahl! });
      }
  return out;
}

describe('Г3: gemeinsam', () => {
  it('Pass: Engine Auswahl, Antwort durch Tippen ins Bild, feste Sätze', () => {
    for (const id of G3) {
      const f = FORMATE[id];
      expect([f.motor, f.druck, f.stufen]).toEqual(['auswahl', false, 3]);
      expect(KIND.auftrag[f.auftrag].trim()).not.toBe('');
      for (const { b, wahl } of aufgaben(id, 5)) {
        expect(f.eingabe(b)).toEqual({ art: 'bild' });
        // jedes Wahlziel ist im Bild antippbar
        const svg = f.zeichne(b, { hilfe: 0, gewaehlt: null });
        for (let k = 0; k < wahl.length; k++) expect(svg, `${id} Ziel ${k}`).toContain(`data-wahl="${k}"`);
      }
    }
  });

  it('ohne Wahl nichts markiert, keine Hilfe; die Markierung der Wahl sieht gleich aus, ob sie stimmt', () => {
    for (const id of G3) {
      const f = FORMATE[id];
      for (const { b, wahl } of aufgaben(id, 20)) {
        const svg0 = f.zeichne(b, { hilfe: 0, gewaehlt: null });
        expect(svg0).not.toContain('data-inhalt');
        expect(svg0).not.toContain('data-hilfe');
        const l = f.loesungen(b)[0];
        const anders = wahl.find((w) => !gleich(w, l))!;
        const r = f.zeichne(b, { hilfe: 0, gewaehlt: l });
        const a = f.zeichne(b, { hilfe: 0, gewaehlt: anders });
        expect(r).toContain('data-inhalt');
        expect(a).toContain('data-inhalt');
        // gleich viele Markierungen, gleiche Art (Fokusfarbe)
        expect((r.match(/data-inhalt/g) ?? []).length).toBe((a.match(/data-inhalt/g) ?? []).length);
      }
    }
  });

  it('Hilfe 2 hebt hervor, Hilfe 3 zeigt einen Schritt (an der ähnlichen Aufgabe immer)', () => {
    for (const id of G3) {
      const f = FORMATE[id];
      for (const { b } of aufgaben(id, 20)) {
        const svg2 = f.zeichne(b, { hilfe: 2, gewaehlt: null });
        expect(svg2, id).toContain('data-hilfe="teil"');
        expect(svg2, id).not.toContain('data-hilfe="schritt"');
        expect(f.zeichne(b, { hilfe: 3, gewaehlt: null, aehnlich: true }), id).toContain('data-hilfe="schritt"');
      }
    }
  });
});

describe('Fehler im Muster (Nr. 20)', () => {
  const k = { form: 'kreis', farbe: 'rot' } as const;
  const s = { form: 'stern', farbe: 'blau' } as const;
  const d = { form: 'dreieck', farbe: 'gruen' } as const;
  it('Falle (docs/LOESER.md): Reihe, die sich an zwei Stellen reparieren lässt → zwei Plätze', () => {
    // sechs Plätze, der Stern an Platz 4: Kreis an Platz 4 (alles Kreise) oder Stern an Platz 1 (Wiederholung aus drei)
    expect(fehlerPlaetze([k, k, k, s, k, k])).toEqual([0, 3]);
    expect(fehlerPlaetze([k, k, k, s, k, k, k])).toEqual([3]);
  });
  it('ein schon richtiges Muster hat keinen Fehler; die Periode wird erkannt', () => {
    expect(fehlerPlaetze([k, s, k, s, k, s])).toEqual([]);
    expect(periode([k, s, d, k, s, d])).toBe(3);
    expect(periode([k, s, d, k, s])).toBeNull();
  });
  it('Stufen: Länge und Art des Fehlers', () => {
    for (const { b, stufe } of aufgaben<MusterFehler>('muster-fehler')) {
      const n = b.reihe.length;
      expect(stufe === 1 ? n >= 6 && n <= 8 : stufe === 2 ? n === 9 : n >= 8 && n <= 10).toBe(true);
      expect(MUSTER_FEHLER.loesungen(b)).toHaveLength(1);
    }
  });
});

describe('Was passt nicht? (Nr. 26)', () => {
  const d = (form: Ding['form'], farbe: Ding['farbe'], gross = true, voll = true): Ding => ({ form, farbe, gross, voll });
  it('Falle aus docs/LOESER.md: roter Kreis, blauer Kreis, rotes Quadrat, roter Kreis – Farbe und Form heben zwei heraus', () => {
    expect(herausgehoben({ dinge: [d('kreis', 'rot'), d('kreis', 'blau'), d('quadrat', 'rot'), d('kreis', 'rot')] })).toEqual([1, 2]);
  });
  it('Gegenbeispiel aus docs/LOESER.md: roter Kreis, blauer Kreis, rotes Quadrat, rotes Dreieck – nur der blaue Kreis', () => {
    expect(PASST_NICHT.loesungen({ dinge: [d('kreis', 'rot'), d('kreis', 'blau'), d('quadrat', 'rot'), d('dreieck', 'rot')] })).toEqual([{ art: 'zahl', wert: 2 }]);
  });
  it('abgeleitet: Quadrat, Raute, Dreieck, Kreis – nur der Kreis hat keine Ecken', () => {
    expect(PASST_NICHT.loesungen({ dinge: [d('quadrat', 'rot'), d('raute', 'blau'), d('dreieck', 'gelb'), d('kreis', 'gruen')] })).toEqual([{ art: 'zahl', wert: 4 }]);
  });
  it('Stufen: 1 – nur ein Merkmal unterschiedlich; 3 – fünf Formen oder ein Kreis unter eckigen', () => {
    for (const { b, stufe } of aufgaben<PasstNicht>('passt-nicht')) {
      if (stufe === 1) {
        const verschieden = (['form', 'farbe', 'gross', 'voll'] as const).filter((m) => new Set(b.dinge.map((x) => x[m])).size > 1);
        expect(verschieden).toHaveLength(1);
      }
      if (stufe === 3) expect(b.dinge.length === 5 || b.dinge.filter((x) => x.form === 'kreis').length === 1).toBe(true);
    }
  });
});

describe('Zwei Kreise (Nr. 27)', () => {
  const k: Pick<ZweiKreise, 'links' | 'rechts'> = { links: { art: 'farbe', farbe: 'rot' }, rechts: { art: 'form', form: 'stern' } };
  it('Stellen: rot und Stern in der Mitte, nur rot links, nur Stern rechts, sonst keiner', () => {
    expect(stelleVon(k, { form: 'stern', farbe: 'rot' })).toBe('beide');
    expect(stelleVon(k, { form: 'kreis', farbe: 'rot' })).toBe('links');
    expect(stelleVon(k, { form: 'stern', farbe: 'blau' })).toBe('rechts');
    expect(stelleVon(k, { form: 'kreis', farbe: 'blau' })).toBe('keiner');
  });
  it('Fallen: zwei Karten für die Mitte → zwei Lösungen; Beispiel an falscher Stelle → keine', () => {
    const z: ZweiKreise = { ...k, frage: 'beide', karten: [{ form: 'stern', farbe: 'rot' }, { form: 'stern', farbe: 'rot' }], beispiele: [] };
    expect(ZWEI_KREISE.loesungen(z)).toHaveLength(2);
    expect(ZWEI_KREISE.loesungen({ ...z, karten: [{ form: 'stern', farbe: 'rot' }], beispiele: [{ stelle: 'links', e: { form: 'stern', farbe: 'blau' } }] })).toEqual([]);
  });
  it('Stufen: Mitte auf 1 und 2, Rand auf 3; drei bzw. vier Karten', () => {
    for (const { b, stufe } of aufgaben<ZweiKreise>('zwei-kreise')) {
      expect(b.frage === 'beide').toBe(stufe < 3);
      expect(b.karten).toHaveLength(stufe === 1 ? 3 : 4);
    }
  });
});

describe('Spiegel (Nr. 35) und Drehen (Nr. 36)', () => {
  it('Spiegel: genau eine Karte ist das Spiegelbild; die Hälfte selbst (verschoben) ist nie richtig', () => {
    for (const { b } of aufgaben<Spiegel>('spiegel')) {
      expect(b.karten.filter((k) => gleichesGitter(k, spiegelLR(b.haelfte)))).toHaveLength(1);
      expect(SPIEGEL.loesungen({ ...b, karten: [b.haelfte] })).toEqual([]);
    }
  });
  it('Drehen: die Figur ist nie spiegelgleich; genau eine Karte ist eine Drehung; ein Spiegelbild ist nie richtig', () => {
    for (const { b } of aufgaben<Drehen>('drehen')) {
      const dr = drehungen(b.figur);
      expect(dr.some((x) => gleichesGitter(x, zuschneiden(spiegelLR(b.figur))))).toBe(false);
      expect(DREHEN.loesungen(b)).toHaveLength(1);
      expect(DREHEN.loesungen({ ...b, karten: [spiegelLR(b.figur)] })).toEqual([]);
    }
  });
});

describe('Spiegel-Achse (Nr. 79)', () => {
  it('Falle: Figur, die an zwei gezeigten Linien symmetrisch ist → zwei Lösungen', () => {
    const b = 'blau' as const;
    const kreuz: Spiegelachse = { figur: [[null, b, b, null], [b, b, b, b], [b, b, b, b], [null, b, b, null]], linien: ['senkrecht', 'waagerecht'] };
    expect(SPIEGELACHSE.loesungen(kreuz)).toHaveLength(2);
  });
  it('Stufen: Größe und Linien; genau eine gezeigte Linie ist eine Achse', () => {
    for (const { b, stufe } of aufgaben<Spiegelachse>('spiegelachse')) {
      expect(b.figur.length).toBe(stufe === 1 ? 4 : 6);
      expect(b.linien).toHaveLength(stufe === 3 ? 4 : 2);
      expect(b.linien.filter((l) => symmetrisch(b.figur, l))).toHaveLength(1);
    }
  });
});

describe('Diagramm lesen (Nr. 84)', () => {
  it('Falle: zwei gleich hohe Säulen ganz oben → zwei Lösungen; über der Achse → keine', () => {
    const d: Diagramm = { art: 'saeulen', sorten: [{ form: 'kreis', farbe: 'rot', anzahl: 5 }, { form: 'stern', farbe: 'gelb', anzahl: 5 }], achse: 10 };
    expect(DIAGRAMM.loesungen(d)).toHaveLength(2);
    expect(DIAGRAMM.loesungen({ ...d, sorten: [{ ...d.sorten[0], anzahl: 12 }] })).toEqual([]);
  });
  it('Stufen: Bild, Säulen, Striche; die größte genau einmal, ab Stufe 2 knapp vor der zweiten; Zahlenraum 10 bis 10', () => {
    for (const { b, stufe, zahlenraum } of aufgaben<Diagramm>('diagramm', 100, ZAHLENRAEUME)) {
      expect(b.art).toBe(['bild', 'saeulen', 'striche'][stufe - 1]);
      const w = b.sorten.map((s) => s.anzahl).sort((x, y) => y - x);
      expect(w[0]).toBeGreaterThan(w[1]);
      if (stufe > 1) expect(w[0] - w[1]).toBeLessThanOrEqual(2);
      if (zahlenraum === 10) expect(w[0]).toBeLessThanOrEqual(10);
    }
  });
});

describe('Fehler in der Mauer (Nr. 95)', () => {
  it('Grenzfälle: falscher Stein oben, unten in der Mitte, in der Mitte links – genau er lässt sich reparieren', () => {
    expect(reparierbar({ reihen: [[1, 3, 2], [4, 5], [10]] })).toEqual([[2, 0]]);
    expect(reparierbar({ reihen: [[1, 4, 2], [4, 5], [9]] })).toEqual([[0, 1]]);
    expect(reparierbar({ reihen: [[1, 3, 2], [6, 5], [9]] })).toEqual([[1, 0]]);
  });
  it('Falle: zwei Reihen – jeder Stein ließe sich ändern → mehrere Lösungen; richtige Mauer → keine', () => {
    expect(MAUER_FEHLER.loesungen({ reihen: [[1, 2], [4]] }).length).toBeGreaterThan(1);
    expect(MAUER_FEHLER.loesungen({ reihen: [[1, 3, 2], [4, 5], [9]] })).toEqual([]);
  });
  it('Stufen: drei, drei, vier Reihen (bis 10: drei); alle Zahlen verschieden und im Zahlenraum', () => {
    for (const { b, stufe, zahlenraum } of aufgaben<MauerFehler>('mauer-fehler', 100, ZAHLENRAEUME)) {
      expect(b.reihen.length).toBe(stufe === 3 && zahlenraum > 10 ? 4 : 3);
      const alle = b.reihen.flat();
      expect(new Set(alle).size).toBe(alle.length);
      expect(Math.max(...alle)).toBeLessThanOrEqual(stufe === 1 ? (zahlenraum === 100 ? 20 : 10) : zahlenraum);
    }
  });
});
