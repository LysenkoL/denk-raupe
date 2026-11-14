import { describe, expect, it } from 'vitest';
import { DEMO, demoStimmt } from '../src/satz/demo';
import { gleich } from '../src/perlen/antwort';

describe('Platzhalter-Aufgaben (Etappe 2)', () => {
  it('genau eine Wahl passt, keine Wahl doppelt', () => {
    const stimmt = demoStimmt(DEMO);
    DEMO.forEach((a, i) => {
      expect(a.wahl.filter((w) => stimmt(i, w)), a.auftrag).toHaveLength(1);
      a.wahl.forEach((w, k) => a.wahl.forEach((v, j) => j !== k && expect(gleich(w, v)).toBe(false)));
    });
  });
});
