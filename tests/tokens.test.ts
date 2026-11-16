import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { HUNDERT_FARBE, KONTUR, NEUTRAL_PERLE, ZIFFER_FARBEN } from '../src/design/farbe';

const css = readFileSync(resolve(__dirname, '../src/styles/tokens.css'), 'utf8');
const wert = (name: string) => css.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`))?.[1]?.toUpperCase();

describe('Designsystem: CSS und TypeScript gleich', () => {
  it('Ziffernfarben, 100, Umriss, neutrale Perle', () => {
    ZIFFER_FARBEN.forEach((c, n) => expect(wert(`z${n}`), `--z${n}`).toBe(c));
    expect(wert('z100')).toBe(HUNDERT_FARBE);
    expect(wert('kontur')).toBe(KONTUR);
    expect(wert('perle-neutral')).toBe(NEUTRAL_PERLE);
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
