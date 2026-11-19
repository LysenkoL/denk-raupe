import { describe, expect, it } from 'vitest';
import { FORMATE } from '../src/aufgaben';
import { aufgabeAus, ZAHLENRAEUME, type FormatId, type Zahlenraum } from '../src/aufgaben/format';
import { mengeImBild, stufeGrenze } from '../src/aufgaben/bildteile';
import { BILD_GLEICHUNGEN, belegungen, startZeile, type BildGleichung } from '../src/aufgaben/bild-gleichungen';
import { MALAUFGABEN, moeglich, type Malaufgabe } from '../src/aufgaben/malaufgaben';
import { HUNDERTERFELD, hilfeWeg, SPALTEN, type Hunderterfeld } from '../src/aufgaben/hunderterfeld';
import { ZAHLENSTRAHL, hilfeStart, nachbarMarken, type Zahlenstrahl } from '../src/aufgaben/zahlenstrahl';
import { ENTDECKERPAECKCHEN, spaltenSchritt, type Paeckchen } from '../src/aufgaben/entdeckerpaeckchen';
import { RECHENSTRICH, type Rechenstrich } from '../src/aufgaben/rechenstrich';
import { KIND } from '../src/i18n/kind';

/**
 * Gruppe Г1б (Engine Bild, Antwort Zahl): Nr. 68, 73, 74, 75, 96, 98 nach docs/FORMATE.md, Abschnitt 4 –
 * Grenzfälle, Fallen für den Löser, Zahlenraum, Hilfe Stufen 2 und 3 auf dem Bild, das Bild verrät nichts.
 * (10 000 Aufgaben je Stufe und Zahlenraum, ein Samen – eine Aufgabe, Pass, Texte: tests/formate.test.ts,
 * tests/bereit.test.ts; Lernbeispiel: tests/lernbeispiel.test.ts; Bildschirm: tests/g1b-layout.test.ts.)
 */

const G1B: FormatId[] = ['bild-gleichungen', 'malaufgaben', 'hunderterfeld', 'zahlenstrahl', 'entdeckerpaeckchen', 'rechenstrich'];
const zahl = (wert: number) => ({ art: 'zahl' as const, wert });
const zaehle = (svg: string, muster: RegExp) => (svg.match(muster) ?? []).length;
const texte = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
const werte = (id: FormatId, b: unknown) => FORMATE[id].loesungen(b).map((l) => (l as { wert: number }).wert);

function aufgaben<B>(id: FormatId, n = 200, raeume: readonly Zahlenraum[] = ZAHLENRAEUME): { b: B; stufe: number; zahlenraum: Zahlenraum }[] {
  const f = FORMATE[id];
  const out: { b: B; stufe: number; zahlenraum: Zahlenraum }[] = [];
  for (const zahlenraum of raeume)
    for (let stufe = 1; stufe <= f.stufen; stufe++)
      for (let s = 0; s < n; s++) out.push({ b: aufgabeAus(f, s * 40503 + stufe, stufe, { zahlenraum }).bedingung as B, stufe, zahlenraum });
  return out;
}

describe('Г1б: gemeinsam', () => {
  it('Pass: Engine Bild, Antwort Zahl, nur Bildschirm, feste Sätze in kind.ts', () => {
    const satz: Record<FormatId, string> = {
      'bild-gleichungen': 'Wie viel ist die Frucht wert?',
      malaufgaben: 'Wie viele Plättchen sind es?',
      hunderterfeld: 'Welche Zahl gehört in das Feld?',
      zahlenstrahl: 'Welche Zahl zeigt der Pfeil?',
      entdeckerpaeckchen: 'Welche Zahl fehlt?',
      rechenstrich: 'Welche Zahl fehlt?',
    } as Record<FormatId, string>;
    for (const id of G1B) {
      const f = FORMATE[id];
      expect(f.motor).toBe('bild');
      expect(f.druck).toBe(false);
      expect(f.stufen).toBe(3);
      expect(KIND.auftrag[f.auftrag]).toBe(satz[id]);
      for (const { b } of aufgaben(id, 20)) expect(f.eingabe(b)).toEqual({ art: 'zahl' });
    }
  });

  it('jede Zahl der Aufgabe und jede Antwort liegt im Zahlenraum; die Grenze wird auch erreicht', () => {
    for (const id of G1B)
      for (const zahlenraum of ZAHLENRAEUME) {
        let groesste = 0;
        for (const { b } of aufgaben(id, 300, [zahlenraum])) {
          const zahlen = [...JSON.stringify(b).matchAll(/-?\d+/g)].map((m) => Number(m[0]));
          const l = werte(id, b)[0];
          // Plätze (Feld, Strich) sind keine Zahlen der Aufgabe, liegen aber ebenfalls unter 100
          expect(Math.max(l, ...zahlen), `${id} bis ${zahlenraum}`).toBeLessThanOrEqual(zahlenraum === 100 ? 100 : Math.max(zahlenraum, 99));
          expect(l, `${id} bis ${zahlenraum}`).toBeLessThanOrEqual(zahlenraum);
          expect(l).toBeGreaterThanOrEqual(0);
          groesste = Math.max(groesste, l);
        }
        expect(groesste, `${id} bis ${zahlenraum}`).toBeGreaterThan(zahlenraum * (id === 'rechenstrich' ? 0.35 : 0.7));
      }
  });

  it('anderer Zahlenraum → andere Aufgabe (der Generator liest die Einstellung)', () => {
    for (const id of G1B) {
      let anders = 0;
      for (let s = 0; s < 100; s++) if (JSON.stringify(aufgabeAus(FORMATE[id], s, 3, { zahlenraum: 20 }).bedingung) !== JSON.stringify(aufgabeAus(FORMATE[id], s, 3, { zahlenraum: 100 }).bedingung)) anders++;
      expect(anders, id).toBeGreaterThan(80);
    }
  });

  it('das Bild verrät die Lösung nicht: im Nest „?“, Hilfe 2 und 3 schreiben keine Zahl; die Zahl des Kindes steht im Nest', () => {
    for (const id of G1B) {
      const f = FORMATE[id];
      for (const { b } of aufgaben(id, 60)) {
        const svg0 = f.zeichne(b, { hilfe: 0, gewaehlt: null });
        expect(texte(svg0).filter((t) => t === '?'), id).toHaveLength(1);
        expect(svg0).not.toContain('data-hilfe');
        expect(svg0).not.toContain('data-inhalt');
        for (const hilfe of [2, 3] as const) expect(texte(f.zeichne(b, { hilfe, gewaehlt: null })), id).toEqual(texte(svg0));
        // die Zahl des Kindes steht sofort im Nest, ob sie stimmt oder nicht – das Nest sieht gleich aus
        const l = werte(id, b)[0];
        const richtig = f.zeichne(b, { hilfe: 0, gewaehlt: zahl(l) });
        const falsch = f.zeichne(b, { hilfe: 0, gewaehlt: zahl((l + 1) % 100) });
        expect(texte(richtig)).not.toContain('?');
        const ohneInhalt = (svg: string) => svg.replace(/<g data-inhalt="">.*?<\/g>/, 'X');
        expect(richtig).toContain('data-inhalt');
        expect(ohneInhalt(richtig)).toBe(ohneInhalt(falsch));
        // Vorrechnen (ähnliche Aufgabe, Hilfe 4): die Lösung steht im Nest
        expect(texte(f.zeichne(b, { hilfe: 0, gewaehlt: null, vorrechnen: true }))).toContain(String(l));
      }
    }
  });

  it('Hilfe 2 hebt einen Teil warm hervor; Hilfe 3 zeigt dazu einen Schritt', () => {
    for (const id of G1B) {
      const f = FORMATE[id];
      for (const { b } of aufgaben(id, 60)) {
        const svg2 = f.zeichne(b, { hilfe: 2, gewaehlt: null });
        const svg3 = f.zeichne(b, { hilfe: 3, gewaehlt: null });
        expect(zaehle(svg2, /data-hilfe="teil"/g), id).toBeGreaterThan(0);
        expect(svg2).not.toContain('data-hilfe="schritt"');
        expect(zaehle(svg3, /data-hilfe="teil"/g), id).toBeGreaterThan(0);
        expect(zaehle(svg3, /data-hilfe="schritt"/g), id).toBeGreaterThan(0);
      }
    }
  });

  it('Stufe 1: Zahlen eine Stufe unter dem Zahlenraum (wie die Zahlenmauer)', () => {
    expect(ZAHLENRAEUME.map((r) => stufeGrenze(1, r))).toEqual([10, 10, 20]);
    for (const s of [2, 3]) expect(ZAHLENRAEUME.map((r) => stufeGrenze(s, r))).toEqual([10, 20, 100]);
  });
});

describe('Bild-Gleichungen (Nr. 68)', () => {
  const B = BILD_GLEICHUNGEN;

  it('Falle (docs/LOESER.md): zwei Früchte, von denen nur die Summe bekannt ist – viele Lösungen, verworfen', () => {
    expect(B.loesungen({ zeilen: [{ fruechte: ['erdbeere', 'zitrone'], summe: 7 }], frage: 'zitrone' })).toHaveLength(8);
    // gefragte Frucht kommt in keiner Zeile vor: jede Zahl 0–100
    expect(B.loesungen({ zeilen: [{ fruechte: ['erdbeere', 'erdbeere'], summe: 8 }], frage: 'birne' })).toHaveLength(101);
    // widersprüchlich: keine Lösung
    expect(B.loesungen({ zeilen: [{ fruechte: ['erdbeere', 'erdbeere'], summe: 7 }], frage: 'erdbeere' })).toHaveLength(0);
  });

  it('Grenzfälle: Beispiel aus dem Brief, kleinste und größte Werte', () => {
    expect(werte('bild-gleichungen', { zeilen: [{ fruechte: ['erdbeere', 'erdbeere'], summe: 8 }, { fruechte: ['erdbeere', 'zitrone'], summe: 7 }], frage: 'zitrone' })).toEqual([3]);
    expect(werte('bild-gleichungen', { zeilen: [{ fruechte: ['birne', 'birne'], summe: 2 }, { fruechte: ['birne', 'orange'], summe: 3 }], frage: 'orange' })).toEqual([2]);
    expect(werte('bild-gleichungen', { zeilen: [{ fruechte: ['birne', 'birne'], summe: 100 }, { fruechte: ['birne', 'orange'], summe: 99 }], frage: 'orange' })).toEqual([49]);
    // Stufe 3: das Paar steckt in der langen Zeile
    expect(werte('bild-gleichungen', { zeilen: [{ fruechte: ['pflaume', 'pflaume', 'zitrone'], summe: 100 }, { fruechte: ['pflaume', 'zitrone'], summe: 60 }], frage: 'zitrone' })).toEqual([20]);
  });

  it('Stufen: 1 – zwei Früchte, eine Zeile aus gleichen; 2 – drei Früchte; 3 – keine Zeile aus gleichen, Paar in der langen Zeile', () => {
    for (const { b, stufe } of aufgaben<BildGleichung>('bild-gleichungen', 300)) {
      const sorten = new Set(b.zeilen.flatMap((z) => z.fruechte));
      const gleich = b.zeilen.some((z) => new Set(z.fruechte).size === 1);
      expect(sorten.size).toBe(stufe === 2 ? 3 : 2);
      expect(gleich).toBe(stufe < 3);
      // alle Werte ab 1, verschieden; jede Frucht hat genau einen Wert
      const bel = belegungen(b);
      expect(bel).toHaveLength(1);
      const w = [...bel[0].values()];
      expect(Math.min(...w)).toBeGreaterThanOrEqual(1);
      expect(new Set(w).size).toBe(w.length);
      if (stufe === 3) {
        const kurz = b.zeilen[startZeile(b)].fruechte;
        const lang = b.zeilen[1 - startZeile(b)].fruechte;
        expect(lang.slice(-kurz.length)).toEqual(kurz);
      }
      // die gefragte Frucht ist nie die, deren Wert der Schritt zeigt
      if (stufe < 3) expect(b.frage).not.toBe(b.zeilen[startZeile(b)].fruechte[0]);
    }
  });

  it('Hilfe 3: die Tafel zeigt den Wert der ersten Frucht als Stangen und Perlen, nie den der gefragten', () => {
    for (const { b, stufe } of aufgaben<BildGleichung>('bild-gleichungen', 100)) {
      const svg = B.zeichne(b, { hilfe: 3, gewaehlt: null });
      if (stufe < 3) {
        const start = b.zeilen[startZeile(b)];
        expect(mengeImBild(svg)).toBe(start.summe / start.fruechte.length);
      } else expect(mengeImBild(svg)).toBe(0);
    }
  });
});

describe('Malaufgaben (Nr. 73)', () => {
  const M = MALAUFGABEN;

  it('Falle: ungleich lange Reihen sind keine Malaufgabe – verworfen', () => {
    expect(M.loesungen({ reihen: [4, 4, 3] })).toHaveLength(0);
    expect(M.loesungen({ reihen: [] })).toHaveLength(0);
  });

  it('Grenzfälle: 2 · 2, 10 · 10, eine Reihe', () => {
    expect(werte('malaufgaben', { reihen: [2, 2] })).toEqual([4]);
    expect(werte('malaufgaben', { reihen: Array(10).fill(10) })).toEqual([100]);
    expect(werte('malaufgaben', { reihen: [3] })).toEqual([3]);
  });

  it('Stufen: 1 – Reihen zu 2, 5, 10; 2 – zu 2 bis 5; 3 – eine Seite 6 bis 10 (bis 10 wie Stufe 2); jedes Bild zeigt alle Plättchen', () => {
    for (const { b, stufe, zahlenraum } of aufgaben<Malaufgabe>('malaufgaben', 300)) {
      const r = b.reihen.length;
      const c = b.reihen[0];
      expect(r).toBeGreaterThanOrEqual(2);
      if (stufe === 1) expect([2, 5, 10]).toContain(c);
      if (stufe === 2 || (stufe === 3 && zahlenraum === 10)) expect(c <= 5 && r <= 5).toBe(true);
      if (stufe === 3 && zahlenraum > 10) expect(Math.max(r, c)).toBeGreaterThanOrEqual(6);
      expect(zaehle(M.zeichne(b, { hilfe: 0, gewaehlt: null }), /data-plaettchen/g)).toBe(r * c);
    }
    expect(moeglich(3, { zahlenraum: 100 }).some(([r, c]) => r * c === 100)).toBe(true);
  });

  it('Hilfe: Stufe 2 rahmt die erste Reihe, die übrigen im Halbschatten; Stufe 3 rahmt jede Reihe', () => {
    for (const { b } of aufgaben<Malaufgabe>('malaufgaben', 50)) {
      const svg2 = M.zeichne(b, { hilfe: 2, gewaehlt: null });
      const svg3 = M.zeichne(b, { hilfe: 3, gewaehlt: null });
      expect(zaehle(svg2, /data-hilfe="teil"/g)).toBe(1);
      expect(zaehle(svg2, /data-hilfe="schatten"/g)).toBe(b.reihen.length - 1);
      expect(zaehle(svg3, /data-hilfe="schritt"/g)).toBe(b.reihen.length - 1);
      expect(zaehle(svg3, /data-hilfe="schatten"/g)).toBe(0);
    }
  });
});

describe('Hunderterfeld (Nr. 74)', () => {
  const H = HUNDERTERFELD;

  it('Falle: ohne gezeigte Zahl bleibt offen, ob das Feld bei 0 oder 1 beginnt – verworfen', () => {
    expect(werte('hunderterfeld', { zeilen: 10, marken: [], frage: 5 })).toEqual([5, 6]);
    // widersprüchliche Zahlen: keine Lösung
    expect(H.loesungen({ zeilen: 2, marken: [{ feld: 0, wert: 1 }, { feld: 1, wert: 5 }], frage: 3 })).toHaveLength(0);
  });

  it('Grenzfälle: Ecken des Feldes, 1 und 100, Feld ab 0', () => {
    expect(werte('hunderterfeld', { zeilen: 10, marken: [{ feld: 98, wert: 99 }], frage: 99 })).toEqual([100]);
    expect(werte('hunderterfeld', { zeilen: 10, marken: [{ feld: 99, wert: 100 }], frage: 0 })).toEqual([1]);
    expect(werte('hunderterfeld', { zeilen: 10, marken: [{ feld: 9, wert: 9 }], frage: 90 })).toEqual([90]);
    expect(werte('hunderterfeld', { zeilen: 1, marken: [{ feld: 0, wert: 1 }], frage: 9 })).toEqual([10]);
  });

  it('Feldgröße aus dem Zahlenraum; Stufen: 1 daneben in der Zeile, 2 Spalte oder weit in der Zeile, 3 schräg', () => {
    for (const { b, stufe, zahlenraum } of aufgaben<Hunderterfeld>('hunderterfeld', 300)) {
      expect(b.zeilen * SPALTEN).toBe(zahlenraum);
      const m = b.marken[0];
      const dz = Math.abs(Math.floor(m.feld / 10) - Math.floor(b.frage / 10));
      const ds = Math.abs((m.feld % 10) - (b.frage % 10));
      if (stufe === 1) expect([dz, ds <= 3 && ds >= 1]).toEqual([0, true]);
      if (stufe === 2) expect((ds === 0 && dz >= 1 && dz <= 3) || (dz === 0 && ds >= 4 && ds <= 6)).toBe(true);
      if (stufe === 3) expect(b.zeilen === 1 ? ds >= 5 : dz >= 1 && ds >= 1).toBe(true);
      // keine zweite Zahl in Zeile oder Spalte des Fragefelds
      for (const w of b.marken.slice(1)) expect(Math.floor(w.feld / 10) !== Math.floor(b.frage / 10) && w.feld % 10 !== b.frage % 10).toBe(true);
      expect(b.marken.every((x) => x.feld !== b.frage)).toBe(true);
    }
  });

  it('Hilfe 3: Hüpfer erst senkrecht bis in die Zeile des Fragefelds, sonst waagerecht bis hin – einer je Feld', () => {
    for (const { b } of aufgaben<Hunderterfeld>('hunderterfeld', 80)) {
      const weg = hilfeWeg(b);
      expect(weg[0]).toBe(b.marken[0].feld);
      const ende = weg[weg.length - 1];
      expect(Math.floor(ende / 10)).toBe(Math.floor(b.frage / 10));
      const svg = H.zeichne(b, { hilfe: 3, gewaehlt: null });
      expect(zaehle(svg.slice(svg.indexOf('data-hilfe="schritt"')), /<path d="M/g)).toBe(2 * (weg.length - 1));
    }
  });
});

describe('Zahlenstrahl (Nr. 75)', () => {
  const Z = ZAHLENSTRAHL;
  const strahl = (n: number, marken: [number, number][], pfeil: number): Zahlenstrahl => ({ striche: Array(n).fill('kurz'), marken: marken.map(([strich, wert]) => ({ strich, wert })), pfeil });

  it('Falle: eine einzige Zahl sagt nicht, wie weit ein Strich ist – viele Lösungen, verworfen', () => {
    expect(Z.loesungen(strahl(11, [[5, 50]], 7)).length).toBeGreaterThan(1);
    expect(Z.loesungen(strahl(11, [], 7)).length).toBeGreaterThan(1);
    // Zahlen, die zu keinem gleichmäßigen Strahl passen
    expect(Z.loesungen(strahl(11, [[0, 0], [5, 5], [10, 20]], 7))).toHaveLength(0);
  });

  it('Grenzfälle: Pfeil am ersten und letzten Strich, Schritt 10 bis 100, rückwärts nie nötig', () => {
    expect(werte('zahlenstrahl', strahl(11, [[0, 0], [10, 100]], 9))).toEqual([90]);
    expect(werte('zahlenstrahl', strahl(11, [[5, 5], [10, 10]], 0))).toEqual([0]);
    expect(werte('zahlenstrahl', strahl(21, [[0, 80], [20, 100]], 19))).toEqual([99]);
    expect(werte('zahlenstrahl', strahl(6, [[0, 0], [5, 10]], 2))).toEqual([4]);
  });

  it('Stufen: 1 Fünfer beschriftet, Schritt 1; 2 nur Zehner; 3 Schritt größer als 1, nur die Enden', () => {
    for (const { b, stufe } of aufgaben<Zahlenstrahl>('zahlenstrahl', 300)) {
      const d = (b.marken[1].wert - b.marken[0].wert) / (b.marken[1].strich - b.marken[0].strich);
      expect(b.marken.some((m) => m.strich === b.pfeil)).toBe(false);
      if (stufe === 1) expect([d, b.marken.every((m) => m.wert % 5 === 0)]).toEqual([1, true]);
      if (stufe === 2) expect([d, b.marken.every((m) => m.wert % 10 === 0)]).toEqual([1, true]);
      if (stufe === 3) expect([d > 1, b.marken.map((m) => m.strich)]).toEqual([true, [0, b.striche.length - 1]]);
      // lange Striche genau bei Zehnern, mittlere bei Fünfern
      const a = b.marken[0].wert - b.marken[0].strich * d;
      b.striche.forEach((s, i) => expect(s).toBe((a + i * d) % 10 === 0 ? 'lang' : (a + i * d) % 5 === 0 ? 'mittel' : 'kurz'));
    }
  });

  it('Hilfe: Stufe 2 rahmt die zwei Zahlen, zwischen denen abgelesen wird; Stufe 3 hüpft je Strich von der nächsten Zahl', () => {
    for (const { b } of aufgaben<Zahlenstrahl>('zahlenstrahl', 80)) {
      const svg2 = Z.zeichne(b, { hilfe: 2, gewaehlt: null });
      expect(zaehle(svg2, /data-hilfe="teil"/g)).toBe(nachbarMarken(b).length);
      expect(zaehle(svg2, /data-hilfe="schatten"/g)).toBe(b.marken.length - nachbarMarken(b).length);
      const svg3 = Z.zeichne(b, { hilfe: 3, gewaehlt: null });
      const schritt = svg3.slice(svg3.indexOf('data-hilfe="schritt"'));
      expect(zaehle(schritt.slice(0, schritt.indexOf('</g>')), /<path/g)).toBe(Math.abs(b.pfeil - hilfeStart(b)));
    }
  });
});

describe('Entdeckerpäckchen (Nr. 96)', () => {
  const E = ENTDECKERPAECKCHEN;

  it('Falle: Rechnung und Regel der Spalte geben verschiedene Zahlen – zwei Lösungen, verworfen', () => {
    expect(werte('entdeckerpaeckchen', { zeichen: 'plus', zeilen: [[1, 1, 2], [2, 2, 4], [3, 3, 6], [4, 3, null]] }).sort()).toEqual([7, 8]);
    // eine Aufgabe darüber stimmt nicht: keine Lösung
    expect(E.loesungen({ zeichen: 'plus', zeilen: [[1, 1, 3], [2, 2, 4], [3, 3, 6], [4, 4, null]] })).toHaveLength(0);
    // zwei Lücken: verworfen
    expect(E.loesungen({ zeichen: 'plus', zeilen: [[1, 1, 2], [2, 2, 4], [3, 3, 6], [4, null, null]] })).toHaveLength(0);
  });

  it('Grenzfälle: Beispiel aus dem Brief, Null, 100, minus, Lücke vorn', () => {
    expect(werte('entdeckerpaeckchen', { zeichen: 'plus', zeilen: [[9, 1, 10], [8, 2, 10], [7, 3, 10], [6, 4, null]] })).toEqual([10]);
    expect(werte('entdeckerpaeckchen', { zeichen: 'minus', zeilen: [[3, 0, 3], [3, 1, 2], [3, 2, 1], [3, 3, null]] })).toEqual([0]);
    expect(werte('entdeckerpaeckchen', { zeichen: 'plus', zeilen: [[70, 0, 70], [80, 0, 80], [90, 0, 90], [null, 0, 100]] })).toEqual([100]);
    expect(werte('entdeckerpaeckchen', { zeichen: 'minus', zeilen: [[15, 5, 10], [16, 6, 10], [17, 7, 10], [null, 8, 10]] })).toEqual([18]);
  });

  it('Stufen: 1 nur plus, Schritte eins, Lücke im Ergebnis; 2 Schritte bis zwei, Lücke hinten; 3 Lücke überall', () => {
    const luecken = new Set<number>();
    for (const { b, stufe } of aufgaben<Paeckchen>('entdeckerpaeckchen', 300)) {
      expect(b.zeilen).toHaveLength(4);
      const sp = b.zeilen[3].indexOf(null);
      const da = (b.zeilen[1][0] as number) - (b.zeilen[0][0] as number);
      const db = (b.zeilen[1][1] as number) - (b.zeilen[0][1] as number);
      if (stufe === 1) expect([b.zeichen, sp, Math.abs(da) <= 1 && Math.abs(db) <= 1]).toEqual(['plus', 2, true]);
      if (stufe === 2) expect([sp > 0, Math.abs(da) <= 2 && Math.abs(db) <= 2]).toEqual([true, true]);
      if (stufe === 3) luecken.add(sp);
    }
    expect([...luecken].sort()).toEqual([0, 1, 2]);
  });

  it('Hilfe: Stufe 2 rahmt die Spalte über der Lücke; Stufe 3 zeigt den Schritt als Zeichen und Punkte; gleichbleibend → ähnliche Aufgabe', () => {
    for (const { b } of aufgaben<Paeckchen>('entdeckerpaeckchen', 80)) {
      const svg2 = E.zeichne(b, { hilfe: 2, gewaehlt: null });
      expect(zaehle(svg2, /data-hilfe="teil"/g)).toBe(1);
      expect(zaehle(svg2, /data-hilfe="schatten"/g)).toBe(6);
      const d = spaltenSchritt(b);
      const svg3 = E.zeichne(b, { hilfe: 3, gewaehlt: null });
      expect(mengeImBild(svg3)).toBe(3 * Math.abs(d));
      expect(E.schrittVerraet!(b)).toBe(d === 0);
    }
  });
});

describe('Rechenstrich (Nr. 98)', () => {
  const R = RECHENSTRICH;
  const r = (start: number, sp: [('plus' | 'minus'), number | null][], ziel: number | null): Rechenstrich => ({ start, spruenge: sp.map(([zeichen, laenge]) => ({ zeichen, laenge })), ziel });

  it('Falle: Ziel und ein Sprung fehlen zugleich, oder zwei Sprünge fehlen – viele Lösungen, verworfen', () => {
    expect(R.loesungen(r(38, [['plus', 2], ['plus', null]], null)).length).toBeGreaterThan(1);
    expect(R.loesungen(r(38, [['plus', null], ['plus', null]], 55)).length).toBeGreaterThan(1);
    // nichts gefragt, oder Sprung aus 0–100 hinaus: keine Lösung
    expect(R.loesungen(r(38, [['plus', 2], ['plus', 15]], 55))).toHaveLength(0);
    expect(R.loesungen(r(95, [['plus', 5], ['plus', 15]], null))).toHaveLength(0);
  });

  it('Grenzfälle: Beispiel aus dem Brief, bis 0 und bis 100, umgekehrt', () => {
    expect(werte('rechenstrich', r(38, [['plus', 2], ['plus', 15]], null))).toEqual([55]);
    expect(werte('rechenstrich', r(38, [['plus', 2], ['plus', null]], 55))).toEqual([15]);
    expect(werte('rechenstrich', r(38, [['plus', null], ['plus', 15]], 55))).toEqual([2]);
    expect(werte('rechenstrich', r(53, [['minus', 3], ['minus', 50]], null))).toEqual([0]);
    expect(werte('rechenstrich', r(97, [['plus', 3], ['plus', null]], 100))).toEqual([0]);
  });

  it('Stufen: 1 vorwärts ohne Zehnerübergang; 2 erster Sprung genau bis zum Zehner; 3 Ziel da, ein Sprung fehlt', () => {
    for (const { b, stufe, zahlenraum } of aufgaben<Rechenstrich>('rechenstrich', 300)) {
      expect(b.spruenge).toHaveLength(2);
      const l = werte('rechenstrich', b)[0];
      const laengen = b.spruenge.map((s) => s.laenge ?? l);
      const mitte = b.spruenge[0].zeichen === 'plus' ? b.start + laengen[0] : b.start - laengen[0];
      expect(new Set(b.spruenge.map((s) => s.zeichen)).size).toBe(1);
      expect(laengen.every((x) => x >= 1)).toBe(true);
      if (stufe === 1) {
        expect([b.spruenge[0].zeichen, b.ziel]).toEqual(['plus', null]);
        const ende = mitte + laengen[1];
        for (const [a, c] of [[b.start, mitte], [mitte, ende]]) expect(Math.floor(a / 10)).toBe(Math.floor((c - 1) / 10));
      }
      if (stufe >= 2 && zahlenraum > 10) expect(mitte % 10).toBe(0);
      if (stufe === 3) expect([b.ziel !== null, b.spruenge.filter((s) => s.laenge === null).length]).toEqual([true, 1]);
      else expect(b.spruenge.every((s) => s.laenge !== null)).toBe(true);
    }
  });

  it('Hilfe: Stufe 2 hebt den ersten Sprung hervor, der zweite im Halbschatten; Stufe 3 zeigt die Landestelle als Stangen und Perlen', () => {
    for (const { b } of aufgaben<Rechenstrich>('rechenstrich', 80)) {
      const svg2 = R.zeichne(b, { hilfe: 2, gewaehlt: null });
      expect(zaehle(svg2, /data-hilfe="schatten"/g)).toBe(1);
      const l = werte('rechenstrich', b)[0];
      const laenge0 = b.spruenge[0].laenge ?? l;
      const mitte = b.spruenge[0].zeichen === 'plus' ? b.start + laenge0 : b.start - laenge0;
      expect(mengeImBild(R.zeichne(b, { hilfe: 3, gewaehlt: null }))).toBe(mitte);
    }
  });
});
