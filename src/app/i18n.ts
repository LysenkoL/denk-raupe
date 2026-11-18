import de from '../i18n/de.json';
import uk from '../i18n/uk.json';
import type { FormatId } from '../aufgaben/format';

/**
 * Sprache des Elternteils: Deutsch oder Ukrainisch. Die Kinderoberfläche ist immer Deutsch
 * (src/i18n/kind.ts). de.json ist vollständig und die Rückfallebene.
 */
export type Sprache = 'de' | 'uk';
export type Key = keyof typeof de;
const TEXTE: Record<Sprache, Partial<Record<Key, string>>> = { de, uk };

/** Sprache des Telefons: Ukrainisch → uk, sonst Deutsch */
export function systemSprache(langs: readonly string[] = globalThis.navigator?.languages ?? []): Sprache {
  return langs.some((l) => l.toLowerCase().startsWith('uk')) ? 'uk' : 'de';
}

let aktuell: Sprache = systemSprache();

export function sprache(): Sprache {
  return aktuell;
}

export function setSprache(s: Sprache): void {
  aktuell = s;
}

/** Text zum Schlüssel; {name} wird ersetzt */
export function t(key: Key, params: Record<string, string | number> = {}): string {
  const s = TEXTE[aktuell][key] ?? de[key];
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}

/**
 * Texte für Eltern zu einem Format (docs/TZ.md, „Критерии готовности“): Name, was es übt, ein Beispiel,
 * wie man hilft, ohne die Antwort zu verraten. Schlüssel `format.<id>.<teil>` in de.json und uk.json;
 * ein Test hält sie für jedes Format vollständig. Der Elternbereich (C3) liest sie von hier.
 */
export const ELTERN_TEILE = ['name', 'uebt', 'beispiel', 'helfen'] as const;
export type ElternTeil = (typeof ELTERN_TEILE)[number];

export function elternSchluessel(id: FormatId, teil: ElternTeil): Key {
  return `format.${id}.${teil}` as Key;
}

export function elternTexte(id: FormatId): Record<ElternTeil, string> {
  return Object.fromEntries(ELTERN_TEILE.map((teil) => [teil, t(elternSchluessel(id, teil))])) as Record<ElternTeil, string>;
}
