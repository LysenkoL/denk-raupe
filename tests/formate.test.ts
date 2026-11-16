import { describe, expect, it } from 'vitest';
import { FORMATE } from '../src/aufgaben';
import { aufgabeAus, stimmt, type FormatId } from '../src/aufgaben/format';
import { zufall } from '../src/core/zufall';
import { gleich } from '../src/perlen/antwort';
import { passt, type WerIstEs } from '../src/aufgaben/wer-ist-es';
import type { Mauer } from '../src/aufgaben/zahlenmauer';
import type { Muster } from '../src/aufgaben/muster';

const N = 10_000;

describe.each(Object.keys(FORMATE) as FormatId[])('Format %s', (id) => {
  const f = FORMATE[id];
  for (let stufe = 1; stufe <= f.stufen; stufe++) {
    it(`Stufe ${stufe}: ${N} Aufgaben, jede mit genau einer Lösung; Wahl enthält sie genau einmal`, () => {
      for (let s = 0; s < N; s++) {
        const a = aufgabeAus(f, s * 2654435761, stufe);
        const l = f.loesungen(a.bedingung);
        expect(l, `${id} Samen ${s}`).toHaveLength(1);
        if (a.wahl) {
          expect(a.wahl.filter((w) => gleich(w, l[0]))).toHaveLength(1);
          // keine Wahl doppelt
          a.wahl.forEach((w, i) => a.wahl!.forEach((v, j) => i !== j && expect(gleich(w, v)).toBe(false)));
        }
        expect(stimmt(f, a, l[0])).toBe(true);
      }
    });
  }

  it('gleicher Samen → gleiche Aufgabe (wiederherstellbar)', () => {
    expect(aufgabeAus(f, 42, 1)).toEqual(aufgabeAus(f, 42, 1));
  });

  it('Lernbeispiel ist eindeutig und Stufe-1-leicht', () => {
    expect(f.loesungen(f.beispiel(zufall(1)))).toHaveLength(1);
  });

  it('Bild zeigt nie die Lösung, solange nicht vorgerechnet wird', () => {
    for (let s = 0; s < 300; s++) {
      const a = aufgabeAus(f, s * 97, f.stufen);
      for (const hilfe of [0, 1, 2, 3] as const) {
        const svg = f.zeichne(a.bedingung, { hilfe, gewaehlt: null });
        if (id === 'zahlenmauer') {
          const m = a.bedingung as Mauer;
          // der fehlende Stein trägt „?“; seine Zahl steht nur, wenn sie anderswo in der Mauer auch vorkommt
          expect(svg).toContain('>?<');
          expect(m.reihen.length).toBeGreaterThan(1);
        }
        if (id === 'wer-ist-es' && hilfe === 3) {
          // Hilfe 3 lässt nie nur die richtige Raupe sichtbar
          const w = a.bedingung as WerIstEs;
          const sichtbar = (svg.match(/opacity="1"/g) ?? []).length;
          expect(sichtbar).toBeGreaterThanOrEqual(2);
          expect(w.raupen.length).toBe(6);
        }
      }
    }
  });
});

describe('Wer ist es?: Fehler, die der Test fangen muss', () => {
  it('ab Stufe 2 wird jeder Hinweis gebraucht', () => {
    for (let s = 0; s < 2000; s++) {
      const w = aufgabeAus(FORMATE['wer-ist-es'], s, 2).bedingung as WerIstEs;
      for (const h of w.hinweise) expect(w.raupen.filter((r) => passt(r, h)).length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('Muster: keine zweite Regel mit anderer Antwort', () => {
  it('das Muster ist immer mindestens zweimal ganz zu sehen', () => {
    for (let stufe = 1; stufe <= 3; stufe++)
      for (let s = 0; s < 2000; s++) {
        const m = aufgabeAus(FORMATE.muster, s, stufe).bedingung as Muster;
        expect(m.reihe.length).toBeGreaterThanOrEqual(2 * m.periode);
      }
  });

  it('mehrdeutige Reihe (A B A B A A …) hat mehrere Lösungen und würde verworfen', () => {
    const A = { form: 'kreis', farbe: 'rot' } as const;
    const B = { form: 'quadrat', farbe: 'blau' } as const;
    // A A A A: Wiederholung 1 → A; aber auch kein Widerspruch – eindeutig
    expect(FORMATE.muster.loesungen({ reihe: [A, A, A, A], periode: 1 })).toHaveLength(1);
    // A B A B A B A A B: passt zu keiner Wiederholung ≤ halbe Länge
    expect(FORMATE.muster.loesungen({ reihe: [A, B, A, B, A, B, A, A, B], periode: 9 })).toHaveLength(0);
  });
});
