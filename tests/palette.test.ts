import { describe, expect, it } from 'vitest';
import {
  FORM_FARBEN,
  HUNDERT_FARBE,
  HUNDERT_KANTE,
  NEUTRAL_KANTE,
  NEUTRAL_PERLE,
  TINTE,
  WEISS,
  ZIFFER_FARBEN,
  ZIFFER_KANTEN,
  kanteZu,
  kontrast,
  schriftAuf,
} from '../src/design/farbe';
import { HUT_FARBEN, WER_IST_ES, hutFarbe } from '../src/aufgaben/wer-ist-es';
import { deltaE2000, deltaE76Gesehen, SEHEN } from './helpers/farbabstand';

/** die elf Farben der Zahlenperlen: Ziffern 0–9 und die 100 */
const ELF = [...ZIFFER_FARBEN, HUNDERT_FARBE];
const name = (i: number) => (i === 10 ? '100' : String(i));
const paare = ELF.flatMap((a, i) => ELF.slice(i + 1).map((b, k) => [i, i + 1 + k, a, b] as const));

describe('Palette (docs/TZ.md, „Цвета цифр“)', () => {
  it('Ziffern 0–9 und 100 wie im Brief vom 16.11.2026', () => {
    expect(ZIFFER_FARBEN).toEqual(['#EEF1F4', '#EC003F', '#FE8100', '#FFFD4F', '#71E053', '#068846', '#42C4FF', '#2B289F', '#F598C6', '#7A3004']);
    expect(HUNDERT_FARBE).toBe('#983AF1');
    expect(new Set(ELF).size).toBe(11);
  });

  it('je zwei der elf Farben: ΔE2000 ≥ 20 (gemessen: kleinstes 20,3)', () => {
    let kleinstes = Infinity;
    for (const [i, j, a, b] of paare) {
      const d = deltaE2000(a, b);
      kleinstes = Math.min(kleinstes, d);
      expect(d, `${name(i)} und ${name(j)}`).toBeGreaterThanOrEqual(20);
    }
    expect(kleinstes).toBeCloseTo(20.3, 1);
  });

  for (const stoerung of ['protanopie', 'deuteranopie'] as const) {
    it(`${stoerung}: je zwei der elf Farben ΔE76 ≥ 19 in beiden Modellen`, () => {
      const kleinste = SEHEN[stoerung].map((m) => {
        let k = Infinity;
        for (const [i, j, a, b] of paare) {
          const d = deltaE76Gesehen(a, b, m);
          k = Math.min(k, d);
          expect(d, `${stoerung}: ${name(i)} und ${name(j)}`).toBeGreaterThanOrEqual(19);
        }
        return k;
      });
      // Bezugswerte aus docs/PLAN.md, Anhang A
      const soll = stoerung === 'protanopie' ? [19.3, 20.2] : [19.5, 19.6];
      kleinste.forEach((k, i) => expect(k).toBeCloseTo(soll[i], 0));
    });
  }

  it('Ziffer auf jeder Füllung: gewählte Schriftfarbe mit Kontrast ≥ 4,5 (gemessen: mindestens 4,53)', () => {
    let kleinster = Infinity;
    for (const c of [...ELF, NEUTRAL_PERLE]) {
      const { schrift, saum } = schriftAuf(c);
      expect([TINTE, WEISS]).toContain(schrift);
      expect(saum).toBe(schrift === TINTE ? WEISS : TINTE);
      const k = kontrast(schrift, c);
      kleinster = Math.min(kleinster, k);
      expect(k, c).toBeGreaterThanOrEqual(4.5);
    }
    expect(kleinster).toBeCloseTo(4.53, 2);
  });

  it('Ziffer dunkel oder weiß wie in der Tabelle von docs/STIL.md', () => {
    const weiss = new Set([1, 5, 7, 9, 10]);
    ELF.forEach((c, i) => expect(schriftAuf(c).schrift, name(i)).toBe(weiss.has(i) ? WEISS : TINTE));
  });

  it('Kanten wie in docs/STIL.md, Abschnitt 4', () => {
    expect(ZIFFER_KANTEN).toEqual(['#8EA3B9', '#A0002A', '#AC5700', '#E3E000', '#3AB818', '#00602F', '#0096DA', '#191770', '#F31A85', '#551F00']);
    expect(HUNDERT_KANTE).toBe('#6804C6');
    expect(NEUTRAL_PERLE).toBe('#FBF5E6');
    expect(NEUTRAL_KANTE).toBe('#C8B99E');
    ZIFFER_FARBEN.forEach((c, i) => expect(kanteZu(c)).toBe(ZIFFER_KANTEN[i]));
    expect(kanteZu(HUNDERT_FARBE)).toBe(HUNDERT_KANTE);
    expect(kanteZu(NEUTRAL_PERLE)).toBe(NEUTRAL_KANTE);
    expect(() => kanteZu('#123456')).toThrow();
  });
});

describe('Formfarben: Teilmenge der Palette', () => {
  it('rot, orange, gelb, grün, blau, lila wie im Plan (A1)', () => {
    expect(FORM_FARBEN).toEqual({ rot: '#EC003F', orange: '#FE8100', gelb: '#FFFD4F', gruen: '#068846', blau: '#42C4FF', lila: '#983AF1' });
  });

  it('jede Formfarbe ist eine Farbe der Palette – und besteht damit dieselbe Prüfung', () => {
    for (const [n, c] of Object.entries(FORM_FARBEN)) expect(ELF, n).toContain(c);
    expect(new Set(Object.values(FORM_FARBEN)).size).toBe(6);
  });

  it('Wer ist es?: Hutfarben kommen aus den Formfarben', () => {
    for (const h of HUT_FARBEN) expect(hutFarbe(h)).toBe(FORM_FARBEN[h]);
    // gezeichnete Hüte (Krempe = Ellipse) haben genau diese Farben
    const b = WER_IST_ES.beispiel({} as never);
    const svg = WER_IST_ES.zeichne(b, { hilfe: 0, gewaehlt: null });
    const huete = new Set([...svg.matchAll(/<ellipse [^>]*fill="(#[0-9A-Fa-f]{6})"/g)].map((m) => m[1]));
    expect([...huete].sort()).toEqual(HUT_FARBEN.map((h) => FORM_FARBEN[h]).sort());
  });
});
