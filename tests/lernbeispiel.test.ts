import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FORMATE } from '../src/aufgaben';
import { aufgabeAus, lernbeispiel, lernPruefen, type FormatId, type HilfeStufe } from '../src/aufgaben/format';
import { zufall } from '../src/core/zufall';
import { gleich, type Antwort } from '../src/perlen/antwort';
import type { Mauer } from '../src/aufgaben/zahlenmauer';
import type { Muster } from '../src/aufgaben/muster';
import type { WerIstEs } from '../src/aufgaben/wer-ist-es';
import type { BildGleichung } from '../src/aufgaben/bild-gleichungen';
import type { Malaufgabe } from '../src/aufgaben/malaufgaben';
import type { Hunderterfeld } from '../src/aufgaben/hunderterfeld';
import type { Zahlenstrahl } from '../src/aufgaben/zahlenstrahl';
import type { Paeckchen } from '../src/aufgaben/entdeckerpaeckchen';
import type { Rechenstrich } from '../src/aufgaben/rechenstrich';
import { neueHistorie } from '../src/satz/historie';
import {
  abschliessen,
  kenntnis,
  ladeProfil,
  lernbeispielVorher,
  neueSitzung,
  neuesProfil,
  PROBE_FORMATE,
  type Profil,
  type Sitzung,
} from '../src/satz/sitzung';
import { setzeAntwort, vergleiche, zuruecklegen } from '../src/satz/vergleich';

/** Lernbeispiel (docs/PLAN.md, A4): Schritte je Format, Kenntnis im Profil, Umzug des Profils */

const IDS = Object.keys(FORMATE) as FormatId[];
const v1 = JSON.parse(readFileSync(resolve(__dirname, 'fixtures/speicher-v1.json'), 'utf8'));

/**
 * „Aufwand“ eines Schritts, lexikografisch verglichen – woran „leichter“ gemessen wird:
 * - Zahlenmauer: Zahl der Steine (wie viel man ansehen muss), dann größte Zahl der Mauer (wie schwer die Rechnung ist);
 * - Muster: Länge der Wiederholung (wie viel man sich merken muss), dann wie selten sie ganz zu sehen ist;
 * - Wer ist es?: wie viele andere Raupen dieselbe Art Merkmal tragen wie der Hinweis (was man ausschließen muss).
 */
const AUFWAND: Record<FormatId, (b: unknown) => number[]> = {
  zahlenmauer: (b) => {
    const m = b as Mauer;
    return [m.reihen.flat().length, Math.max(...m.reihen.flat())];
  },
  muster: (b) => {
    const m = b as Muster;
    return [m.periode, -Math.floor(m.reihe.length / m.periode)];
  },
  'wer-ist-es': (b) => {
    const w = b as WerIstEs;
    const h = w.hinweise[0];
    const ziel = FORMATE['wer-ist-es'].loesungen(w)[0] as { wert: number };
    const gleicheArt = (r: WerIstEs['raupen'][number]) => (h.art === 'brille' ? r.brille : r.hut !== 'kein');
    return [w.hinweise.length, w.raupen.filter((r, i) => i !== ziel.wert - 1 && gleicheArt(r)).length];
  },
  // Gruppe Г1б
  /** Bild-Gleichungen: Zahl der Zeilen, dann Zahl der Früchte */
  'bild-gleichungen': (b) => {
    const g = b as BildGleichung;
    return [g.zeilen.length, g.zeilen.flatMap((z) => z.fruechte).length];
  },
  /** Malaufgaben: Zahl der Reihen, dann Zahl der Plättchen */
  malaufgaben: (b) => {
    const m = b as Malaufgabe;
    return [m.reihen.length, m.reihen.reduce((x, y) => x + y, 0)];
  },
  /** Hunderterfeld: Abstand vom gezeigten Feld, dann Größe der Zahl */
  hunderterfeld: (b) => {
    const h = b as Hunderterfeld;
    return [Math.min(...h.marken.map((m) => Math.abs(m.feld - h.frage))), h.frage + 1];
  },
  /** Zahlenstrahl: je weniger Zahlen dastehen, desto schwerer; dann Abstand des Pfeils von der nächsten Zahl */
  zahlenstrahl: (b) => {
    const s = b as Zahlenstrahl;
    return [-s.marken.length, Math.min(...s.marken.map((m) => Math.abs(m.strich - s.pfeil)))];
  },
  /** Entdeckerpäckchen: Zahl der Zeilen, dann größte Zahl (mit der Lösung) */
  entdeckerpaeckchen: (b) => {
    const p = b as Paeckchen;
    const l = FORMATE.entdeckerpaeckchen.loesungen(p)[0] as { wert: number };
    return [p.zeilen.length, Math.max(l.wert, ...p.zeilen.flat().map((x) => x ?? 0))];
  },
  /** Rechenstrich: Zahl der Sprünge, dann wie weit sie zusammen gehen */
  rechenstrich: (b) => {
    const r = b as Rechenstrich;
    return [r.spruenge.length, r.spruenge.reduce((x, s) => x + (s.laenge ?? 0), 0)];
  },
};
const kleiner = (a: number[], b: number[]) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) < (b[i] ?? 0);
  return false;
};

/** Handlungen bis zur Antwort: eine Wahl oder ein Tippen im Bild = 1; eine Zahl = so viele Ziffernperlen, wie sie Stellen hat */
function handlungen(id: FormatId, b: unknown): number {
  const f = FORMATE[id];
  const l = f.loesungen(b)[0];
  return f.eingabe(b).art === 'zahl' && l.art === 'zahl' ? String(l.wert).length : 1;
}

describe.each(IDS)('Lernbeispiel %s', (id) => {
  const f = FORMATE[id];
  const schritte = lernbeispiel(f);

  it('2–3 Schritte, jeder mit genau einer Lösung, in der Wahl genau einmal und ohne Doppelte', () => {
    expect(f.beispiele(zufall(1)).length).toBeGreaterThanOrEqual(2);
    expect(f.beispiele(zufall(1)).length).toBeLessThanOrEqual(3);
    expect(schritte).toHaveLength(f.beispiele(zufall(1)).length);
    for (const a of schritte) {
      const l = f.loesungen(a.bedingung);
      expect(l).toHaveLength(1);
      if (a.wahl) {
        expect(a.wahl.filter((w) => gleich(w, l[0]))).toHaveLength(1);
        a.wahl.forEach((w, i) => a.wahl!.forEach((v, j) => i !== j && expect(gleich(w, v)).toBe(false)));
      }
    }
  });

  it('immer dieselben Schritte (nach Neuladen derselbe Schritt)', () => {
    expect(lernbeispiel(f)).toEqual(schritte);
  });

  it('von leicht zu gewöhnlich: der Aufwand wächst von Schritt zu Schritt, der erste ist eine einzige Handlung', () => {
    const aufwand = schritte.map((a) => AUFWAND[id](a.bedingung));
    for (let k = 1; k < aufwand.length; k++) expect(kleiner(aufwand[k - 1], aufwand[k]), `Schritt ${k} vor ${k + 1}: ${aufwand}`).toBe(true);
    expect(handlungen(id, schritte[0].bedingung)).toBe(1);
    // alle Antworten mit einer Handlung: die sofortige Rückmeldung kommt nie mitten in einer Zahl
    for (const a of schritte) expect(handlungen(id, a.bedingung)).toBe(1);
  });

  it('der letzte Schritt ist eine gewöhnliche Aufgabe der Stufe 1', () => {
    const letzter = schritte[schritte.length - 1].bedingung;
    if (id === 'wer-ist-es') {
      // Stufe 1: sechs Raupen, genau ein Hinweis, nicht durchgestrichen (wie der Generator, `erzeuge`)
      const w = letzter as WerIstEs;
      expect(w.raupen).toHaveLength(6);
      expect(w.hinweise).toHaveLength(1);
      expect(w.hinweise[0].nicht).toBe(false);
      expect(w.hinweise[0].art).not.toBe('hut-da');
    } else {
      // der Generator der Stufe 1 baut genau diese Aufgabe auch selbst (Standard-Zahlenraum)
      const text = JSON.stringify(letzter);
      let gefunden = false;
      for (let s = 0; s < 20_000 && !gefunden; s++) gefunden = JSON.stringify(aufgabeAus(f, s * 2654435761, 1).bedingung) === text;
      expect(gefunden).toBe(true);
    }
  });

  it('sofortige Rückmeldung: richtig, falsch, halb getippte Zahl bleibt offen', () => {
    for (const a of schritte) {
      const l = f.loesungen(a.bedingung)[0];
      expect(lernPruefen(f, a, l)).toBe('richtig');
      expect(lernPruefen(f, a, null)).toBe('offen');
      const anders: Antwort = a.wahl ? a.wahl.find((w) => !gleich(w, l))! : { art: 'zahl', wert: l.art === 'zahl' ? (l.wert + 1) % 10 : 1 };
      expect(lernPruefen(f, a, anders)).toBe('falsch');
    }
  });
});

describe('Rückmeldung bei Zahlen mit zwei Stellen', () => {
  it('1 auf dem Weg zu 10 ist offen, 2 ist falsch', () => {
    const f = FORMATE.zahlenmauer;
    const a = aufgabeAus(f, 0, 1);
    const m: Mauer = { reihen: [[4, 6], [10]], fehlt: [1, 0], grenze: 10 };
    const b = { ...a, bedingung: m };
    expect(lernPruefen(f, b, { art: 'zahl', wert: 1 })).toBe('offen');
    expect(lernPruefen(f, b, { art: 'zahl', wert: 2 })).toBe('falsch');
    expect(lernPruefen(f, b, { art: 'zahl', wert: 10 })).toBe('richtig');
  });

  it('Plätze in jeder Reihenfolge: 1 und 4 auf dem Weg zu 14 sind offen, 3 und 41 falsch', () => {
    const f = FORMATE.zahlenmauer;
    const a = aufgabeAus(f, 0, 1);
    const m: Mauer = { reihen: [[6, 8], [14]], fehlt: [1, 0], grenze: 20 };
    const b = { ...a, bedingung: m };
    expect(lernPruefen(f, b, { art: 'zahl', wert: 1 })).toBe('offen');
    expect(lernPruefen(f, b, { art: 'zahl', wert: 4 })).toBe('offen');
    expect(lernPruefen(f, b, { art: 'zahl', wert: 3 })).toBe('falsch');
    expect(lernPruefen(f, b, { art: 'zahl', wert: 41 })).toBe('falsch');
    expect(lernPruefen(f, b, { art: 'zahl', wert: 14 })).toBe('richtig');
  });
});

/** wie das Kind: alle richtig außer `ausser`; dort die erste falsche Antwort */
function satzMit(samen: number, f: (s: Sitzung, i: number) => Sitzung): Sitzung {
  const s0 = neueSitzung(samen);
  return s0.aufgaben.reduce((s, _, i) => f(s, i), s0);
}
const loesung = (s: Sitzung, i: number): Antwort => FORMATE[s.aufgaben[i].format].loesungen(s.aufgaben[i].bedingung)[0];
const falsch = (s: Sitzung, i: number): Antwort => {
  const a = s.aufgaben[i];
  const l = loesung(s, i);
  return a.wahl ? a.wahl.find((w) => !gleich(w, l))! : { art: 'zahl', wert: l.art === 'zahl' ? (l.wert + 1) % 100 : 1 };
};
const setze = (s: Sitzung, i: number, a: Antwort): Sitzung => ({ ...s, satz: setzeAntwort(s.satz, i, a) });
const pruefe = (s: Sitzung): Sitzung => {
  const st = (i: number, a: Antwort) => FORMATE[s.aufgaben[i].format].loesungen(s.aufgaben[i].bedingung).some((l) => gleich(l, a));
  return { ...s, satz: vergleiche(s.satz, st).satz };
};
const hilfe = (s: Sitzung, i: number, h: HilfeStufe): Sitzung => ({
  ...s,
  hilfeOffen: s.hilfeOffen.map((x, j) => (j === i ? h : x)),
  aufgaben: s.aufgaben.map((a, j) => (j === i ? { ...a, hilfe: Math.max(a.hilfe, h) as HilfeStufe } : a)),
});
const alleBekannt = (): Profil => ({ ...neuesProfil(), formate: Object.fromEntries(PROBE_FORMATE.map((id) => [id, 'bekannt'])) });

describe('Kenntnis der Formate im Profil', () => {
  it('neues Profil: jedes Format neu → Lernbeispiel vorher', () => {
    const p = neuesProfil();
    for (const id of IDS) {
      expect(kenntnis(p, id)).toBe('neu');
      expect(lernbeispielVorher(p, id)).toBe(true);
    }
    expect(lernbeispielVorher(alleBekannt(), 'muster')).toBe(false);
    expect(lernbeispielVorher({ ...neuesProfil(), formate: { muster: 'nochmal' } }, 'muster')).toBe(true);
  });

  it('alles ohne Hilfe 4 gelöst: bleibt bekannt (das Lernbeispiel kommt nicht wieder)', () => {
    let s = satzMit(5, (x, i) => setze(x, i, i === 1 ? falsch(x, i) : loesung(x, i)));
    s = pruefe(s);
    s = hilfe(s, 1, 3);
    s = pruefe(setze(s, 1, loesung(s, 1)));
    const r = abschliessen(s, alleBekannt(), neueHistorie());
    expect(r.historie.eintraege.map((e) => e.ergebnis)).toEqual(['gold', 'hilfe', 'gold']);
    expect(r.profil.formate).toEqual(alleBekannt().formate);
  });

  it('zurückgelegt → nochmal (nur dieses Format)', () => {
    let s = satzMit(6, (x, i) => setze(x, i, i === 2 ? falsch(x, i) : loesung(x, i)));
    s = pruefe(s);
    s = hilfe(s, 2, 4);
    s = { ...s, satz: zuruecklegen(s.satz, 2) };
    const r = abschliessen(s, alleBekannt(), neueHistorie());
    expect(r.historie.eintraege[2].ergebnis).toBe('zurueck');
    const id = s.aufgaben[2].format;
    expect(r.profil.formate[id]).toBe('nochmal');
    for (const andere of PROBE_FORMATE.filter((x) => x !== id)) expect(r.profil.formate[andere]).toBe('bekannt');
    expect(lernbeispielVorher(r.profil, id)).toBe(true);
  });

  it('nur mit Hilfe Stufe 4 gelöst → nochmal', () => {
    let s = satzMit(7, (x, i) => setze(x, i, i === 0 ? falsch(x, i) : loesung(x, i)));
    s = pruefe(s);
    s = hilfe(s, 0, 4);
    s = pruefe(setze(s, 0, loesung(s, 0)));
    const r = abschliessen(s, alleBekannt(), neueHistorie());
    expect(r.historie.eintraege[0]).toMatchObject({ ergebnis: 'hilfe', hilfe: 4 });
    expect(r.profil.formate[s.aufgaben[0].format]).toBe('nochmal');
  });

  it('abschliessen zählt die Kenntnis genau einmal je Satz', () => {
    let s = satzMit(6, (x, i) => setze(x, i, i === 2 ? falsch(x, i) : loesung(x, i)));
    s = pruefe(s);
    s = { ...s, satz: zuruecklegen(hilfe(s, 2, 4).satz, 2) };
    const r1 = abschliessen(s, alleBekannt(), neueHistorie());
    // das Lernbeispiel ist inzwischen durch: wieder bekannt; ein zweites Abschließen ändert nichts
    const p = { ...r1.profil, formate: { ...r1.profil.formate, [s.aufgaben[2].format]: 'bekannt' as const } };
    expect(abschliessen(r1.sitzung, p, r1.historie).profil).toBe(p);
  });
});

describe('Profil: Umzug von Version 1', () => {
  it('Schnappschuss aus Version 1: „gesehen“ wird zu „bekannt“, sonst neu; alles Übrige bleibt', () => {
    expect(v1.profil.version).toBe(1);
    const p = ladeProfil(structuredClone(v1.profil))!;
    expect(p).toEqual({ version: 3, formate: { zahlenmauer: 'bekannt', muster: 'bekannt' }, blaetter: 7, saetze: 2, geheim: { wort: 'TEICH', offen: [0, 3] }, ton: false, zurueckgelegt: [] });
    expect(Object.keys(p).sort()).toEqual(Object.keys(neuesProfil()).sort());
    expect(kenntnis(p, 'wer-ist-es')).toBe('neu');
    expect(lernbeispielVorher(p, 'wer-ist-es')).toBe(true);
    expect(lernbeispielVorher(p, 'zahlenmauer')).toBe(false);
  });

  it('Version 3 bleibt, wie sie ist; Unbekanntes → null', () => {
    const p: Profil = { ...neuesProfil(), formate: { muster: 'nochmal' }, blaetter: 3 };
    expect(ladeProfil(structuredClone(p))).toEqual(p);
    expect(ladeProfil({ ...p, version: 4 })).toBeNull();
    expect(ladeProfil(null)).toBeNull();
  });
});
