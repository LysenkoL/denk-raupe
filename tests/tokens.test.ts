import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  AKTIONEN,
  FLAECHEN,
  HUNDERT_FARBE,
  HUNDERT_KANTE,
  NEUTRAL_KANTE,
  NEUTRAL_PERLE,
  SCHATTEN,
  ZIFFER_FARBEN,
  ZIFFER_KANTEN,
} from '../src/design/farbe';

const css = readFileSync(resolve(__dirname, '../src/styles/tokens.css'), 'utf8');
const stil = readFileSync(resolve(__dirname, '../docs/STIL.md'), 'utf8');
const wert = (name: string) => css.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6}|rgba\\([^)]*\\)|[0-9.]+px)`))?.[1]?.toUpperCase();

/** Tabellenzeile aus docs/STIL.md: | `--name` | Wert | … */
function stilZeile(name: string): string[] {
  const z = stil.split('\n').find((l) => l.startsWith(`| \`--${name}\` |`));
  if (!z) throw new Error(`--${name} fehlt in docs/STIL.md`);
  return z.split('|').map((x) => x.trim()).filter(Boolean);
}

describe('Designsystem: CSS, TypeScript und docs/STIL.md gleich', () => {
  it('Ziffernfarben, Kanten, 100, neutrale Perle', () => {
    ZIFFER_FARBEN.forEach((c, n) => expect(wert(`z${n}`), `--z${n}`).toBe(c));
    ZIFFER_KANTEN.forEach((c, n) => expect(wert(`k${n}`), `--k${n}`).toBe(c));
    expect(wert('z100')).toBe(HUNDERT_FARBE);
    expect(wert('k100')).toBe(HUNDERT_KANTE);
    expect(wert('perle-neutral')).toBe(NEUTRAL_PERLE);
    expect(wert('perle-neutral-kante')).toBe(NEUTRAL_KANTE);
  });

  it('Ziffern und Kanten wie in der Tabelle „Бусины и фигуры“', () => {
    for (let n = 0; n <= 9; n++) {
      const z = stil.split('\n').find((l) => l.startsWith(`| ${n} | #`))!.split('|').map((x) => x.trim());
      expect([z[2], z[3]], `Ziffer ${n}`).toEqual([ZIFFER_FARBEN[n], ZIFFER_KANTEN[n]]);
    }
    const h = stil.split('\n').find((l) => l.startsWith('| 100 | #'))!.split('|').map((x) => x.trim());
    expect([h[2], h[3]]).toEqual([HUNDERT_FARBE, HUNDERT_KANTE]);
    expect(stil).toContain(`${NEUTRAL_PERLE} с кромкой ${NEUTRAL_KANTE}`);
  });

  it('Flächen und Text wie in docs/STIL.md', () => {
    for (const [name, c] of Object.entries(FLAECHEN)) {
      expect(stilZeile(name)[1], name).toBe(c);
      expect(wert(name), name).toBe(c);
    }
    expect(stilZeile('schatten')[1]).toBe(SCHATTEN);
    expect(wert('schatten')).toBe(SCHATTEN.toUpperCase());
  });

  it('Aktionen mit Kante wie in docs/STIL.md', () => {
    for (const name of ['honig', 'holzknopf', 'laterne'] as const) {
      const z = stilZeile(name);
      expect(z[1], name).toBe(AKTIONEN[name]);
      expect(z[2], `${name}-kante`).toBe(AKTIONEN[`${name}-kante`]);
      expect(wert(name)).toBe(AKTIONEN[name]);
      expect(wert(`${name}-kante`)).toBe(AKTIONEN[`${name}-kante`]);
    }
    expect(stilZeile('fokus')[1]).toBe(AKTIONEN.fokus);
    expect(wert('fokus')).toBe(AKTIONEN.fokus);
  });

  it('Form: Ecken 14/20/28, Kanten 3/4/5, Tippflächen 48/56/72 (docs/STIL.md, Abschnitt 5)', () => {
    expect([wert('rund-s'), wert('rund-m'), wert('rund-l')]).toEqual(['14PX', '20PX', '28PX']);
    expect(stil).toContain('маленькое 14 px, среднее 20 px, большое 28 px');
    expect([wert('kante-s'), wert('kante'), wert('kante-l')]).toEqual(['3PX', '4PX', '5PX']);
    expect(stil).toContain('4 px у кнопок и карточек, 5 px у главной кнопки, 3 px у бусин и кирпичей');
    expect([wert('tipp-perle'), wert('tipp'), wert('tipp-haupt')]).toEqual(['48PX', '56PX', '72PX']);
    expect(wert('linie')).toBe('2.5PX');
  });

  it('Text: Tinte auf allen Flächen und Knöpfen, leise Tinte (zweite Beschriftung) auf den Flächen – Kontrast ≥ 4,5', async () => {
    const { kontrast } = await import('../src/design/farbe');
    const flaechen = [FLAECHEN.papier, FLAECHEN.holz, FLAECHEN.stein];
    const knoepfe = [AKTIONEN.honig, AKTIONEN.holzknopf, AKTIONEN.laterne];
    for (const f of [...flaechen, ...knoepfe]) expect(kontrast(FLAECHEN.tinte, f), f).toBeGreaterThanOrEqual(4.5);
    for (const f of flaechen) expect(kontrast(FLAECHEN['tinte-leise'], f), `leise auf ${f}`).toBeGreaterThanOrEqual(4.5);
  });

  it('keine Rot/Grün-Signalfarben für richtig/falsch, nur helles Design', () => {
    expect(css).not.toMatch(/--(richtig|falsch|fehler|error|success)/i);
    expect(css).toMatch(/color-scheme: light/);
    expect(css).not.toMatch(/prefers-color-scheme: dark/);
  });

  it('Bewegung lässt sich abschalten', () => {
    expect(css).toMatch(/prefers-reduced-motion: reduce/);
  });
});
