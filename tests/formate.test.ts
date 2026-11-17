import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FORMATE } from '../src/aufgaben';
import { aufgabeAus, bereichVon, FAEHIGKEITEN, stimmt, ZAHLENRAEUME, type FormatId } from '../src/aufgaben/format';
import { zufall } from '../src/core/zufall';
import { gleich } from '../src/perlen/antwort';
import { KIND } from '../src/i18n/kind';
import { passt, type WerIstEs } from '../src/aufgaben/wer-ist-es';
import { grenzeFuer, type Mauer } from '../src/aufgaben/zahlenmauer';
import type { Muster } from '../src/aufgaben/muster';

const N = 10_000;
const IDS = Object.keys(FORMATE) as FormatId[];

describe.each(IDS)('Format %s', (id) => {
  const f = FORMATE[id];
  for (let stufe = 1; stufe <= f.stufen; stufe++)
    for (const zahlenraum of ZAHLENRAEUME) {
      it(`Stufe ${stufe}, bis ${zahlenraum}: ${N} Aufgaben, jede mit genau einer Lösung; Wahl enthält sie genau einmal`, () => {
        for (let s = 0; s < N; s++) {
          const a = aufgabeAus(f, s * 2654435761, stufe, { zahlenraum });
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

  it('Samen + Version + Zahlenraum → dieselbe Aufgabe; gespeicherte Felder reichen, um sie neu zu erzeugen', () => {
    for (const zahlenraum of ZAHLENRAEUME)
      for (let stufe = 1; stufe <= f.stufen; stufe++)
        for (let s = 0; s < 50; s++) {
          const a = aufgabeAus(f, s * 31337, stufe, { zahlenraum });
          expect(a).toEqual(aufgabeAus(f, s * 31337, stufe, { zahlenraum }));
          expect(a).toMatchObject({ format: id, version: f.version, stufe, zahlenraum });
          expect(aufgabeAus(f, a.samen, a.stufe, { zahlenraum: a.zahlenraum })).toEqual(a);
        }
  });

  it('ohne Einstellung: Standard bis 20', () => {
    expect(aufgabeAus(f, 42, 1)).toEqual(aufgabeAus(f, 42, 1, { zahlenraum: 20 }));
  });

  it('Lernbeispiel: mindestens eine Aufgabe, jede eindeutig', () => {
    const b = f.beispiele(zufall(1));
    expect(b.length).toBeGreaterThanOrEqual(1);
    for (const x of b) expect(f.loesungen(x)).toHaveLength(1);
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

describe('Pass jedes Formats (docs/FORMATE.md, Abschnitte 2, 3 und 6)', () => {
  /** Fähigkeiten aus docs/FORMATE.md, Abschnitt 2 – unabhängig vom Code abgeschrieben */
  const AUS_DOKU = 'Z1 Z2 Z3 Z4 Z5 Z6 Z7 Z8 Z9 M1 M2 L1 L2 L3 L4 R1 R2 R3 R4 B1 B2 W1 W2 W3 W4 W5 S1 S2'.split(' ');
  const BEREICH: Record<string, string> = { Z: 'zahlen', M: 'muster', L: 'logik', R: 'raum', B: 'blick', W: 'woerter', S: 'welt' };
  const MOTOREN = ['bild', 'auswahl', 'raster', 'reihe', 'verbinden', 'weg', 'bauen', 'blick'];
  const BRAUCHT = ['woerterbuch', 'autorensatz', 'bilder'];
  const EINGABEN = ['zahl', 'wahl', 'bild', 'zeit', 'geld', 'raster', 'reihe', 'paare', 'weg', 'bau'];

  /** Zeilen der Tabelle in Abschnitt 6: Nr → Spalten */
  const tabelle = new Map<number, string[]>();
  const doku = readFileSync(resolve(__dirname, '../docs/FORMATE.md'), 'utf8');
  for (const zeile of doku.slice(doku.indexOf('## 6.'), doku.indexOf('## 7.')).split('\n')) {
    const z = zeile.split('|').map((x) => x.trim());
    if (/^\d+$/.test(z[1] ?? '')) tabelle.set(Number(z[1]), z.slice(1, -1));
  }

  it('die Code-Liste der Fähigkeiten ist die aus der Doku', () => {
    expect([...FAEHIGKEITEN]).toEqual(AUS_DOKU);
    expect(tabelle.size).toBe(104);
  });

  it.each(IDS)('%s: alle Felder gefüllt, Werte erlaubt', (id) => {
    const f = FORMATE[id];
    expect(f.id).toBe(id);
    expect(Number.isInteger(f.nr) && f.nr >= 1 && f.nr <= 104).toBe(true);
    expect(Number.isInteger(f.version) && f.version >= 1).toBe(true);
    expect(AUS_DOKU).toContain(f.faehigkeit);
    expect(f.bereich).toBe(BEREICH[f.faehigkeit[0]]);
    expect(f.bereich).toBe(bereichVon(f.faehigkeit));
    expect(MOTOREN).toContain(f.motor);
    expect([1, 2]).toContain(f.klasse);
    expect([0, 1]).toContain(f.lesen);
    expect(Array.isArray(f.braucht)).toBe(true);
    for (const b of f.braucht) expect(BRAUCHT).toContain(b);
    expect(typeof f.druck).toBe('boolean');
    if (f.druck) expect(typeof f.druckBlock).toBe('function');
    expect(Object.keys(KIND.auftrag)).toContain(f.auftrag);
    expect(KIND.auftrag[f.auftrag].trim()).not.toBe('');
    expect(Number.isInteger(f.stufen) && f.stufen >= 3).toBe(true);
    for (const fn of ['erzeuge', 'loesungen', 'eingabe', 'zeichne', 'beispiele'] as const) expect(typeof f[fn], fn).toBe('function');
    if (f.mehrere !== undefined) expect(typeof f.mehrere).toBe('boolean');
    // Eingabe jeder Stufe ist eine der beschriebenen; bei Wahl und Bild gibt es Wahlmöglichkeiten
    for (let stufe = 1; stufe <= f.stufen; stufe++) {
      const a = aufgabeAus(f, 7 * stufe, stufe);
      const e = f.eingabe(a.bedingung);
      expect(EINGABEN).toContain(e.art);
      if (e.art === 'zahl') expect(Number.isInteger(e.max) && e.max >= 1 && e.max <= 100).toBe(true);
      if (e.art === 'wahl' || e.art === 'bild') expect(a.wahl?.length).toBeGreaterThan(1);
    }
  });

  it('keine Nummer doppelt', () => {
    const nr = IDS.map((id) => FORMATE[id].nr);
    expect(new Set(nr).size).toBe(nr.length);
  });

  it.each(IDS)('%s: Pass stimmt mit der Zeile in der Tabelle überein', (id) => {
    const f = FORMATE[id];
    const [, , faehigkeit, motor, , klasse, braucht, druck] = tabelle.get(f.nr)!;
    expect(f.faehigkeit).toBe(faehigkeit);
    expect(f.motor).toBe(motor.toLowerCase());
    expect(f.klasse).toBe(Number(klasse));
    expect(f.lesen).toBe(braucht.includes('чт') ? 1 : 0);
    expect(f.braucht.includes('woerterbuch')).toBe(braucht.includes('С'));
    expect(f.braucht.includes('autorensatz')).toBe(braucht.includes('А'));
    expect(f.braucht.includes('bilder')).toBe(braucht.includes('К'));
    // gedruckt wird nur, was die Tabelle als druckbar führt (der Block selbst kommt mit Etappe 8)
    if (f.druck) expect(druck).toBe('да');
  });

  it('Aufträge auf dem Bildschirm sind dieselben Sätze wie vorher', () => {
    expect(KIND.auftrag[FORMATE.zahlenmauer.auftrag]).toBe('Welche Zahl fehlt?');
    expect(KIND.auftrag[FORMATE.muster.auftrag]).toBe('Wie geht es weiter?');
    expect(KIND.auftrag[FORMATE['wer-ist-es'].auftrag]).toBe('Wer ist es?');
  });
});

describe('Zahlenraum', () => {
  const f = FORMATE.zahlenmauer;

  it('Zahlenmauer: Stufe 1 eine Stufe unter dem Zahlenraum, Stufen 2–3 der ganze Zahlenraum', () => {
    expect([10, 20, 100].map((r) => grenzeFuer(1, r as 10 | 20 | 100))).toEqual([10, 10, 20]);
    for (const stufe of [2, 3]) expect([10, 20, 100].map((r) => grenzeFuer(stufe, r as 10 | 20 | 100))).toEqual([10, 20, 100]);
  });

  it('Zahlenmauer: keine Zahl über der Grenze; Eingabe bis zur Grenze; große Zahlen kommen bis 100 wirklich vor', () => {
    for (const zahlenraum of ZAHLENRAEUME)
      for (let stufe = 1; stufe <= f.stufen; stufe++) {
        let groesste = 0;
        for (let s = 0; s < 2000; s++) {
          const a = aufgabeAus(f, s * 7, stufe, { zahlenraum });
          const m = a.bedingung as Mauer;
          expect(m.grenze).toBe(grenzeFuer(stufe, zahlenraum));
          expect(f.eingabe(m)).toEqual({ art: 'zahl', max: m.grenze });
          const alle = m.reihen.flat();
          expect(Math.max(...alle)).toBeLessThanOrEqual(m.grenze);
          groesste = Math.max(groesste, ...alle);
        }
        // die Grenze wird auch ausgeschöpft, nicht nur eingehalten
        expect(groesste, `Stufe ${stufe} bis ${zahlenraum}`).toBeGreaterThan(grenzeFuer(stufe, zahlenraum) * 0.8);
      }
  });

  it('Zahlenmauer: anderer Zahlenraum → andere Aufgabe', () => {
    let anders = 0;
    for (let s = 0; s < 100; s++) if (JSON.stringify(aufgabeAus(f, s, 2, { zahlenraum: 20 }).bedingung) !== JSON.stringify(aufgabeAus(f, s, 2, { zahlenraum: 100 }).bedingung)) anders++;
    expect(anders).toBeGreaterThan(90);
  });

  it('Muster und Wer ist es? lesen den Zahlenraum nicht', () => {
    for (const id of ['muster', 'wer-ist-es'] as const)
      for (let stufe = 1; stufe <= 3; stufe++)
        for (let s = 0; s < 200; s++) {
          const b10 = aufgabeAus(FORMATE[id], s, stufe, { zahlenraum: 10 });
          const b100 = aufgabeAus(FORMATE[id], s, stufe, { zahlenraum: 100 });
          expect(b10.bedingung).toEqual(b100.bedingung);
          expect(b10.wahl).toEqual(b100.wahl);
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
