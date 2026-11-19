import { describe, expect, it } from 'vitest';
import { FORMATE } from '../src/aufgaben';
import { aufgabeAus, ZAHLENRAEUME, type Format, type FormatId, type Zahlenraum } from '../src/aufgaben/format';
import { DING_R, kleinerRaum, sichtbareAnzahlen, zaehlePunkte, type Ding } from '../src/aufgaben/zaehlen';
import { baueReihe, bereich as wieVieleBereich, WIE_VIELE, type WieViele } from '../src/aufgaben/wie-viele';
import { baue, hilfePunkte as rechenbildPunkte, RECHENBILD, ueberZehner, type Rechenbild } from '../src/aufgaben/rechenbild';
import { hilfePunkte as maschinenPunkte, RECHENMASCHINE, type Maschine } from '../src/aufgaben/rechenmaschine';
import { grenzen, GROESSER_KLEINER, hilfePunkte as gkPunkte, type GroesserKleiner } from '../src/aufgaben/groesser-kleiner';
import { hilfePunkte as doppelPunkte, mitDingen, VERDOPPELN, type Verdoppeln } from '../src/aufgaben/verdoppeln';
import { hilfePunkte as klecksPunkte, KLECKS, type Klecks } from '../src/aufgaben/klecks';

/**
 * Die sechs Zahl-Formate der Gruppe Г1 nach docs/FORMATE.md, Abschnitt 4: Grenzfälle, Fallen für den Löser,
 * Zahlenraum aus der Einstellung, Hilfe Stufen 2 und 3 auf dem Bild, Bild ohne Lösung.
 * (10 000 Aufgaben je Stufe und Zahlenraum, Samen, Pass, Texte, Druck: tests/formate.test.ts und tests/bereit.test.ts;
 * Lernbeispiel: tests/lernbeispiel.test.ts; Bildschirm: tests/layout.test.ts.)
 */

const G1: FormatId[] = ['wie-viele', 'rechenbild', 'rechenmaschine', 'groesser-kleiner', 'verdoppeln', 'klecks'];
const N = 2000;

function alle<B>(f: Format<B>, stufe: number, zahlenraum: Zahlenraum, n = N): B[] {
  return Array.from({ length: n }, (_, s) => aufgabeAus(f, s * 40503 + stufe, stufe, { zahlenraum }).bedingung);
}
const zahl = (f: Format<unknown>, b: unknown) => (f.loesungen(b)[0] as { wert: number }).wert;
const zaehle = (svg: string, muster: RegExp) => (svg.match(muster) ?? []).length;
const texte = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);

describe('Gruppe Г1: gemeinsame Regeln', () => {
  it.each(G1)('%s: Engine Bild, Antwort Zahl, Feld nur aus dem Zahlenraum', (id) => {
    const f = FORMATE[id];
    expect(f.motor).toBe('bild');
    for (let stufe = 1; stufe <= 3; stufe++) for (const b of alle(f, stufe, 20, 50)) expect(f.eingabe(b)).toEqual({ art: 'zahl' });
  });

  it.each(G1)('%s: Zahlenraum aus der Einstellung – keine Zahl darüber; Stufe 1 eine Stufe darunter; bis 100 kommen große Zahlen vor', (id) => {
    const f = FORMATE[id];
    for (const zr of ZAHLENRAEUME)
      for (let stufe = 1; stufe <= 3; stufe++) {
        const grenze = stufe === 1 ? kleinerRaum(zr) : zr;
        let groesste = 0;
        for (const b of alle(f, stufe, zr, 1000)) {
          const svg = f.zeichne(b, { hilfe: 0, gewaehlt: null });
          const zahlen = [...texte(svg).filter((t) => /^\d+$/.test(t)).map(Number), zahl(f, b)];
          // Verdoppeln: das Doppelte darf bis zum Zahlenraum gehen, die Zahl selbst auch
          for (const z of zahlen) expect(z, `${id} Stufe ${stufe} bis ${zr}`).toBeLessThanOrEqual(grenze);
          groesste = Math.max(groesste, ...zahlen);
        }
        // lose verstreut (Wie viele?, Stufe 2) bleibt es bei 20 – mehr zählt niemand sinnvoll einzeln
        if (stufe > 1 && zr === 100) expect(groesste, `${id} Stufe ${stufe}`).toBeGreaterThan(id === 'wie-viele' && stufe === 2 ? 19 : 40);
      }
  });

  it.each(G1)('%s: anderer Zahlenraum → andere Aufgaben (der Generator liest die Einstellung)', (id) => {
    const f = FORMATE[id];
    let anders = 0;
    for (let s = 0; s < 100; s++) if (JSON.stringify(aufgabeAus(f, s, 2, { zahlenraum: 20 }).bedingung) !== JSON.stringify(aufgabeAus(f, s, 2, { zahlenraum: 100 }).bedingung)) anders++;
    expect(anders).toBeGreaterThan(80);
  });

  it.each(G1)('%s: Hilfe 0 ohne Hilfe; 2 hebt etwas hervor ohne Schritt; 3 zeigt einen Schritt; die Texte bleiben dieselben', (id) => {
    const f = FORMATE[id];
    for (const zr of ZAHLENRAEUME)
      for (let stufe = 1; stufe <= 3; stufe++)
        for (const b of alle(f, stufe, zr, 150)) {
          const s0 = f.zeichne(b, { hilfe: 0, gewaehlt: null });
          const s2 = f.zeichne(b, { hilfe: 2, gewaehlt: null });
          const s3 = f.zeichne(b, { hilfe: 3, gewaehlt: null });
          expect(s0).not.toContain('data-hilfe');
          expect(zaehle(s2, /data-hilfe="teil"/g)).toBeGreaterThan(0);
          expect(s2).not.toContain('data-hilfe="schritt"');
          expect(zaehle(s3, /data-hilfe="schritt"/g)).toBeGreaterThan(0);
          expect(f.schrittVerraet).toBeUndefined();
          expect(texte(s2)).toEqual(texte(s0));
          expect(texte(s3)).toEqual(texte(s0));
        }
  });

  it.each(G1)('%s: das Bild zeigt die Lösung nicht – im Nest „?“, die Zahl des Kindes erst, wenn es sie eingibt', (id) => {
    const f = FORMATE[id];
    for (let stufe = 1; stufe <= 3; stufe++)
      for (const b of alle(f, stufe, 100, 300)) {
        const svg = f.zeichne(b, { hilfe: 3, gewaehlt: null });
        expect(texte(svg)).toContain('?');
        expect(svg).not.toContain('data-inhalt');
        const mit = f.zeichne(b, { hilfe: 0, gewaehlt: { art: 'zahl', wert: 87 } });
        expect(texte(mit)).toContain('87');
        expect(mit).toContain('data-inhalt');
        // vorgerechnet (ähnliche Aufgabe): die Lösung steht da
        expect(texte(f.zeichne(b, { hilfe: 0, gewaehlt: null, vorrechnen: true }))).toContain(String(zahl(f, b)));
      }
  });
});

describe('Wie viele?', () => {
  it('Art und Zahl je Stufe und Zahlenraum; kleinste und größte Zahl kommen vor', () => {
    const art = { 1: 'reihe', 2: 'streu', 3: 'buendel' } as const;
    for (const zr of ZAHLENRAEUME)
      for (let stufe = 1 as 1 | 2 | 3; stufe <= 3; stufe++) {
        const [a, b] = wieVieleBereich(stufe, zr);
        const zahlen = new Set<number>();
        for (const w of alle(WIE_VIELE, stufe, zr)) {
          expect(w.art).toBe(art[stufe]);
          zahlen.add(w.dinge.length);
          // jedes Ding liegt ganz auf dem Tablett (Breite 340, Rand 4)
          for (const d of w.dinge) {
            expect(d.x - DING_R).toBeGreaterThan(8);
            expect(d.x + DING_R).toBeLessThan(332);
            expect(d.y + DING_R).toBeLessThan(4 + w.hoehe);
          }
          if (stufe === 3) {
            const groesse = zr === 10 ? 5 : 10;
            expect(w.leisten.every((l) => l.m === groesse)).toBe(true);
            expect(w.leisten).toHaveLength(Math.floor(w.dinge.length / groesse));
          }
        }
        expect(Math.min(...zahlen)).toBe(a);
        expect(Math.max(...zahlen)).toBe(b);
      }
  });

  it('Falle: zwei Dinge berühren sich → n oder n − 1 → verworfen', () => {
    const w = baueReihe(5, 'kreis', 'rot');
    const dicht: WieViele = { ...w, dinge: [...w.dinge.slice(0, 4), { x: w.dinge[3].x + DING_R, y: w.dinge[3].y }] };
    expect(WIE_VIELE.loesungen(dicht)).toEqual([{ art: 'zahl', wert: 5 }, { art: 'zahl', wert: 4 }]);
    expect(sichtbareAnzahlen([{ x: 0, y: 0 }, { x: 2 * DING_R + 2, y: 0 }])).toEqual([2]);
  });

  it('Grenzfälle: ein Ding, Zehnerleisten ohne lose Dinge', () => {
    expect(WIE_VIELE.loesungen(baueReihe(1, 'stern', 'blau'))).toEqual([{ art: 'zahl', wert: 1 }]);
    const runde = alle(WIE_VIELE, 3, 100).filter((w) => w.dinge.length % 10 === 0);
    expect(runde.length).toBeGreaterThan(0);
    for (const w of runde) expect(zahl(WIE_VIELE as Format<unknown>, w)).toBe(w.leisten.length * 10);
  });

  it('Hilfe: Stufe 2 rahmt die erste Gruppe (fünf oder ein Bündel); Stufe 3 jede Gruppe, die erste als gezählt markiert', () => {
    for (const zr of ZAHLENRAEUME)
      for (let stufe = 1; stufe <= 3; stufe++)
        for (const w of alle(WIE_VIELE, stufe, zr, 200)) {
          const s2 = WIE_VIELE.zeichne(w, { hilfe: 2, gewaehlt: null });
          const s3 = WIE_VIELE.zeichne(w, { hilfe: 3, gewaehlt: null });
          expect(zaehle(s2, /data-hilfe="teil"/g)).toBe(1);
          expect(w.gruppen[0].length).toBe(w.art === 'buendel' && w.leisten.length ? w.leisten[0].m : Math.min(5, w.dinge.length));
          // Gruppen decken jedes Ding genau einmal
          expect(w.gruppen.flat().sort((a, b) => a - b)).toEqual(w.dinge.map((_, k) => k));
          // Rahmen der übrigen Gruppen und Ringe um die erste
          expect(zaehle(s3, /data-hilfe="schritt"/g)).toBe(w.gruppen.length - 1 + w.gruppen[0].length);
          // jedes Ding ist ein Werkzeug „gezählt markieren“
          expect(zaehle(s3, /data-zaehl="/g)).toBe(w.dinge.length);
        }
  });
});

describe('Rechenbild', () => {
  const teile = (r: Rechenbild) => {
    const da = r.dinge.filter((d) => d.ort === 'da');
    return { a: da.length, weg: da.filter((d) => d.weg).length, dazu: r.dinge.filter((d) => d.ort === 'dazu').length };
  };

  it('Stufe 1: ein Schritt, 1–3, ohne Zehnerübergang; Stufe 2: ein Schritt über den Zehner (bis 20 und 100); Stufe 3: weg und dazu', () => {
    for (const zr of ZAHLENRAEUME) {
      const plusMinus = new Set<string>();
      for (const r of alle(RECHENBILD, 1, zr)) {
        const { a, weg, dazu } = teile(r);
        expect(weg === 0 || dazu === 0).toBe(true);
        expect(weg + dazu).toBeGreaterThanOrEqual(1);
        expect(weg + dazu).toBeLessThanOrEqual(3);
        expect(ueberZehner(a, a - weg + dazu)).toBe(false);
        plusMinus.add(weg ? 'minus' : 'plus');
      }
      expect([...plusMinus].sort()).toEqual(['minus', 'plus']);
      for (const r of alle(RECHENBILD, 2, zr)) {
        const { a, weg, dazu } = teile(r);
        expect(weg === 0 || dazu === 0).toBe(true);
        if (zr !== 10) expect(ueberZehner(a, a - weg + dazu)).toBe(true);
      }
      for (const r of alle(RECHENBILD, 3, zr)) {
        const { a, weg, dazu } = teile(r);
        expect(weg).toBeGreaterThan(0);
        expect(dazu).toBeGreaterThan(0);
        expect(a).toBeLessThanOrEqual(59);
      }
    }
  });

  it('Löser zählt, was bleibt und was dazukommt; Zehner auf Leisten ab 20', () => {
    const r = baue(23, 4, 2, 'kreis', 'blau');
    expect(r.leisten).toHaveLength(2);
    expect(RECHENBILD.loesungen(r)).toEqual([{ art: 'zahl', wert: 21 }]);
    expect(RECHENBILD.loesungen(baue(10, 10, 0, 'kreis', 'blau'))).toEqual([{ art: 'zahl', wert: 0 }]);
  });

  it('Fallen: ein durchgestrichenes Ding auf dem Brettchen (kommt es oder geht es?) und zwei Dinge, die sich berühren → verworfen', () => {
    const r = baue(5, 0, 3, 'kreis', 'rot');
    const zweifel: Rechenbild = { ...r, dinge: r.dinge.map((d, k) => (k === 0 ? { ...d, weg: true } : d)) };
    expect(RECHENBILD.loesungen(zweifel).length).toBeGreaterThan(1);
    const dicht: Rechenbild = { ...r, dinge: r.dinge.map((d, k) => (k === 1 ? { ...d, x: r.dinge[0].x + 5 } : d)) };
    expect(RECHENBILD.loesungen(dicht).length).toBeGreaterThan(1);
  });

  it('Hilfe 3: Punkte = was bleibt, was weggeht (durchgestrichen), was dazukommt', () => {
    for (let stufe = 1; stufe <= 3; stufe++)
      for (const r of alle(RECHENBILD, stufe, 100, 300)) {
        const { a, weg, dazu } = teile(r);
        expect(zaehlePunkte(rechenbildPunkte(r))).toEqual({ erster: a - weg, weg, zweiter: dazu, leer: 0 });
        const svg = RECHENBILD.zeichne(r, { hilfe: 3, gewaehlt: null });
        expect(zaehle(svg, /data-punkt="/g)).toBe(a + dazu);
        // Stufe 2: genau die Änderung ist eingerahmt (Brettchen, durchgestrichene Dinge)
        expect(zaehle(RECHENBILD.zeichne(r, { hilfe: 2, gewaehlt: null }), /data-hilfe="teil"/g)).toBe((weg ? 1 : 0) + (dazu ? 1 : 0));
      }
  });

  it('dieselben zwei Zeichen in jeder Aufgabe: Pfeil genau dann, wenn etwas dazukommt; Strich an jedem Ding, das weggeht', () => {
    for (let stufe = 1; stufe <= 3; stufe++)
      for (const r of alle(RECHENBILD, stufe, 20, 300)) {
        const svg = RECHENBILD.zeichne(r, { hilfe: 0, gewaehlt: null });
        const { weg, dazu } = teile(r);
        expect(zaehle(svg, /data-zeichen="pfeil"/g)).toBe(dazu ? 1 : 0);
        expect(zaehle(svg, /data-zeichen="weg"/g)).toBe(weg);
      }
  });
});

describe('Rechenmaschine', () => {
  it('Stufen 1–2: was kommt heraus; Stufe 3: was ging hinein; Stufe 1 klein und ohne Zehnerübergang', () => {
    for (const zr of ZAHLENRAEUME) {
      for (const m of alle(RECHENMASCHINE, 1, zr)) {
        expect(m.aus).toBeNull();
        expect(m.zahl).toBeLessThanOrEqual(3);
        expect(ueberZehner(m.ein!, zahl(RECHENMASCHINE as Format<unknown>, m))).toBe(false);
      }
      for (const m of alle(RECHENMASCHINE, 2, zr)) expect(m.aus).toBeNull();
      const zeichen = new Set<string>();
      for (const m of alle(RECHENMASCHINE, 3, zr)) {
        expect(m.ein).toBeNull();
        expect(m.aus).not.toBeNull();
        zeichen.add(m.zeichen);
      }
      expect([...zeichen].sort()).toEqual(['+', '−']);
    }
  });

  it('Grenzfälle: 0 hinein, 100 heraus, 0 heraus', () => {
    const l = (m: Maschine) => RECHENMASCHINE.loesungen(m);
    expect(l({ ein: 0, zeichen: '+', zahl: 3, aus: null })).toEqual([{ art: 'zahl', wert: 3 }]);
    expect(l({ ein: 97, zeichen: '+', zahl: 3, aus: null })).toEqual([{ art: 'zahl', wert: 100 }]);
    expect(l({ ein: null, zeichen: '−', zahl: 30, aus: 70 })).toEqual([{ art: 'zahl', wert: 100 }]);
    expect(l({ ein: 5, zeichen: '−', zahl: 5, aus: null })).toEqual([{ art: 'zahl', wert: 0 }]);
  });

  it('Fallen: zwei Lücken (Schild ohne Zahl) → viele Lösungen; unmögliche Maschine → keine', () => {
    expect(RECHENMASCHINE.loesungen({ ein: 4, zeichen: '+', zahl: null, aus: null }).length).toBeGreaterThan(1);
    expect(RECHENMASCHINE.loesungen({ ein: null, zeichen: '+', zahl: 5, aus: 3 })).toHaveLength(0);
  });

  it('Hilfe 3: so viele Punkte wie die größere Zahl der Rechnung, die gesuchten leer oder in anderer Farbe', () => {
    for (let stufe = 1; stufe <= 3; stufe++)
      for (const m of alle(RECHENMASCHINE, stufe, 100, 300)) {
        const x = zahl(RECHENMASCHINE as Format<unknown>, m);
        const ein = m.ein ?? x;
        const aus = m.aus ?? x;
        const p = zaehlePunkte(maschinenPunkte(m));
        expect(p.erster + p.zweiter + p.leer + p.weg).toBe(Math.max(ein, aus));
        if (stufe === 3 && m.zeichen === '+') expect(p.leer).toBe(x);
      }
  });
});

describe('Größer oder kleiner', () => {
  it('Stufe 1: Kette a < ? < b; Stufe 2: auch b > ? > a; Stufe 3: zwei Schilder, das „?“ links und rechts', () => {
    for (const zr of ZAHLENRAEUME) {
      for (const g of alle(GROESSER_KLEINER, 1, zr)) {
        expect(g.kette).toBe(true);
        expect(g.bedingungen.every((b) => b.zeichen === '<')).toBe(true);
      }
      const richtungen = new Set(alle(GROESSER_KLEINER, 2, zr).map((g) => g.bedingungen[0].zeichen));
      expect([...richtungen].sort()).toEqual(['<', '>']);
      const seiten = new Set<string>();
      for (const g of alle(GROESSER_KLEINER, 3, zr)) {
        expect(g.kette).toBe(false);
        for (const b of g.bedingungen) seiten.add(`${b.links === null ? '?' : 'x'}${b.zeichen}${b.rechts === null ? '?' : 'x'}`);
        const [a, b] = grenzen(g);
        expect(b - a).toBe(2);
      }
      expect([...seiten].sort()).toEqual(['?<x', '?>x', 'x<?', 'x>?']);
    }
  });

  it('Grenzfälle: 0 < ? < 2 → 1; 98 < ? < 100 → 99', () => {
    const kette = (a: number, b: number): GroesserKleiner => ({ kette: true, bedingungen: [{ links: a, zeichen: '<', rechts: null }, { links: null, zeichen: '<', rechts: b }] });
    expect(GROESSER_KLEINER.loesungen(kette(0, 2))).toEqual([{ art: 'zahl', wert: 1 }]);
    expect(GROESSER_KLEINER.loesungen(kette(98, 100))).toEqual([{ art: 'zahl', wert: 99 }]);
  });

  it('Falle: 5 < ? < 8 hat zwei Lösungen; eine Bedingung allein viele → verworfen', () => {
    expect(GROESSER_KLEINER.loesungen({ kette: true, bedingungen: [{ links: 5, zeichen: '<', rechts: null }, { links: null, zeichen: '<', rechts: 8 }] })).toHaveLength(2);
    expect(GROESSER_KLEINER.loesungen({ kette: false, bedingungen: [{ links: null, zeichen: '>', rechts: 13 }] }).length).toBeGreaterThan(1);
  });

  it('Hilfe: Stufe 2 die erste Bedingung eingerahmt, die zweite im Halbschatten; Stufe 3 Punkte bis zur großen Zahl, einer leer', () => {
    for (let stufe = 1; stufe <= 3; stufe++)
      for (const g of alle(GROESSER_KLEINER, stufe, 20, 300)) {
        const s2 = GROESSER_KLEINER.zeichne(g, { hilfe: 2, gewaehlt: null });
        expect(zaehle(s2, /data-hilfe="teil"/g)).toBe(1);
        expect(zaehle(s2, /data-hilfe="schatten"/g)).toBe(1);
        const [a, b] = grenzen(g);
        expect(zaehlePunkte(gkPunkte(g))).toEqual({ erster: a, leer: 1, zweiter: 1, weg: 0 });
        expect(b).toBe(a + 2);
      }
  });
});

describe('Verdoppeln und halbieren', () => {
  it('Stufen 1–2 mit Dingen, Stufe 3 nur die Zahl; beide Bildzeichen kommen auf jeder Stufe vor; halbiert wird nur Gerades', () => {
    for (const zr of ZAHLENRAEUME)
      for (let stufe = 1; stufe <= 3; stufe++) {
        const arten = new Set<string>();
        for (const v of alle(VERDOPPELN, stufe, zr)) {
          arten.add(v.art);
          expect(v.dinge === null).toBe(stufe === 3);
          const n = v.dinge ? v.dinge.length : v.zahl!;
          if (v.art === 'halb') expect(n % 2).toBe(0);
          const svg = VERDOPPELN.zeichne(v, { hilfe: 0, gewaehlt: null });
          expect(zaehle(svg, new RegExp(`data-zeichen="${v.art}"`, 'g'))).toBe(1);
        }
        expect([...arten].sort()).toEqual(['doppelt', 'halb']);
      }
  });

  it('Fallen: ungerade Zahl halbieren → keine Lösung; zwei Dinge berühren sich → zwei Zahlen', () => {
    expect(VERDOPPELN.loesungen({ art: 'halb', zahl: 7, dinge: null, form: 'kreis', farbe: 'rot', hoehe: 0 })).toHaveLength(0);
    const v = mitDingen('doppelt', 4, 'kreis', 'rot');
    const dicht: Verdoppeln = { ...v, dinge: v.dinge!.map((d: Ding, k) => (k === 1 ? { ...d, x: v.dinge![0].x + 4 } : d)) };
    expect(VERDOPPELN.loesungen(dicht)).toEqual([{ art: 'zahl', wert: 8 }, { art: 'zahl', wert: 6 }]);
  });

  it('Grenzfälle: das Doppelte von 50 ist 100, die Hälfte von 2 ist 1', () => {
    expect(VERDOPPELN.loesungen({ art: 'doppelt', zahl: 50, dinge: null, form: 'kreis', farbe: 'rot', hoehe: 0 })).toEqual([{ art: 'zahl', wert: 100 }]);
    expect(VERDOPPELN.loesungen(mitDingen('halb', 2, 'kreis', 'rot'))).toEqual([{ art: 'zahl', wert: 1 }]);
  });

  it('Hilfe 3: zwei gleich große Teile in zwei Farben', () => {
    for (let stufe = 1; stufe <= 3; stufe++)
      for (const v of alle(VERDOPPELN, stufe, 100, 300)) {
        const p = zaehlePunkte(doppelPunkte(v));
        expect(p.erster).toBe(p.zweiter);
        expect(p.erster + p.zweiter).toBe(Math.max(zahl(VERDOPPELN as Format<unknown>, v), v.dinge ? v.dinge.length : v.zahl!));
      }
  });
});

describe('Klecks-Rätsel', () => {
  const form = (k: Klecks) => `${k.zeichen}${k.links === null ? 'vorn' : 'hinten'}`;

  it('Stufe 1: nur Plus, Klecks hinten, ohne Zehnerübergang; Stufe 2: drei Arten; Stufe 3: Klecks vorn', () => {
    for (const zr of ZAHLENRAEUME) {
      for (const k of alle(KLECKS, 1, zr)) {
        expect(form(k)).toBe('+hinten');
        expect(ueberZehner(k.links!, k.ergebnis!)).toBe(false);
      }
      expect([...new Set(alle(KLECKS, 2, zr).map(form))].sort()).toEqual(['+hinten', '+vorn', '−hinten']);
      expect([...new Set(alle(KLECKS, 3, zr).map(form))].sort()).toEqual(['+vorn', '−vorn']);
      for (const k of alle(KLECKS, 3, zr)) expect(k.ergebnis).not.toBeNull();
    }
  });

  it('Grenzfälle: Klecks 0 gibt es nicht im Generator; der Löser findet aber 0 und 100', () => {
    expect(KLECKS.loesungen({ links: 7, zeichen: '+', rechts: null, ergebnis: 7 })).toEqual([{ art: 'zahl', wert: 0 }]);
    expect(KLECKS.loesungen({ links: null, zeichen: '−', rechts: 40, ergebnis: 60 })).toEqual([{ art: 'zahl', wert: 100 }]);
  });

  it('Fallen: zwei Kleckse → viele Lösungen; 5 + Klecks = 3 → keine', () => {
    expect(KLECKS.loesungen({ links: null, zeichen: '+', rechts: null, ergebnis: 10 }).length).toBe(11);
    expect(KLECKS.loesungen({ links: 5, zeichen: '+', rechts: null, ergebnis: 3 })).toHaveLength(0);
  });

  it('Hilfe 3: was fehlt, ist leer oder durchgestrichen – so viele Punkte wie die Lösung', () => {
    for (let stufe = 1; stufe <= 3; stufe++)
      for (const k of alle(KLECKS, stufe, 100, 300)) {
        const p = zaehlePunkte(klecksPunkte(k));
        const x = zahl(KLECKS as Format<unknown>, k);
        if (k.zeichen === '+') expect(p.leer).toBe(x);
        else if (k.links !== null) expect(p.weg).toBe(x);
        else expect(p.erster + p.weg).toBe(x);
        // genau ein Klecks im Bild
        expect(zaehle(KLECKS.zeichne(k, { hilfe: 0, gewaehlt: null }), /data-klecks=""/g)).toBe(1);
      }
  });
});
