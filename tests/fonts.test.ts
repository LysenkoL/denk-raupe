import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
// fontkit hat keine Typen (siehe tests/fontkit.d.ts)
import * as fontkit from 'fontkit';

const ROOT = resolve(__dirname, '..');

describe('Schrift Inter (Schulvariante), lokal', () => {
  for (const w of ['Medium', 'SemiBold', 'ExtraBold']) {
    it(`Inter-${w} hat cv05 (l mit Bogen) und cv11 (einstöckiges a)`, () => {
      const font = fontkit.openSync(resolve(ROOT, 'src/fonts', `Inter-${w}.woff2`));
      expect(font.availableFeatures).toContain('cv05');
      expect(font.availableFeatures).toContain('cv11');
      const names = font.layout('l a I', ['cv05', 'cv11']).glyphs.map((g: { name: string }) => g.name);
      expect(names[0]).not.toBe('l');
      expect(names[2]).not.toBe('a');
      expect(names[4]).toBe('I');
    });
  }

  it('CSS setzt cv05 und cv11 für den Text und für SVG-Text der Perlen', () => {
    expect(readFileSync(resolve(ROOT, 'src/styles/fonts.css'), 'utf8')).toMatch(/'cv05' 1, 'cv11' 1/);
    const app = readFileSync(resolve(ROOT, 'src/styles/app.css'), 'utf8');
    expect(app).toMatch(/body \{[^}]*font-feature-settings: var\(--font-features\)/);
    expect(app).toMatch(/svg text \{[^}]*font-feature-settings: var\(--font-features\)/);
  });

  it('nirgends Google Fonts oder andere fremde Adressen', () => {
    const files: string[] = [resolve(ROOT, 'index.html')];
    const walk = (d: string) => {
      for (const f of readdirSync(d)) {
        const p = join(d, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|css|html|json)$/.test(f)) files.push(p);
      }
    };
    walk(resolve(ROOT, 'src'));
    for (const f of files) expect(readFileSync(f, 'utf8'), f).not.toMatch(/fonts\.googleapis|fonts\.gstatic|https?:\/\//);
  });
});
