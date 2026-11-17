import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  FARB_TOKEN,
  FORM_FARBEN,
  HUNDERT_FARBE,
  HUNDERT_KANTE,
  NEUTRAL_KANTE,
  NEUTRAL_PERLE,
  SCHATTEN,
  ZIFFER_FARBEN,
  ZIFFER_KANTEN,
  kontrast,
} from '../src/design/farbe';

const css = readFileSync(resolve(__dirname, '../src/styles/tokens.css'), 'utf8');
const roh = (name: string) => css.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1]?.trim();
const wert = (name: string) => css.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`))?.[1]?.toUpperCase();
const stilCss = ['app.css', 'stil.css'].map((f) => readFileSync(resolve(__dirname, '../src/styles', f), 'utf8')).join('\n');

describe('Designsystem: CSS und TypeScript gleich', () => {
  it('Ziffernfarben, 100, Kanten, neutrale Perle', () => {
    ZIFFER_FARBEN.forEach((c, n) => expect(wert(`z${n}`), `--z${n}`).toBe(c));
    ZIFFER_KANTEN.forEach((c, n) => expect(wert(`k${n}`), `--k${n}`).toBe(c));
    expect(wert('z100')).toBe(HUNDERT_FARBE);
    expect(wert('k100')).toBe(HUNDERT_KANTE);
    expect(wert('perle-neutral')).toBe(NEUTRAL_PERLE);
    expect(wert('perle-neutral-kante')).toBe(NEUTRAL_KANTE);
  });

  it('Formfarben', () => {
    for (const [n, c] of Object.entries(FORM_FARBEN)) expect(wert(`form-${n}`), `--form-${n}`).toBe(c);
  });

  it('Flächen, Schrift und Handlungen', () => {
    for (const [n, c] of Object.entries(FARB_TOKEN)) expect(wert(n), `--${n}`).toBe(c);
    expect(roh('schatten')).toBe(SCHATTEN);
  });

  it('kein alter Umriss, keine alten Flächenfarben mehr', () => {
    for (const alt of ['kontur', 'bg', 'card', 'ink', 'muted', 'line', 'wiese', 'green', 'orange']) {
      expect(css, `--${alt}`).not.toMatch(new RegExp(`--${alt}:`));
      expect(stilCss, `var(--${alt})`).not.toMatch(new RegExp(`var\\(--${alt}\\)`));
    }
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

describe('Designsystem: Werte aus docs/STIL.md', () => {
  it('Flächen und Handlungen (Abschnitt 4)', () => {
    expect(FARB_TOKEN).toEqual({
      papier: '#FDFBF4',
      holz: '#F2E6D0',
      'holz-kante': '#D6C4A2',
      stein: '#EFD9B4',
      'stein-kante': '#C4A878',
      tinte: '#182218',
      'tinte-leise': '#56604F',
      honig: '#FFC83D',
      'honig-kante': '#D99A00',
      holzknopf: '#FFF8EA',
      'holzknopf-kante': '#D6C4A2',
      laterne: '#FFE9A8',
      'laterne-kante': '#E0B84A',
      fokus: '#2B289F',
    });
    expect(SCHATTEN).toBe('rgba(70, 50, 20, 0.20)');
  });

  it('Fokus ist die Farbe der 7, mit hellem Saum', () => {
    expect(FARB_TOKEN.fokus).toBe(ZIFFER_FARBEN[7]);
    expect(roh('fokus-saum')).toBe('2px');
    expect(roh('fokus-linie')).toBe('3px');
  });

  it('Text in Tinte auf allen Flächen und Knöpfen: Kontrast ≥ 5', () => {
    for (const f of ['papier', 'holz', 'stein', 'honig', 'holzknopf', 'laterne'] as const)
      expect(kontrast(FARB_TOKEN.tinte, FARB_TOKEN[f]), f).toBeGreaterThanOrEqual(5);
    for (const f of ['papier', 'holz'] as const) expect(kontrast(FARB_TOKEN['tinte-leise'], FARB_TOKEN[f]), `leise auf ${f}`).toBeGreaterThanOrEqual(4.5);
  });

  it('Form (Abschnitt 5): Ecken, Kanten, Schatten, Linien', () => {
    expect([roh('rund-s'), roh('rund-m'), roh('rund-l')]).toEqual(['14px', '20px', '28px']);
    expect([roh('kante-knopf'), roh('kante-haupt'), roh('kante-perle')]).toEqual(['4px', '5px', '3px']);
    expect(roh('schatten-weich')).toBe('0 6px 14px var(--schatten)');
    expect(roh('schatten-tisch')).toBe('0 2px 4px var(--schatten)');
    expect(roh('linie')).toBe('2.5px');
    expect([roh('tipp-perle'), roh('tipp'), roh('tipp-haupt')]).toEqual(['48px', '56px', '72px']);
    expect([1, 2, 3, 4, 5, 6].map((i) => roh(`s${i}`))).toEqual(['4px', '8px', '12px', '16px', '24px', '32px']);
  });

  it('Schrift (Abschnitt 6): Größen in den Spannen, Gewichte', () => {
    const px = (n: string) => parseFloat(roh(n)!);
    const spannen: [string, number, number, string, number][] = [
      ['t-frage', 24, 30, 'gewicht-frage', 800],
      ['t-text', 18, 20, 'gewicht-text', 600],
      ['t-knopf', 20, 26, 'gewicht-knopf', 800],
      ['t-ding', 28, 40, 'gewicht-ding', 800],
      ['t-klein', 15, 16, 'gewicht-klein', 600],
    ];
    for (const [t, von, bis, g, gewicht] of spannen) {
      expect(px(t), t).toBeGreaterThanOrEqual(von);
      expect(px(t), t).toBeLessThanOrEqual(bis);
      expect(roh(g), g).toBe(String(gewicht));
    }
    expect(roh('sperrung-wort')).toBe('0.02em');
  });

  it('Text der App in Tinte', () => {
    expect(stilCss).toMatch(/body \{[^}]*color: var\(--tinte\)/);
  });
});
