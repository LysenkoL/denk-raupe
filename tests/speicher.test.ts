import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FORMATE } from '../src/aufgaben';
import type { Mauer } from '../src/aufgaben/zahlenmauer';
import { ladeSitzung, neueSitzung, neuesProfil, stimmtFuer } from '../src/satz/sitzung';

/**
 * Daten aus Version 1 überstehen das Update (docs/PLAN.md, Р13).
 * `fixtures/speicher-v1.json` ist ein echter Abzug des Codes vor Aufgabe A2: eine Sitzung mitten im Satz
 * (verglichen, eine Antwort danach geändert, Hilfe 3 offen), ein Profil und die Aufgaben weiterer Samen.
 */
const v1 = JSON.parse(readFileSync(resolve(__dirname, 'fixtures/speicher-v1.json'), 'utf8'));

describe('Sitzung: Umzug von Version 1', () => {
  const alt = v1.sitzung;
  const neu = ladeSitzung(structuredClone(alt))!;

  it('öffnet sich als Version 2 mit denselben Aufgaben', () => {
    expect(alt.version).toBe(1);
    expect(neu.version).toBe(2);
    expect(neu.aufgaben).toHaveLength(alt.aufgaben.length);
    neu.aufgaben.forEach((a, i) => {
      const { bedingung, ...rest } = alt.aufgaben[i];
      // Format, Version, Samen, Stufe, Wahl in gezeigter Reihenfolge, Hilfe: unverändert
      expect(a).toMatchObject(rest);
      expect(a.zahlenraum).toBe(20);
      expect(a.bedingung).toMatchObject(bedingung);
    });
  });

  it('dieselben Antworten, Blätter, Hilfestufen, aktuelle Aufgabe', () => {
    expect(neu.satz).toEqual(alt.satz);
    expect(neu.aktuell).toBe(alt.aktuell);
    expect(neu.hilfeOffen).toEqual(alt.hilfeOffen);
    expect(neu.gezaehlt).toBe(alt.gezaehlt);
    expect(neu.samen).toBe(alt.samen);
  });

  it('Antworten werden genau so geprüft wie vorher', () => {
    const stimmt = stimmtFuer(neu);
    neu.satz.perlen.forEach((p, i) => {
      const f = FORMATE[neu.aufgaben[i].format];
      const vorher = f.loesungen(alt.aufgaben[i].bedingung).some((l) => JSON.stringify(l) === JSON.stringify(p.antwort));
      expect(stimmt(i, p.antwort!)).toBe(vorher);
    });
    // in der Vorlage: Perle 1 noch falsch, die anderen richtig (golden)
    expect(neu.satz.perlen.map((p, i) => stimmt(i, p.antwort!))).toEqual([true, false, true]);
  });

  it('Zahlenmauer bekommt die Grenze von Version 1: Stufe 1 bis 10, sonst bis 20', () => {
    for (const a of neu.aufgaben.filter((x) => x.format === 'zahlenmauer')) {
      const m = a.bedingung as Mauer;
      expect(m.grenze).toBe(a.stufe === 1 ? 10 : 20);
      expect(FORMATE.zahlenmauer.eingabe(m)).toEqual({ art: 'zahl', max: m.grenze });
    }
  });

  it('Standard bis 20 erzeugt genau die Aufgaben von Version 1 – auf dem Bildschirm ändert sich nichts', () => {
    const saetze: [number, unknown[]][] = [[alt.samen, alt.aufgaben], ...Object.entries(v1.weitere).map(([n, a]) => [Number(n), a] as [number, unknown[]])];
    expect(saetze.length).toBeGreaterThanOrEqual(9);
    for (const [samen, aufgaben] of saetze) {
      const umgezogen = ladeSitzung({ ...alt, samen, aufgaben })!.aufgaben;
      const heute = neueSitzung(samen).aufgaben;
      heute.forEach((a, i) => {
        const u = umgezogen[i];
        expect({ ...a, version: 0, hilfe: 0 }, `Samen ${samen}, Aufgabe ${i}`).toEqual({ ...u, version: 0, hilfe: 0 });
        expect(a.version).toBe(FORMATE[a.format].version);
      });
    }
  });

  it('Version 2 bleibt, wie sie ist; Unbekanntes → neuer Satz', () => {
    const s = neueSitzung(5);
    expect(ladeSitzung(s)).toBe(s);
    expect(ladeSitzung(undefined)).toBeNull();
    expect(ladeSitzung(null)).toBeNull();
    expect(ladeSitzung('kaputt')).toBeNull();
    expect(ladeSitzung({ ...s, version: 99 })).toBeNull();
  });
});

describe('Profil', () => {
  it('Form unverändert: das Profil aus Version 1 passt ohne Umzug', () => {
    expect(v1.profil.version).toBe(1);
    expect(neuesProfil().version).toBe(1);
    expect(Object.keys(v1.profil).sort()).toEqual(Object.keys(neuesProfil()).sort());
  });
});
