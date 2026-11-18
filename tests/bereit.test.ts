import { describe, expect, it } from 'vitest';
import { FORMATE } from '../src/aufgaben';
import { aufgabeAus, ZAHLENRAEUME, type FormatId } from '../src/aufgaben/format';
import { abhaengig, hilfePunkte, PUNKTE_JE_REIHE, ZAHLENMAUER, type Mauer } from '../src/aufgaben/zahlenmauer';
import { MUSTER, MERKMALE, rahmenVon, type Element, type Muster } from '../src/aufgaben/muster';
import { blassNachSchritt, passt, schrittVerraet, WER_IST_ES, type Hinweis, type Raupe, type WerIstEs } from '../src/aufgaben/wer-ist-es';
import { gleich } from '../src/perlen/antwort';
import de from '../src/i18n/de.json';
import uk from '../src/i18n/uk.json';
import { ELTERN_TEILE, elternSchluessel, elternTexte, setSprache } from '../src/app/i18n';

/**
 * Die drei Formate nach den Kriterien der Fertigkeit (docs/FORMATE.md, Abschnitt 4; docs/PLAN.md, A8):
 * Grenzfälle, Fallen für den Löser, Hilfe Stufen 2 und 3 auf dem Bild, Texte für Eltern.
 * (Durchlauf von 10 000 Aufgaben, ein Samen – eine Aufgabe, Pass: tests/formate.test.ts;
 * Lernbeispiel: tests/lernbeispiel.test.ts; Bildschirm: tests/layout.test.ts.)
 */

const IDS = Object.keys(FORMATE) as FormatId[];
const ANZAHL = 300;

/** Aufgaben aller Stufen und Zahlenräume, je `n` */
function aufgaben<B>(id: FormatId, n = ANZAHL): { b: B; stufe: number }[] {
  const f = FORMATE[id];
  const out: { b: B; stufe: number }[] = [];
  for (const zahlenraum of ZAHLENRAEUME)
    for (let stufe = 1; stufe <= f.stufen; stufe++)
      for (let s = 0; s < n; s++) out.push({ b: aufgabeAus(f, s * 40503 + stufe, stufe, { zahlenraum }).bedingung as B, stufe });
  return out;
}

const zaehle = (svg: string, muster: RegExp) => (svg.match(muster) ?? []).length;
/** alle Zahlen und Zeichen, die als Text im Bild stehen */
const texte = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);

/** Mauer aus der unteren Reihe; `fehlt` = fehlender Stein */
function mauer(basis: number[], fehlt: [number, number]): Mauer {
  const reihen = [basis];
  while (reihen[reihen.length - 1].length > 1) {
    const u = reihen[reihen.length - 1];
    reihen.push(u.slice(1).map((v, i) => u[i] + v));
  }
  return { reihen, fehlt, grenze: 100 };
}
const wert = (m: Mauer) => m.reihen[m.fehlt[0]][m.fehlt[1]];

describe('Zahlenmauer: Grenzfälle', () => {
  it('kleinste und größte Zahlen, Ecksteine: der Löser findet genau die eine Zahl', () => {
    const faelle: Mauer[] = [
      mauer([0, 0, 0], [2, 0]), // nur Nullen
      mauer([0, 0, 0], [0, 0]),
      mauer([40, 20, 20], [2, 0]), // oben 100
      mauer([40, 20, 20], [0, 0]), // unten links, oben 100
      mauer([40, 20, 20], [0, 2]), // unten rechts
      mauer([10, 15, 15, 0], [3, 0]), // vier Reihen, oben 100
      mauer([10, 15, 15, 0], [0, 0]),
      mauer([10, 15, 15, 0], [0, 3]), // Null als Eckstein
      mauer([1, 1], [0, 1]), // kleinste Mauer, Stein unten rechts
    ];
    for (const m of faelle) expect(ZAHLENMAUER.loesungen(m), JSON.stringify(m)).toEqual([{ art: 'zahl', wert: wert(m) }]);
  });

  it('erzeugte Mauern: jede Stelle fehlt einmal, die Grenze wird erreicht, Stufe 1 enthält auch die 0', () => {
    for (const zahlenraum of ZAHLENRAEUME)
      for (let stufe = 1; stufe <= 3; stufe++) {
        const stellen = new Set<string>();
        let oben = 0;
        let null_ = false;
        for (let s = 0; s < 3000; s++) {
          const m = aufgabeAus(ZAHLENMAUER, s * 13, stufe, { zahlenraum }).bedingung;
          stellen.add(String(m.fehlt));
          oben = Math.max(oben, m.reihen[m.reihen.length - 1][0]);
          null_ ||= m.reihen.flat().includes(0);
          // die oberste Zahl ist nie kleiner als 4: die Mauer hat immer etwas zu rechnen
          expect(m.reihen[m.reihen.length - 1][0]).toBeGreaterThanOrEqual(4);
        }
        const n = stufe === 3 ? 4 : 3;
        // Stufe 1: nur oben und in der Mitte; Stufen 2 und 3: jeder Stein, auch die Ecksteine unten
        expect(stellen.size, `Stufe ${stufe} bis ${zahlenraum}`).toBe(stufe === 1 ? (n * (n + 1)) / 2 - n : (n * (n + 1)) / 2);
        expect(oben).toBe(aufgabeAus(ZAHLENMAUER, 1, stufe, { zahlenraum }).bedingung.grenze);
        if (stufe === 1) expect(null_).toBe(true);
      }
  });
});

describe('Zahlenmauer: Falle für den Löser – unbrauchbare Mauer wird verworfen', () => {
  it('ein anderer Stein stimmt nicht: keine Lösung', () => {
    const m = mauer([2, 3, 4], [1, 0]);
    const kaputt: Mauer = { ...m, reihen: m.reihen.map((r, i) => (i === 2 ? [r[0] + 1] : r)) };
    expect(ZAHLENMAUER.loesungen(kaputt)).toHaveLength(0);
  });

  it('die Lösung läge über 100: keine Lösung', () => {
    expect(ZAHLENMAUER.loesungen(mauer([60, 60], [1, 0]))).toHaveLength(0);
  });
});

describe('Zahlenmauer: Hilfe auf dem Bild', () => {
  const alle = aufgaben<Mauer>('zahlenmauer');

  it('Stufe 2: genau die zwei Steine, von denen die Antwort abhängt; die übrigen im Halbschatten; kein Text dazu', () => {
    for (const { b } of alle) {
      const svg0 = ZAHLENMAUER.zeichne(b, { hilfe: 0, gewaehlt: null });
      const svg2 = ZAHLENMAUER.zeichne(b, { hilfe: 2, gewaehlt: null });
      expect(svg0).not.toContain('data-hilfe');
      expect(zaehle(svg2, /data-hilfe="teil"/g)).toBe(2);
      // alle Steine außer dem fehlenden und den zwei hervorgehobenen
      expect(zaehle(svg2, /data-hilfe="schatten"/g)).toBe(b.reihen.flat().length - 3);
      // die hervorgehobenen Steine tragen ihre Zahlen
      const teile = [...svg2.matchAll(/<g data-hilfe="teil">.*?<text[^>]*>(\d+)<\/text><\/g>/g)].map((m) => Number(m[1]));
      expect(teile.sort()).toEqual(abhaengig(b).steine.map(([r, i]) => b.reihen[r][i]).sort());
      // Hilfe ohne Text: dieselben Texte wie ohne Hilfe, der fehlende Stein bleibt „?“
      expect(texte(svg2)).toEqual(texte(svg0));
      expect(texte(svg2)).toContain('?');
      expect(svg2).not.toContain('Schau');
    }
  });

  it('Stufe 3: Summe als Punkte, in Zehnerreihen mit Lücke nach fünf; keine Zahl dazu, „?“ bleibt', () => {
    for (const { b } of alle) {
      const svg0 = ZAHLENMAUER.zeichne(b, { hilfe: 0, gewaehlt: null });
      const svg3 = ZAHLENMAUER.zeichne(b, { hilfe: 3, gewaehlt: null });
      expect(zaehle(svg3, /data-hilfe="teil"/g)).toBe(2);
      expect(svg3).toContain('data-hilfe="schritt"');
      expect(texte(svg3)).toEqual(texte(svg0));
      const punkte = [...svg3.matchAll(/<circle data-punkt="(\w+)" cx="([\d.]+)" cy="([\d.]+)"/g)].map((m) => ({ art: m[1], x: Number(m[2]), y: Number(m[3]) }));
      const { steine, rechnung } = abhaengig(b);
      const w = (s: [number, number]) => b.reihen[s[0]][s[1]];
      const anzahl = (art: string) => punkte.filter((p) => p.art === art).length;
      if (rechnung === 'plus') {
        expect([anzahl('erster'), anzahl('zweiter'), anzahl('leer')]).toEqual([w(steine[0]), w(steine[1]), 0]);
      } else {
        // ergänzen: so viele Punkte wie der Stein darüber, die des Nachbarn voll
        expect([anzahl('zweiter'), anzahl('erster')]).toEqual([w(steine[1]), 0]);
        expect(punkte).toHaveLength(w(steine[0]));
      }
      expect(punkte.map((p) => p.art)).toEqual(hilfePunkte(b));
      // Fünfer und Zehner: höchstens zehn Punkte je Reihe; zwischen dem 5. und 6. eine größere Lücke
      const reihen = new Map<number, number[]>();
      for (const p of punkte) reihen.set(p.y, [...(reihen.get(p.y) ?? []), p.x]);
      for (const xs of reihen.values()) {
        expect(xs.length).toBeLessThanOrEqual(PUNKTE_JE_REIHE);
        const abstaende = xs.slice(1).map((x, k) => x - xs[k]);
        abstaende.forEach((d, k) => expect(d, `Abstand ${k + 1}–${k + 2}`).toBeCloseTo(k === 4 ? abstaende[0] + 10 : abstaende[0], 5));
      }
      // nur die letzte Reihe ist angefangen
      const voll = [...reihen.values()].slice(0, -1);
      for (const xs of voll) expect(xs).toHaveLength(PUNKTE_JE_REIHE);
    }
  });

  it('der Schritt wird an der eigenen Aufgabe gezeigt (er nennt keine Zahl)', () => {
    expect(ZAHLENMAUER.schrittVerraet).toBeUndefined();
  });
});

const el = (form: Element['form'], farbe: Element['farbe']): Element => ({ form, farbe });

describe('Muster: Grenzfälle', () => {
  it('Länge der Wiederholung je Stufe; kürzeste und längste Reihe kommen vor; immer mindestens zwei ganze Wiederholungen', () => {
    const erwartet: Record<number, { perioden: number[]; laengen: number[] }> = {
      1: { perioden: [2], laengen: [5] },
      2: { perioden: [3], laengen: [6, 7, 8] },
      3: { perioden: [3], laengen: [6, 7, 8] },
    };
    for (let stufe = 1; stufe <= 3; stufe++) {
      const perioden = new Set<number>();
      const laengen = new Set<number>();
      for (let s = 0; s < 3000; s++) {
        const m = aufgabeAus(MUSTER, s * 11, stufe).bedingung;
        perioden.add(m.periode);
        laengen.add(m.reihe.length);
        expect(m.reihe.length).toBeGreaterThanOrEqual(2 * m.periode);
        expect(MUSTER.loesungen(m)).toEqual([{ art: 'form', ...m.reihe[m.reihe.length - m.periode] }]);
      }
      expect([...perioden].sort()).toEqual(erwartet[stufe].perioden);
      expect([...laengen].sort()).toEqual(erwartet[stufe].laengen);
    }
  });

  it('Stufe 2: ABC und AAB kommen beide vor; Stufe 3: dieselbe Form in zwei Farben oder dieselbe Farbe an zwei Formen', () => {
    let abc = 0;
    let aab = 0;
    for (let s = 0; s < 500; s++) {
      const m = aufgabeAus(MUSTER, s, 2).bedingung;
      const u = m.reihe.slice(0, 3);
      if (new Set(u.map((e) => e.form)).size === 3) abc++;
      else aab++;
      const m3 = aufgabeAus(MUSTER, s, 3).bedingung.reihe.slice(0, 3);
      const formen = new Set(m3.map((e) => e.form)).size;
      const farben = new Set(m3.map((e) => e.farbe)).size;
      expect(formen < 3 || farben < 3).toBe(true);
    }
    expect(abc).toBeGreaterThan(100);
    expect(aab).toBeGreaterThan(100);
  });

  it('geschlossene Liste der Merkmale: Form und Farbe', () => {
    expect([...MERKMALE]).toEqual(['form', 'farbe']);
  });
});

describe('Muster: Fallen für den Löser (docs/LOESER.md, Abschnitt 6)', () => {
  const A = el('kreis', 'rot');
  const B = el('quadrat', 'blau');
  const C = el('dreieck', 'gelb');

  it('Reihe, die weniger als zweimal ganz zu sehen ist: keine eindeutige Antwort → verworfen', () => {
    expect(MUSTER.loesungen({ reihe: [A, B, C, A, B], periode: 3 })).toHaveLength(0);
    expect(MUSTER.loesungen({ reihe: [A, A, B, A, A], periode: 3 })).toHaveLength(0);
  });

  it('jedes Merkmal für sich: Formen im Wechsel zu zweit, Farben zu dritt → die Antwort folgt aus beiden', () => {
    // als ganze Elemente erst nach 6 wiederholt (nicht zweimal zu sehen), je Merkmal aber klar
    const formen: Element['form'][] = ['kreis', 'quadrat'];
    const farben: Element['farbe'][] = ['rot', 'blau', 'gelb'];
    const reihe = Array.from({ length: 7 }, (_, i) => el(formen[i % 2], farben[i % 3]));
    // Stelle 8: Formen im Zweierwechsel → Quadrat, Farben im Dreierwechsel → blau
    expect(MUSTER.loesungen({ reihe, periode: 6 })).toEqual([{ art: 'form', form: 'quadrat', farbe: 'blau' }]);
  });

  it('ein Merkmal ohne Regel (Farben ohne Wiederholung): keine Antwort → verworfen', () => {
    const farben: Element['farbe'][] = ['rot', 'blau', 'gelb', 'gruen', 'lila', 'rot'];
    const reihe = farben.map((farbe, i) => el(i % 2 ? 'quadrat' : 'kreis', farbe));
    expect(MUSTER.loesungen({ reihe, periode: 2 })).toHaveLength(0);
  });
});

describe('Muster: Hilfe auf dem Bild', () => {
  const alle = aufgaben<Muster>('muster', 200);
  /** Formen im Bild (Reihe und Lücke); Rahmen und Lücke selbst zählen nicht */
  const formen = (svg: string) => zaehle(svg, /stroke-linejoin="round"/g);

  it('Stufe 2: Rahmen um die erste Wiederholung; Stufe 3: um jede ganze Wiederholung und das Stück mit der Lücke; die Lücke bleibt „?“', () => {
    for (const { b } of alle) {
      const n = b.reihe.length;
      const svg0 = MUSTER.zeichne(b, { hilfe: 0, gewaehlt: null });
      const svg2 = MUSTER.zeichne(b, { hilfe: 2, gewaehlt: null });
      const svg3 = MUSTER.zeichne(b, { hilfe: 3, gewaehlt: null });
      expect(svg0).not.toContain('data-hilfe');
      expect(rahmenVon(b, 2)).toEqual([[0, b.periode]]);
      expect(zaehle(svg2, /data-hilfe="teil"/g)).toBe(1);
      expect(svg2).not.toContain('data-hilfe="schritt"');
      const r3 = rahmenVon(b, 3);
      expect(r3).toHaveLength(Math.floor(n / b.periode) + 1);
      // die Rahmen liegen lückenlos hintereinander und enden mit der Lücke (Stelle n)
      r3.forEach(([von], k) => expect(von).toBe(k === 0 ? 0 : r3[k - 1][0] + r3[k - 1][1]));
      expect(r3.at(-1)![0] + r3.at(-1)![1]).toBe(n + 1);
      expect(zaehle(svg3, /data-hilfe="teil"/g)).toBe(1);
      expect(zaehle(svg3, /data-hilfe="schritt"/g)).toBe(r3.length - 1);
      // die Hilfe setzt die Antwort nie ein: in der Lücke steht „?“, keine Form mehr als die Reihe
      for (const svg of [svg2, svg3]) {
        expect(texte(svg)).toEqual(['?']);
        expect(formen(svg)).toBe(n);
      }
    }
  });

  it('die Wahl hängt nicht von der Hilfe ab: alle Perlen bleiben', () => {
    // Wahl wird beim Erzeugen festgelegt und vom Bild nie verändert
    const a = aufgabeAus(MUSTER, 5, 2);
    expect(a.wahl!.length).toBeGreaterThanOrEqual(3);
  });
});

const r = (hut: Raupe['hut'], brille = false): Raupe => ({ hut, brille });

describe('Wer ist es?: Grenzfälle', () => {
  it('die Lösung steht an jeder der sechs Stellen; alle Arten von Karten kommen vor', () => {
    for (let stufe = 1; stufe <= 3; stufe++) {
      const stellen = new Set<number>();
      const arten = new Set<string>();
      for (let s = 0; s < 2000; s++) {
        const w = aufgabeAus(WER_IST_ES, s * 17, stufe).bedingung;
        stellen.add((WER_IST_ES.loesungen(w)[0] as { wert: number }).wert);
        for (const h of w.hinweise) arten.add(`${h.art}${h.nicht ? '-nicht' : ''}`);
        expect(w.hinweise).toHaveLength(stufe === 1 ? 1 : 2);
        // Stufe 3: mindestens eine Karte verneint
        const nicht = w.hinweise.filter((h) => h.nicht).length;
        if (stufe === 3) expect(nicht).toBeGreaterThanOrEqual(1);
        else expect(nicht).toBe(0);
      }
      expect([...stellen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
      const erwartet = stufe === 3 ? ['brille', 'brille-nicht', 'hut', 'hut-da-nicht', 'hut-nicht'] : ['brille', 'hut'];
      expect([...arten].sort()).toEqual(erwartet);
    }
  });

  it('nur verneinte Karte („gar kein Hut“) und eine einzige Raupe ohne Hut: genau eine Lösung', () => {
    const w: WerIstEs = { raupen: [r('rot'), r('blau'), r('kein'), r('gelb', true), r('rot', true), r('blau')], hinweise: [{ art: 'hut-da', nicht: true }] };
    expect(WER_IST_ES.loesungen(w)).toEqual([{ art: 'zahl', wert: 3 }]);
  });
});

describe('Wer ist es?: Fallen für den Löser', () => {
  it('zwei Raupen passen zu allen Karten: zwei Lösungen → verworfen', () => {
    const w: WerIstEs = {
      raupen: [r('rot', true), r('rot'), r('blau', true), r('rot', true), r('kein'), r('gelb')],
      hinweise: [{ art: 'hut', farbe: 'rot', nicht: false }, { art: 'brille', nicht: false }],
    };
    expect(WER_IST_ES.loesungen(w)).toHaveLength(2);
  });

  it('eine Karte, die auf alle passt: sechs Lösungen → verworfen', () => {
    const w: WerIstEs = { raupen: Array.from({ length: 6 }, () => r('gelb')), hinweise: [{ art: 'hut', farbe: 'gelb', nicht: false }] };
    expect(WER_IST_ES.loesungen(w)).toHaveLength(6);
  });
});

describe('Wer ist es?: Hilfe auf dem Bild', () => {
  const alle = aufgaben<WerIstEs>('wer-ist-es');
  const sichtbar = (svg: string) => zaehle(svg, /class="wahl-ziel"[^>]*opacity="1"/g);

  it('Stufe 2: erste Karte hervorgehoben, die andere im Halbschatten; alle Raupen bleiben', () => {
    for (const { b } of alle) {
      const svg0 = WER_IST_ES.zeichne(b, { hilfe: 0, gewaehlt: null });
      const svg2 = WER_IST_ES.zeichne(b, { hilfe: 2, gewaehlt: null });
      expect(svg0).not.toContain('data-hilfe');
      expect(zaehle(svg2, /data-hilfe="teil"/g)).toBe(1);
      expect(zaehle(svg2, /data-hilfe="schatten"/g)).toBe(b.hinweise.length - 1);
      expect(sichtbar(svg2)).toBe(6);
    }
  });

  it('Stufe 3 an der eigenen Aufgabe: blass werden die, die zur ersten Karte nicht passen – nie bleibt nur die Lösung', () => {
    for (const { b, stufe } of alle) {
      const svg3 = WER_IST_ES.zeichne(b, { hilfe: 3, gewaehlt: null });
      expect(sichtbar(svg3)).toBeGreaterThanOrEqual(2);
      // Stufe 1: ein Hinweis allein führt zur Lösung – der Schritt kommt an der ähnlichen Aufgabe
      expect(schrittVerraet(b)).toBe(stufe === 1);
      if (stufe > 1) {
        expect(sichtbar(svg3)).toBe(b.raupen.filter((x) => passt(x, b.hinweise[0])).length);
        expect(zaehle(svg3, /data-hilfe="schritt"/g)).toBe(6 - sichtbar(svg3));
      } else expect(svg3).not.toContain('data-hilfe="schritt"');
    }
  });

  it('Stufe 3 an der ähnlichen Aufgabe: der Schritt wird ganz gezeigt, auch wenn nur eine bleibt', () => {
    for (const { b } of alle) {
      const svg = WER_IST_ES.zeichne(b, { hilfe: 3, gewaehlt: null, aehnlich: true });
      const bleiben = b.raupen.filter((x) => passt(x, b.hinweise[0])).length;
      expect(sichtbar(svg)).toBe(bleiben);
      expect(blassNachSchritt(b, true).filter((x) => !x)).toHaveLength(bleiben);
    }
  });

  it('das Bild zeigt vor dem Vorrechnen keine Raupe als gewählt oder richtig', () => {
    for (const { b } of alle.slice(0, 500))
      for (const hilfe of [0, 1, 2, 3] as const) expect(WER_IST_ES.zeichne(b, { hilfe, gewaehlt: null })).not.toContain('#FDEEDC');
  });

  it('Zeichen der Bedingungen: Strich für „nicht“ genau bei verneinten Karten', () => {
    for (const { b } of alle) {
      const svg = WER_IST_ES.zeichne(b, { hilfe: 0, gewaehlt: null });
      expect(zaehle(svg, /data-zeichen="nicht"/g)).toBe(b.hinweise.filter((h: Hinweis) => h.nicht).length);
    }
  });
});

describe('Hilfe lässt nie nur die richtige Antwort sichtbar (jedes Format)', () => {
  it.each(IDS)('%s: Stufen 2 und 3 an der eigenen Aufgabe', (id) => {
    const f = FORMATE[id];
    for (const zahlenraum of ZAHLENRAEUME)
      for (let stufe = 1; stufe <= f.stufen; stufe++)
        for (let s = 0; s < 200; s++) {
          const a = aufgabeAus(f, s * 7 + 3, stufe, { zahlenraum });
          const l = f.loesungen(a.bedingung)[0];
          for (const hilfe of [2, 3] as const) {
            const svg = f.zeichne(a.bedingung, { hilfe, gewaehlt: null });
            if (f.eingabe(a.bedingung).art === 'bild') {
              // im Bild antworten: mindestens zwei Wahlmöglichkeiten bleiben ganz sichtbar
              expect(zaehle(svg, /class="wahl-ziel"[^>]*opacity="1"/g)).toBeGreaterThanOrEqual(2);
            } else {
              // Zahl oder Perle: die Lücke bleibt „?“, die Hilfe schreibt keine Zahl und setzt keine Form ein
              expect(texte(svg)).toContain('?');
              expect(texte(svg)).toEqual(texte(f.zeichne(a.bedingung, { hilfe: 0, gewaehlt: null })));
              if (a.wahl) expect(a.wahl.filter((w) => !gleich(w, l)).length).toBeGreaterThanOrEqual(2);
            }
          }
        }
  });
});

describe('Texte für Eltern (Deutsch und Ukrainisch)', () => {
  const D = de as Record<string, string>;
  const U = uk as Record<string, string>;

  it.each(IDS)('%s: Name, was es übt, Beispiel, wie man hilft – in beiden Sprachen, kurz', (id) => {
    for (const teil of ELTERN_TEILE) {
      const k = elternSchluessel(id, teil);
      expect(D[k]?.trim(), k).toBeTruthy();
      expect(U[k]?.trim(), k).toBeTruthy();
      expect(D[k].length, k).toBeLessThanOrEqual(320);
      expect(U[k].length, k).toBeLessThanOrEqual(320);
      if (teil !== 'name') {
        // übersetzt, nicht kopiert
        expect(U[k]).not.toBe(D[k]);
        expect(U[k]).toMatch(/[а-яіїєґ]/i);
      }
    }
  });

  it('elternTexte folgt der Sprache', () => {
    setSprache('uk');
    const u = elternTexte('zahlenmauer');
    setSprache('de');
    const d = elternTexte('zahlenmauer');
    expect(d.name).toBe('Zahlenmauer');
    expect(u.uebt).toBe(U['format.zahlenmauer.uebt']);
    expect(d.helfen).toBe(D['format.zahlenmauer.helfen']);
  });

  it('keine Schlüssel für Formate, die es nicht gibt', () => {
    const ids = new Set(Object.keys(D).filter((k) => k.startsWith('format.')).map((k) => k.split('.')[1]));
    expect([...ids].sort()).toEqual([...IDS].sort());
  });
});

describe('Druck', () => {
  it.each(IDS)('%s: bis Etappe 8 nur Bildschirm (druck: false, kein Druckblock)', (id) => {
    expect(FORMATE[id].druck).toBe(false);
    expect(FORMATE[id].druckBlock).toBeUndefined();
  });
});
