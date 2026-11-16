import { describe, expect, it } from 'vitest';
import {
  FORM_FARBEN,
  HUNDERT_FARBE,
  HUNDERT_KANTE,
  NEUTRAL_PERLE,
  TINTE,
  ZIFFER_FARBEN,
  ZIFFER_KANTEN,
  formRand,
  kanteVon,
  kontrast,
  schriftAuf,
} from '../src/design/farbe';
import { deltaE2000 } from './helpers/farbabstand';
import { MODELLE, deltaE76, simuliert } from './helpers/farbsehen';
import { perlenBild } from '../src/perlen/perle';
import { perlenLage } from '../src/perlen/maler';

/** elf Farben der Zahlenperlen: 0–9 und 100 */
const ELF = [...ZIFFER_FARBEN, HUNDERT_FARBE];
const NAME = (i: number) => (i === 10 ? '100' : String(i));

describe('Palette der Ziffern (docs/TZ.md, „Цвета цифр“)', () => {
  it('Werte wie im Brief vom 16.11.2026', () => {
    expect(ZIFFER_FARBEN).toEqual(['#EEF1F4', '#EC003F', '#FE8100', '#FFFD4F', '#71E053', '#068846', '#42C4FF', '#2B289F', '#F598C6', '#7A3004']);
    expect(HUNDERT_FARBE).toBe('#983AF1');
  });

  it('je zwei der elf Farben: ΔE2000 ≥ 20', () => {
    for (let i = 0; i < ELF.length; i++)
      for (let j = i + 1; j < ELF.length; j++)
        expect(deltaE2000(ELF[i], ELF[j]), `${NAME(i)} und ${NAME(j)}`).toBeGreaterThanOrEqual(20);
  });

  for (const [name, m] of Object.entries(MODELLE))
    it(`${name}: je zwei der elf Farben ΔE76 ≥ 19`, () => {
      for (let i = 0; i < ELF.length; i++)
        for (let j = i + 1; j < ELF.length; j++)
          expect(deltaE76(simuliert(ELF[i], m), simuliert(ELF[j], m)), `${NAME(i)} und ${NAME(j)}`).toBeGreaterThanOrEqual(19);
    });

  it('Ziffer auf jeder Füllung: Kontrast ≥ 4,5 für die gewählte Schriftfarbe, Saum in der Gegenfarbe', () => {
    for (const c of [...ELF, NEUTRAL_PERLE]) {
      const { schrift, saum } = schriftAuf(c);
      expect(kontrast(schrift, c), c).toBeGreaterThanOrEqual(4.5);
      expect([schrift, saum].sort()).toEqual(['#FFFFFF', TINTE].sort());
    }
  });

  it('weiße Ziffer genau auf 1, 5, 7, 9 und 100 (Tabelle in docs/STIL.md)', () => {
    const weiss = ELF.map((c, i) => (schriftAuf(c).schrift === '#FFFFFF' ? NAME(i) : null)).filter(Boolean);
    expect(weiss).toEqual(['1', '5', '7', '9', '100']);
  });

  it('jede Farbe hat ihre Kante, dunkler als die Füllung', () => {
    expect(ZIFFER_KANTEN).toHaveLength(10);
    ZIFFER_FARBEN.forEach((c, i) => expect(kanteVon(c)).toBe(ZIFFER_KANTEN[i]));
    expect(kanteVon(HUNDERT_FARBE)).toBe(HUNDERT_KANTE);
    for (const c of ELF) expect(kontrast(kanteVon(c), '#FFFFFF'), c).toBeGreaterThan(kontrast(c, '#FFFFFF') - 0.001);
  });
});

describe('Formfarben in Aufgaben', () => {
  it('sind eine Teilmenge der Palette', () => {
    for (const [name, c] of Object.entries(FORM_FARBEN)) expect(ELF as string[], name).toContain(c);
    expect(new Set(Object.values(FORM_FARBEN)).size).toBe(Object.keys(FORM_FARBEN).length);
  });

  it('Rand einer Form hebt sich von heller Perle und Papier ab (Kontrast ≥ 3), ist aber kein Schwarz', () => {
    for (const [name, c] of Object.entries(FORM_FARBEN)) {
      expect(kontrast(formRand(c), NEUTRAL_PERLE), name).toBeGreaterThanOrEqual(3);
      expect(kontrast(formRand(c), '#FDFBF4'), name).toBeGreaterThanOrEqual(3);
      expect(formRand(c)).not.toBe(TINTE);
    }
  });
});

describe('Perle aus fünf Schichten', () => {
  /** grobe Textbox in SVG-Einheiten: Breite je Zeichen 0,62 em, Höhe der Großbuchstaben 0,73 em */
  function textBox(a: Parameters<typeof perlenBild>[0]) {
    const p = perlenBild(a);
    const L = perlenLage(p);
    if (p.inhalt.typ !== 'text') throw new Error('kein Text');
    const fs = 50 * p.inhalt.groesse;
    const w = p.inhalt.maxBreite ? p.inhalt.maxBreite * 50 : [...p.inhalt.text].length * 0.62 * fs;
    const h = 0.73 * fs;
    return { L, x0: L.cx - w / 2, x1: L.cx + w / 2, y0: L.cy + fs * 0.36 - h, y1: L.cy + fs * 0.36 };
  }

  it('Glanzlicht berührt die Schrift nicht', () => {
    const faelle = [
      ...Array.from({ length: 101 }, (_, n) => ({ art: 'zahl', wert: n }) as const),
      { art: 'wort', wert: 'Schmetterling' } as const,
      { art: 'buchstabe', wert: 'M' } as const,
      { art: 'geld', cent: 250 } as const,
    ];
    for (const a of faelle) {
      const { L, x0, x1, y0 } = textBox(a);
      const g = L.glanz;
      const unten = g.cy + Math.hypot(g.ry, g.rx * Math.sin((24 * Math.PI) / 180));
      const ueberlappX = g.cx + g.rx > x0 && g.cx - g.rx < x1;
      expect(!ueberlappX || unten <= y0, JSON.stringify(a)).toBe(true);
    }
  });

  it('kein dunkler Umriss um die Perle; Trennring aus Tinte nur bei zweistelligen Zahlen', async () => {
    const { perleSvg } = await import('../src/perlen/maler');
    const eins = perleSvg(perlenBild({ art: 'zahl', wert: 4 }));
    expect(eins).not.toMatch(/stroke="#1B2033"/);
    expect(eins).not.toContain(`fill="${TINTE}" stroke="${TINTE}"`);
    const zwei = perleSvg(perlenBild({ art: 'zahl', wert: 47 }));
    expect(zwei).toContain(`fill="${TINTE}" stroke="${TINTE}"`);
    // Kante der Zehnerfarbe außen
    expect(zwei).toContain(`fill="${kanteVon(ZIFFER_FARBEN[4])}"`);
  });
});
