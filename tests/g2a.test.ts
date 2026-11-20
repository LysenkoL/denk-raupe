import { describe, expect, it } from 'vitest';
import { FORMATE } from '../src/aufgaben';
import { aufgabeAus, ZAHLENRAEUME, type FormatId, type Zahlenraum } from '../src/aufgaben/format';
import { gleich } from '../src/perlen/antwort';
import { KIND } from '../src/i18n/kind';
import { WUERFELBAU, anteilSichtbar, summe, versteckte, type Wuerfelbau } from '../src/aufgaben/wuerfelbau';
import { ZAEHL_BILD, ecken, umriss, type ZaehlBild, type ZaehlDing } from '../src/aufgaben/zaehl-bild';
import { ECKEN_SEITEN, VORLAGEN, einpassen, knicke, regelmaessig, selbstSchnitt, type EckenSeiten } from '../src/aufgaben/ecken-seiten';
import { PLAN, alsAntwort, type Plan } from '../src/aufgaben/plan';
import { OBEN_UNTEN, weg, type ObenUnten } from '../src/aufgaben/oben-unten';

/**
 * Gruppe Г2а (Engine Bild): Nr. 37, 47, 93 (Antwort Zahl), 41, 42 (Antwort Wahl) nach docs/FORMATE.md, Abschnitt 4 –
 * Fallen für den Löser, Grenzfälle, Stufen, Hilfe Stufen 2 und 3 auf dem Bild, das Bild verrät nichts.
 * (10 000 Aufgaben je Stufe und Zahlenraum, ein Samen – eine Aufgabe, Pass: tests/formate.test.ts;
 * Lernbeispiel: tests/lernbeispiel.test.ts; Bildschirm auf drei Größen: tests/satz.test.ts.)
 */

const G2A: FormatId[] = ['wuerfelbau', 'zaehl-bild', 'ecken-seiten', 'plan', 'oben-unten'];
const zahl = (wert: number) => ({ art: 'zahl' as const, wert });
const texte = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
const werte = (id: FormatId, b: unknown) => FORMATE[id].loesungen(b).map((l) => (l as { wert: number }).wert);

function aufgaben<B>(id: FormatId, n = 200, raeume: readonly Zahlenraum[] = ZAHLENRAEUME): { b: B; stufe: number; zahlenraum: Zahlenraum; wahl: unknown[] | null }[] {
  const f = FORMATE[id];
  const out: { b: B; stufe: number; zahlenraum: Zahlenraum; wahl: unknown[] | null }[] = [];
  for (const zahlenraum of raeume)
    for (let stufe = 1; stufe <= f.stufen; stufe++)
      for (let s = 0; s < n; s++) {
        const a = aufgabeAus(f, s * 40503 + stufe, stufe, { zahlenraum });
        out.push({ b: a.bedingung as B, stufe, zahlenraum, wahl: a.wahl });
      }
  return out;
}

describe('Г2а: gemeinsam', () => {
  it('Pass: Engine Bild, nur Bildschirm, drei Stufen, feste Sätze in kind.ts, Eingabe Zahl oder Wahl', () => {
    const satz: Partial<Record<FormatId, [string, string]>> = {
      wuerfelbau: ['Wie viele Würfel sind es?', 'zahl'],
      'zaehl-bild': ['Wie viele sind es?', 'zahl'],
      'ecken-seiten': ['Wie viele sind es?', 'zahl'],
      plan: ['Was liegt in diesem Feld?', 'wahl'],
      'oben-unten': ['Was liegt dort?', 'wahl'],
    };
    for (const id of G2A) {
      const f = FORMATE[id];
      expect(f.motor).toBe('bild');
      expect(f.druck).toBe(false);
      expect(f.stufen).toBe(3);
      expect(KIND.auftrag[f.auftrag]).toBe(satz[id]![0]);
      for (const { b } of aufgaben(id, 10)) expect(f.eingabe(b)).toEqual({ art: satz[id]![1] });
    }
  });

  it('Zahl-Formate: im Bild steht nur „?“; Hilfe 2 und 3 schreiben keine Zahl; die Zahl des Kindes sieht im Nest gleich aus, ob sie stimmt', () => {
    for (const id of ['wuerfelbau', 'zaehl-bild', 'ecken-seiten'] as const) {
      const f = FORMATE[id];
      for (const { b } of aufgaben(id, 40)) {
        const svg0 = f.zeichne(b, { hilfe: 0, gewaehlt: null });
        expect(texte(svg0), id).toEqual(['?']);
        expect(svg0).not.toContain('data-hilfe');
        for (const hilfe of [2, 3] as const) expect(texte(f.zeichne(b, { hilfe, gewaehlt: null })), id).toEqual(['?']);
        const l = werte(id, b)[0];
        const richtig = f.zeichne(b, { hilfe: 0, gewaehlt: zahl(l) });
        const falsch = f.zeichne(b, { hilfe: 0, gewaehlt: zahl(l + 1) });
        expect(texte(richtig)).toEqual([String(l)]);
        expect(richtig.replace(`>${l}<`, '>X<')).toBe(falsch.replace(`>${l + 1}<`, '>X<'));
        expect(texte(f.zeichne(b, { hilfe: 0, gewaehlt: null, vorrechnen: true }))).toContain(String(l));
      }
    }
  });

  it('Wahl-Formate: ohne Wahl kein Inhalt im Nest; die gewählte Form sieht gleich aus, ob sie stimmt', () => {
    for (const id of ['plan', 'oben-unten'] as const) {
      const f = FORMATE[id];
      for (const { b, wahl } of aufgaben(id, 40)) {
        const svg0 = f.zeichne(b, { hilfe: 0, gewaehlt: null });
        expect(svg0).not.toContain('data-inhalt');
        expect(svg0).not.toContain('data-hilfe');
        const l = f.loesungen(b)[0];
        const anders = (wahl as typeof l[]).find((w) => !gleich(w, l))!;
        const nest = (svg: string) => svg.match(/<g data-inhalt="">.*?<\/g>/)![0];
        const ohne = (svg: string) => svg.replace(nest(svg), 'X');
        expect(ohne(f.zeichne(b, { hilfe: 0, gewaehlt: l }))).toBe(ohne(f.zeichne(b, { hilfe: 0, gewaehlt: anders })));
      }
    }
  });

  it('Hilfe 2 hebt einen Teil warm hervor; Hilfe 3 zeigt dazu einen Schritt (an der ähnlichen Aufgabe immer)', () => {
    for (const id of G2A) {
      const f = FORMATE[id];
      for (const { b } of aufgaben(id, 40)) {
        const svg2 = f.zeichne(b, { hilfe: 2, gewaehlt: null });
        expect(svg2, id).toContain('data-hilfe="teil"');
        expect(svg2, id).not.toContain('data-hilfe="schritt"');
        const svg3 = f.zeichne(b, { hilfe: 3, gewaehlt: null, aehnlich: true });
        expect(svg3, id).toContain('data-hilfe="schritt"');
        if (!f.schrittVerraet?.(b)) expect(f.zeichne(b, { hilfe: 3, gewaehlt: null }), id).toContain('data-hilfe="schritt"');
      }
    }
  });

  it('die Wahl hat 3 oder 4 verschiedene Perlen, die Lösung genau einmal; jede Stelle kommt für die Lösung vor', () => {
    for (const id of ['plan', 'oben-unten'] as const) {
      const stellen = new Set<number>();
      for (const { b, wahl } of aufgaben(id, 100)) {
        const l = FORMATE[id].loesungen(b)[0];
        const w = wahl as typeof l[];
        expect([3, 4]).toContain(w.length);
        expect(w.filter((x) => gleich(x, l))).toHaveLength(1);
        stellen.add(w.findIndex((x) => gleich(x, l)));
      }
      expect(stellen.size, id).toBe(4);
    }
  });
});

describe('Würfelbau (Nr. 37)', () => {
  const B = WUERFELBAU;
  const bau = (hoehen: number[][]): Wuerfelbau => ({ hoehen, farbe: 'blau' });

  it('Grenzfälle: ein Würfel, ein hoher Turm, eine Reihe – genau die Summe', () => {
    expect(werte('wuerfelbau', bau([[1]]))).toEqual([1]);
    expect(werte('wuerfelbau', bau([[3]]))).toEqual([3]);
    expect(werte('wuerfelbau', bau([[1, 2, 3]]))).toEqual([6]);
    // hinten höher als vorn: unten hinten versteckt, aber jede Deckfläche zu sehen
    expect(werte('wuerfelbau', bau([[1, 1], [3, 3]]))).toEqual([8]);
    expect(versteckte(bau([[1, 1], [3, 3]]))).toBeGreaterThan(0);
  });

  it('Falle (docs/LOESER.md): Turm hinter einem höheren Turm – seine Höhe ist nicht zu sehen → verworfen', () => {
    expect(B.loesungen(bau([[3, 3], [1, 1]]))).toHaveLength(2);
    expect(anteilSichtbar(bau([[3, 3], [1, 1]]), 0, 1, 1)).toBeLessThan(0.5);
    // leeres Feld hinter einer hohen Wand: dort könnte ein Turm stehen → verworfen
    expect(B.loesungen(bau([[3, 3], [0, 1]]))).toHaveLength(2);
    // drei Reihen: Deckflächen lassen sich nicht mehr einem Feld zuordnen → verworfen
    expect(B.loesungen(bau([[1], [1], [1]]))).toHaveLength(2);
  });

  it('Stufen: 1 – eine Reihe, alles zu sehen; 2 – zwei Reihen; 3 – zwei Reihen, mindestens ein versteckter Würfel; Grenzen je Zahlenraum', () => {
    for (const { b, stufe, zahlenraum } of aufgaben<Wuerfelbau>('wuerfelbau', 150)) {
      expect(b.hoehen.length).toBe(stufe === 1 ? 1 : 2);
      if (stufe === 1) expect(versteckte(b)).toBe(0);
      if (stufe === 3) expect(versteckte(b)).toBeGreaterThanOrEqual(1);
      expect(summe(b)).toBeLessThanOrEqual(zahlenraum === 10 ? 10 : 16);
      b.hoehen.flat().forEach((h) => expect(h).toBeLessThanOrEqual(3));
    }
  });

  it('Hilfe 2 hebt nur das oberste Stockwerk an; Hilfe 3 legt alle auseinander', () => {
    const b = bau([[1, 2], [3, 3]]);
    const angehoben = (svg: string, art: string) => (svg.match(new RegExp(`<g data-hilfe="${art}"><polygon`, 'g')) ?? []).length;
    expect(angehoben(B.zeichne(b, { hilfe: 2, gewaehlt: null }), 'teil')).toBe(2);
    // Stufe 3: alle Würfel über dem Boden (3 + 2 − 4 Bodenwürfel … = 5 von 9 Würfeln)
    expect(angehoben(B.zeichne(b, { hilfe: 3, gewaehlt: null }), 'schritt')).toBe(9 - 4);
  });
});

describe('Zähl-Bild (Nr. 47)', () => {
  const B = ZAEHL_BILD;
  const ding = (form: ZaehlDing['form'], x: number, y: number): ZaehlDing => ({ form, x, y, r: 24, dreh: 0, farbe: 'rot' });

  it('Ecken der Formen: Dreiecke aller Arten 3, Trapez und Raute 4, Kreis 0', () => {
    expect(['dreieck', 'rechtwinklig', 'spitz'].map((form) => ecken({ form: form as ZaehlDing['form'] }))).toEqual([3, 3, 3]);
    expect(ecken({ form: 'trapez' })).toBe(4);
    expect(ecken({ form: 'raute' })).toBe(4);
    expect(ecken({ form: 'quadrat' })).toBe(4);
    expect(ecken({ form: 'kreis' })).toBe(0);
    expect(ecken({ form: 'stern' })).toBe(10);
  });

  it('Falle: zwei Formen berühren sich – das Kind kann sie als eine sehen → verworfen', () => {
    const b: ZaehlBild = { dinge: [ding('dreieck', 100, 100), ding('dreieck', 140, 100), ding('kreis', 300, 200)], breite: 360, hoehe: 300 };
    expect(B.loesungen(b)).toHaveLength(2);
    expect(werte('zaehl-bild', { ...b, dinge: [ding('dreieck', 100, 100), ding('dreieck', 200, 100), ding('kreis', 300, 200)] })).toEqual([2]);
  });

  it('Stufen: Zahl der Formen und Dreiecke; Stufe 1 ohne Drehung; Stufe 3 mit Trapezen; alles auf dem Tablett', () => {
    let trapeze = 0;
    for (const { b, stufe } of aufgaben<ZaehlBild>('zaehl-bild', 150, [20])) {
      const n = b.dinge.length;
      const d = b.dinge.filter((x) => ecken(x) === 3).length;
      const [fmin, fmax, dmin, dmax] = stufe === 1 ? [6, 8, 2, 5] : stufe === 2 ? [9, 12, 3, 8] : [12, 16, 4, 10];
      expect(n).toBeGreaterThanOrEqual(fmin);
      expect(n).toBeLessThanOrEqual(fmax);
      expect(d).toBeGreaterThanOrEqual(dmin);
      expect(d).toBeLessThanOrEqual(dmax);
      expect(n - d).toBeGreaterThanOrEqual(2);
      if (stufe === 1) expect(b.dinge.every((x) => x.dreh === 0)).toBe(true);
      if (stufe === 3 && b.dinge.some((x) => x.form === 'trapez')) trapeze++;
      for (const x of b.dinge) for (const [px, py] of umriss(x)) expect(px > 4 && px < b.breite - 4 && py < b.hoehe).toBe(true);
    }
    expect(trapeze).toBeGreaterThan(120);
  });

  it('Hilfe 3 markiert höchstens die Hälfte der Dreiecke als gezählt (nie alle)', () => {
    for (const { b } of aufgaben<ZaehlBild>('zaehl-bild', 60, [20])) {
      const d = b.dinge.filter((x) => ecken(x) === 3).length;
      const markiert = (B.zeichne(b, { hilfe: 3, gewaehlt: null }).match(/<circle data-hilfe="schritt"/g) ?? []).length;
      expect(markiert).toBe(Math.ceil(d / 2));
      expect(markiert).toBeLessThan(d);
    }
  });
});

describe('Ecken und Seiten (Nr. 93)', () => {
  const B = ECKEN_SEITEN;
  const form = (punkte: [number, number][]): EckenSeiten => ({ punkte, was: 'ecken', farbe: 'blau' });

  it('Vorlagen: Zahl der Ecken je Form', () => {
    const erwartet: Record<string, number> = { winkel: 6, t: 8, u: 8, treppe: 8, pfeil: 7, haus: 5, plus: 12, stern: 10, zickzack: 6 };
    for (const [name, p] of Object.entries(VORLAGEN)) expect(werte('ecken-seiten', form(einpassen(p))), name).toEqual([erwartet[name]]);
    for (let n = 3; n <= 6; n++) expect(werte('ecken-seiten', form(einpassen(regelmaessig(n))))).toEqual([n]);
  });

  it('Fallen: kaum geknickter Punkt, Schleife, sehr kurze Seite → verworfen; Punkt mitten auf einer Seite ist keine Ecke', () => {
    // Quadrat mit einem Punkt, an dem der Rand um 15° knickt
    expect(B.loesungen(form([[100, 100], [200, 100], [300, 126.8], [300, 300], [100, 300]]))).toHaveLength(2);
    // Schleife (Achter): schneidet sich selbst
    const schleife: [number, number][] = [[100, 100], [300, 300], [300, 100], [100, 300]];
    expect(selbstSchnitt(schleife)).toBe(true);
    expect(B.loesungen(form(schleife))).toHaveLength(2);
    // Seite kürzer als 22
    expect(B.loesungen(form([[100, 100], [300, 100], [300, 300], [110, 300], [100, 290]]))).toHaveLength(2);
    // Punkt genau auf der Seite: gerade weiter, keine Ecke
    expect(werte('ecken-seiten', form([[100, 100], [200, 100], [300, 100], [300, 300], [100, 300]]))).toEqual([4]);
  });

  it('Stufen: 1 – regelmäßig mit 3–6 Ecken; 2 – gewölbt mit 3–7; 3 – nicht gewölbt mit 5–12; Ecken und Seiten kommen beide vor', () => {
    const was = new Set<string>();
    for (const { b, stufe } of aufgaben<EckenSeiten>('ecken-seiten', 150, [20])) {
      const n = werte('ecken-seiten', b)[0];
      was.add(b.was);
      const k = knicke(b.punkte);
      // gewölbt: alle Knicke in dieselbe Richtung (Summe der Knicke = 360°)
      const summe = k.reduce((a, w) => a + w, 0);
      if (stufe === 1) expect(n >= 3 && n <= 6).toBe(true);
      if (stufe === 2) {
        expect(n >= 3 && n <= 7).toBe(true);
        expect(summe).toBeCloseTo(360, 0);
      }
      if (stufe === 3) {
        expect(n >= 5 && n <= 12).toBe(true);
        if (n !== 5) expect(summe).toBeGreaterThan(361);
      }
    }
    expect([...was].sort()).toEqual(['ecken', 'seiten']);
  });

  it('Hilfe 3 markiert im Uhrzeigersinn die erste Hälfte, nie alle', () => {
    for (const { b } of aufgaben<EckenSeiten>('ecken-seiten', 60, [20])) {
      const n = werte('ecken-seiten', b)[0];
      const svg = B.zeichne(b, { hilfe: 3, gewaehlt: null });
      const markiert = (svg.match(/data-hilfe="schritt"/g) ?? []).length + (svg.match(/data-hilfe="teil"/g) ?? []).length - 1;
      expect(markiert).toBe(Math.ceil(n / 2));
      expect(markiert).toBeLessThan(n);
    }
  });
});

describe('Plan (Nr. 41)', () => {
  const B = PLAN;

  it('der Löser liest das Feld unter Buchstabe und Zahl; außerhalb des Plans keine Antwort', () => {
    const felder = (['kreis', 'stern', 'quadrat', 'dreieck'] as const).map((form) => ({ form, farbe: 'rot' as const }));
    const p: Plan = { spalten: 2, zeilen: 2, felder, frage: [1, 0] };
    expect(B.loesungen(p)).toEqual([alsAntwort(felder[1])]);
    expect(B.loesungen({ ...p, frage: [0, 1] })).toEqual([alsAntwort(felder[2])]);
    expect(B.loesungen({ ...p, frage: [2, 0] })).toEqual([]);
    expect(B.loesungen({ ...p, frage: [0, -1] })).toEqual([]);
  });

  it('Stufen: 2 × 2, 3 × 3, 4 × 4; ab Stufe 2 liegt das vertauschte Feld in der Wahl', () => {
    for (const { b, stufe, wahl } of aufgaben<Plan>('plan', 150, [20])) {
      expect(b.spalten).toBe(stufe + 1);
      expect(b.zeilen).toBe(stufe + 1);
      expect(new Set(b.felder.map((e) => `${e.form}${e.farbe}`)).size).toBe(b.felder.length);
      if (stufe > 1) {
        const [s, z] = b.frage;
        expect(s).not.toBe(z);
        const vertauscht = alsAntwort(b.felder[s * b.spalten + z]);
        expect((wahl as ReturnType<typeof alsAntwort>[]).some((w) => gleich(w, vertauscht))).toBe(true);
      }
    }
  });

  it('Hilfe 2: Buchstabe und Zahl am Rand; Hilfe 3: Rahmen um die ganze Spalte', () => {
    const b = aufgaben<Plan>('plan', 1, [20])[2].b;
    const svg2 = B.zeichne(b, { hilfe: 2, gewaehlt: null });
    expect((svg2.match(/<circle data-hilfe="teil"/g) ?? []).length).toBe(2);
    const svg3 = B.zeichne(b, { hilfe: 3, gewaehlt: null });
    expect(svg3).toMatch(new RegExp(`data-hilfe="schritt"[^>]*height="${b.zeilen * 66 + 2}"`));
  });
});

describe('Oben, unten, links, rechts (Nr. 42)', () => {
  const B = OBEN_UNTEN;
  const felder = (n: number) => Array.from({ length: n * n }, (_, i) => ({ form: (['kreis', 'stern', 'quadrat', 'dreieck', 'raute'] as const)[i % 5], farbe: (['rot', 'blau', 'gruen'] as const)[i % 3] }));

  it('der Weg folgt den Pfeilen; verlässt er das Feld oder endet bei der Raupe, gibt es keine Antwort', () => {
    const f = felder(3);
    const b: ObenUnten = { spalten: 3, zeilen: 3, felder: f.map((e, i) => (i === 4 ? null : e)), start: 4, pfeile: ['oben', 'rechts'] };
    expect(weg(b, b.pfeile)).toEqual([1, 2]);
    expect(B.loesungen(b)).toEqual([alsAntwort(f[2])]);
    expect(B.loesungen({ ...b, pfeile: ['oben', 'oben'] })).toEqual([]);
    expect(B.loesungen({ ...b, pfeile: ['oben', 'unten'] })).toEqual([]);
    // Ecke: von oben links nach rechts und unten
    expect(B.loesungen({ ...b, felder: f.map((e, i) => (i === 0 ? null : e)), start: 0, pfeile: ['rechts', 'unten'] })).toEqual([alsAntwort(f[4])]);
  });

  it('Stufen: 1 – ein Pfeil aus der Mitte; 2 – zwei Pfeile; 3 – drei Pfeile auf 4 × 4, mit links oder rechts; nie gleich zurück', () => {
    const gegen = { oben: 'unten', unten: 'oben', links: 'rechts', rechts: 'links' } as const;
    for (const { b, stufe } of aufgaben<ObenUnten>('oben-unten', 150, [20])) {
      expect(b.pfeile).toHaveLength(stufe);
      expect(b.spalten).toBe(stufe === 3 ? 4 : 3);
      if (stufe === 1) expect(b.start).toBe(4);
      if (stufe === 3) expect(b.pfeile.some((p) => p === 'links' || p === 'rechts')).toBe(true);
      b.pfeile.slice(1).forEach((p, k) => expect(p).not.toBe(gegen[b.pfeile[k]]));
      expect(B.schrittVerraet!(b)).toBe(stufe === 1);
    }
  });

  it('Hilfe 3 an der eigenen Aufgabe mit einem Pfeil zeigt keinen Schritt (sonst wäre die Lösung umrahmt)', () => {
    for (const { b } of aufgaben<ObenUnten>('oben-unten', 30, [20]).filter((x) => x.stufe === 1)) {
      expect(B.zeichne(b, { hilfe: 3, gewaehlt: null })).not.toContain('data-hilfe="schritt"');
      expect(B.zeichne(b, { hilfe: 3, gewaehlt: null, aehnlich: true })).toContain('data-hilfe="schritt"');
    }
  });
});
