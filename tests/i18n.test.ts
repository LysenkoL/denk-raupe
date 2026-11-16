import { describe, expect, it } from 'vitest';
import de from '../src/i18n/de.json';
import uk from '../src/i18n/uk.json';
import { setSprache, systemSprache, t } from '../src/app/i18n';

const platzhalter = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('Elternsprache Deutsch und Ukrainisch', () => {
  it('de.json und uk.json: dieselben Schlüssel, nichts leer, gleiche Platzhalter', () => {
    expect(Object.keys(uk).sort()).toEqual(Object.keys(de).sort());
    for (const [k, v] of Object.entries(de)) {
      const u = (uk as Record<string, string>)[k];
      expect(v.trim(), k).not.toBe('');
      expect(u.trim(), k).not.toBe('');
      expect(platzhalter(u), k).toEqual(platzhalter(v));
    }
  });

  it('Standard: Ukrainisch nur, wenn das Telefon Ukrainisch spricht', () => {
    expect(systemSprache(['uk-UA', 'de-DE'])).toBe('uk');
    expect(systemSprache(['ru-RU', 'en-US'])).toBe('de');
    expect(systemSprache([])).toBe('de');
  });

  it('t() schaltet um', () => {
    setSprache('uk');
    expect(t('stil.titel')).toBe('Дизайн-система');
    setSprache('de');
    expect(t('stil.titel')).toBe('Designsystem');
  });
});
