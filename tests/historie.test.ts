import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FORMATE } from '../src/aufgaben';
import type { HilfeStufe } from '../src/aufgaben/format';
import { aufbewahren, ladeGeschuetzt, lesen, schreiben, unbekanntSchluessel } from '../src/core/speicher';
import { gleich, type Antwort } from '../src/perlen/antwort';
import {
  eintraege,
  fehlantworten,
  gewicht,
  gleicheFehler,
  historieLesen,
  ladeHistorie,
  neueHistorie,
  rateChance,
  tage,
  tagVon,
  type Eintrag,
  type Historie,
} from '../src/satz/historie';
import { abschliessen, ladeProfil, ladeSitzung, neueSitzung, neuesProfil, type Sitzung } from '../src/satz/sitzung';
import { setzeAntwort, vergleiche, zuruecklegen } from '../src/satz/vergleich';

/** Historie der Aufgaben (docs/PLAN.md, A3): Ausgang, Lösungsweg, Gewicht, Tag; Speicher und Umzüge */

const v1 = JSON.parse(readFileSync(resolve(__dirname, 'fixtures/speicher-v1.json'), 'utf8'));
const SAMEN = 20261115;
const HEUTE = new Date(2026, 10, 17, 10, 30);

function loesung(s: Sitzung, i: number): Antwort {
  const a = s.aufgaben[i];
  return FORMATE[a.format].loesungen(a.bedingung)[0];
}

/** k-te falsche Antwort derselben Art (k = 0, 1, …) */
function falsch(s: Sitzung, i: number, k = 0): Antwort {
  const a = s.aufgaben[i];
  const l = loesung(s, i);
  if (a.wahl) return a.wahl.filter((w) => !gleich(w, l))[k];
  return { art: 'zahl', wert: l.art === 'zahl' ? (l.wert + 1 + k) % 100 : 1 + k };
}

/** wie das Kind: Antwort setzen */
const setze = (s: Sitzung, i: number, a: Antwort | null): Sitzung => ({ ...s, satz: setzeAntwort(s.satz, i, a) });
/** wie das Kind: Hilfe bis Stufe `h` öffnen (wie der Bildschirm: höchste Stufe in der Aufgabe) */
const hilfe = (s: Sitzung, i: number, h: HilfeStufe): Sitzung => ({
  ...s,
  hilfeOffen: s.hilfeOffen.map((x, j) => (j === i ? h : x)),
  aufgaben: s.aufgaben.map((a, j) => (j === i ? { ...a, hilfe: Math.max(a.hilfe, h) as HilfeStufe } : a)),
});
const pruefe = (s: Sitzung): Sitzung => {
  const st = (i: number, a: Antwort) => FORMATE[s.aufgaben[i].format].loesungen(s.aufgaben[i].bedingung).some((l) => gleich(l, a));
  return { ...s, satz: vergleiche(s.satz, st).satz };
};
const alleRichtig = (s: Sitzung, ausser: number[] = []): Sitzung =>
  s.aufgaben.reduce((acc, _, i) => (ausser.includes(i) ? acc : setze(acc, i, loesung(s, i))), s);

function abschluss(s: Sitzung, h: Historie = neueHistorie(), jetzt = HEUTE) {
  return abschliessen(s, neuesProfil(), h, jetzt);
}

describe('Historie: Ausgang jeder Aufgabe', () => {
  it('gold: beim ersten Vergleichen gleich – auch mit Hilfe 2 vor dem Vergleichen (Stufe steht daneben)', () => {
    let s = neueSitzung(SAMEN);
    s = hilfe(s, 1, 2);
    s = pruefe(alleRichtig(s));
    const h = abschluss(s).historie;
    expect(h.eintraege.map((e) => e.ergebnis)).toEqual(['gold', 'gold', 'gold']);
    expect(h.eintraege.map((e) => e.hilfe)).toEqual([0, 2, 0]);
    for (const e of h.eintraege) {
      expect(e.falsch).toEqual([]);
      expect(e.gleicherFehler).toBe(0);
    }
  });

  it('selbst: später korrigiert, ohne Hilfe oder nur mit „So geht\'s“ (Stufe 1)', () => {
    let s = neueSitzung(SAMEN);
    s = pruefe(setze(alleRichtig(s), 0, falsch(s, 0)));
    s = hilfe(s, 0, 1);
    s = pruefe(setze(s, 0, loesung(s, 0)));
    const [e] = abschluss(s).historie.eintraege;
    expect(e.ergebnis).toBe('selbst');
    expect(e.hilfe).toBe(1);
    expect(e.falsch).toEqual([falsch(s, 0)]);
    expect(e.antwort).toEqual(loesung(s, 0));
  });

  it.each([2, 3, 4] as HilfeStufe[])('hilfe: später korrigiert mit Stufe %i – die Stufe wird gespeichert', (stufe) => {
    let s = neueSitzung(SAMEN);
    s = pruefe(setze(alleRichtig(s), 2, falsch(s, 2)));
    s = hilfe(s, 2, stufe);
    s = pruefe(setze(s, 2, loesung(s, 2)));
    const e = abschluss(s).historie.eintraege[2];
    expect(e.ergebnis).toBe('hilfe');
    expect(e.hilfe).toBe(stufe);
  });

  it('zurueck: zurückgelegt; die letzte Antwort und die Fehlantworten bleiben', () => {
    let s = neueSitzung(SAMEN);
    s = pruefe(setze(alleRichtig(s), 1, falsch(s, 1)));
    s = hilfe(s, 1, 4);
    s = setze(s, 1, falsch(s, 1, 1));
    s = { ...s, satz: zuruecklegen(s.satz, 1) };
    const e = abschluss(s).historie.eintraege[1];
    expect(e.ergebnis).toBe('zurueck');
    expect(e.hilfe).toBe(4);
    expect(e.antwort).toEqual(falsch(s, 1, 1));
    expect(e.falsch).toEqual([falsch(s, 1)]);
  });

  it('die Aufgabe kommt ganz hinein: Format, Version, Samen, Stufe, Zahlenraum, Bedingung, Wahl in gezeigter Reihenfolge', () => {
    const s = pruefe(alleRichtig(neueSitzung(SAMEN)));
    const h = abschluss(s).historie;
    h.eintraege.forEach((e, i) => {
      const a = s.aufgaben[i];
      expect(e).toMatchObject({ format: a.format, version: a.version, samen: a.samen, stufe: a.stufe, zahlenraum: a.zahlenraum, hilfe: a.hilfe });
      expect(e.bedingung).toEqual(a.bedingung);
      expect(e.wahl).toEqual(a.wahl);
      expect(e.nr).toBe(i);
      expect(e.satz).toBe(0);
    });
  });

  it('Eintrag ist knapp: nur Aufgabe + Lösungsweg, nichts doppelt', () => {
    const e = abschluss(pruefe(alleRichtig(neueSitzung(SAMEN)))).historie.eintraege[0];
    expect(Object.keys(e).sort()).toEqual(
      ['antwort', 'bedingung', 'falsch', 'format', 'gleicherFehler', 'hilfe', 'nr', 'rateChance', 'samen', 'satz', 'stufe', 'tag', 'version', 'wahl', 'zahlenraum', 'ergebnis'].sort(),
    );
  });
});

describe('Historie: gleicherFehler', () => {
  const z = (wert: number): Antwort => ({ art: 'zahl', wert });

  it('zählt Antworten, die bei einer früheren Prüfung schon nicht gepasst hatten', () => {
    expect(gleicheFehler([])).toBe(0);
    expect(gleicheFehler([z(5), z(7)])).toBe(0);
    expect(gleicheFehler([z(5), z(7), z(5)])).toBe(1);
    expect(gleicheFehler([z(5), z(7), z(5), z(7)])).toBe(2);
    expect(gleicheFehler([z(5), z(7), z(5), z(5)])).toBe(2);
    // unbekannte Antworten (Satz von vor A3) zählen nicht
    expect(gleicheFehler([null, null, z(5)])).toBe(0);
  });

  it('im Satz: zurück zur alten Fehlantwort zählt, nochmal Vergleichen ohne Änderung nicht', () => {
    let s = neueSitzung(SAMEN);
    const i = 0;
    const [a, b] = [falsch(s, i, 0), falsch(s, i, 1)];
    s = pruefe(setze(alleRichtig(s), i, a)); // a passt nicht
    s = pruefe(s); // ohne Änderung: kein Versuch
    s = pruefe(setze(s, i, b)); // b passt nicht
    s = pruefe(setze(s, i, a)); // wieder a: gleicher Fehler
    expect(s.satz.perlen[i].fehlversuche).toBe(3);
    s = pruefe(setze(s, i, loesung(s, i)));
    const e = abschluss(s).historie.eintraege[i];
    expect(e.falsch).toEqual([a, b, a]);
    expect(e.gleicherFehler).toBe(1);
    expect(e.ergebnis).toBe('selbst');
  });
});

describe('Historie: Ratechance und Gewicht', () => {
  it('rateChance aus der Art der Eingabe: Wahl aus k → 1/k, sonst 0', () => {
    const w = (k: number): Antwort[] => Array.from({ length: k }, (_, i) => ({ art: 'zahl', wert: i }));
    expect(rateChance({ art: 'wahl' }, w(4))).toBe(1 / 4);
    expect(rateChance({ art: 'wahl' }, w(3))).toBe(1 / 3);
    expect(rateChance({ art: 'bild' }, w(6))).toBe(1 / 6);
    expect(rateChance({ art: 'bild', mehrfach: true }, w(6))).toBe(0);
    expect(rateChance({ art: 'zahl', max: 20 }, null)).toBe(0);
    expect(rateChance({ art: 'zeit' }, null)).toBe(0);
    expect(rateChance({ art: 'geld', maxCent: 100 }, null)).toBe(0);
    for (const art of ['raster', 'reihe', 'paare', 'weg', 'bau'] as const) expect(rateChance({ art }, null)).toBe(0);
    expect(rateChance({ art: 'wahl' }, null)).toBe(0);
  });

  it('im Satz: Muster (Wahl aus 4) 1/4, Wer ist es? (eine von 6 Raupen) 1/6, Zahlenmauer (Zahl) 0', () => {
    const h = abschluss(pruefe(alleRichtig(neueSitzung(SAMEN)))).historie;
    const nach = Object.fromEntries(h.eintraege.map((e) => [e.format, e.rateChance]));
    expect(nach).toEqual({ muster: 1 / 4, 'wer-ist-es': 1 / 6, zahlenmauer: 0 });
  });

  it('Gewicht: (1 − rateChance) × Hilfefaktor; Wahl und Hilfe wiegen weniger; zurückgelegt 0', () => {
    expect(gewicht({ ergebnis: 'gold', hilfe: 0, rateChance: 0 })).toBe(1);
    expect(gewicht({ ergebnis: 'gold', hilfe: 0, rateChance: 1 / 3 })).toBeCloseTo(2 / 3);
    expect(gewicht({ ergebnis: 'selbst', hilfe: 1, rateChance: 0 })).toBe(1);
    expect(gewicht({ ergebnis: 'gold', hilfe: 2, rateChance: 0 })).toBe(0.75);
    expect(gewicht({ ergebnis: 'hilfe', hilfe: 3, rateChance: 0 })).toBe(0.5);
    expect(gewicht({ ergebnis: 'hilfe', hilfe: 4, rateChance: 1 / 4 })).toBeCloseTo(0.1875);
    expect(gewicht({ ergebnis: 'zurueck', hilfe: 4, rateChance: 0 })).toBe(0);
    // richtige Wahl aus drei wiegt weniger als richtig eingegebene Zahl (docs/TZ.md, „Сложность“)
    expect(gewicht({ ergebnis: 'gold', hilfe: 0, rateChance: 1 / 3 })).toBeLessThan(gewicht({ ergebnis: 'gold', hilfe: 0, rateChance: 0 }));
    // mehr Hilfe → nie mehr Gewicht
    const g = ([0, 1, 2, 3, 4] as HilfeStufe[]).map((hilfe) => gewicht({ ergebnis: 'hilfe', hilfe, rateChance: 0 }));
    for (let i = 1; i < g.length; i++) expect(g[i]).toBeLessThanOrEqual(g[i - 1]);
  });
});

describe('Historie: Tag', () => {
  it('Datum ohne Uhrzeit nach Ortszeit des Geräts, JJJJ-MM-TT', () => {
    expect(tagVon(new Date(2026, 10, 17, 23, 59))).toBe('2026-11-17');
    expect(tagVon(new Date(2026, 10, 18, 0, 1))).toBe('2026-11-18');
    expect(tagVon(new Date(2027, 0, 5, 12))).toBe('2027-01-05');
  });

  it('Tag des Abschlusses steht an jeder Aufgabe des Satzes', () => {
    const h = abschluss(pruefe(alleRichtig(neueSitzung(SAMEN))), neueHistorie(), new Date(2026, 11, 3, 18, 5)).historie;
    expect(h.eintraege.map((e) => e.tag)).toEqual(['2026-12-03', '2026-12-03', '2026-12-03']);
  });
});

describe('Historie: wächst, nichts geht verloren, nichts doppelt', () => {
  it('ein neuer Satz löscht die Historie nicht', () => {
    const r1 = abschluss(pruefe(alleRichtig(neueSitzung(SAMEN))));
    const s2 = neueSitzung(SAMEN + 1);
    const r2 = abschliessen(pruefe(alleRichtig(s2)), r1.profil, r1.historie, new Date(2026, 10, 18, 9));
    expect(r2.historie.eintraege).toHaveLength(6);
    expect(r2.historie.eintraege.slice(0, 3)).toEqual(r1.historie.eintraege);
    expect(r2.historie.eintraege.map((e) => e.satz)).toEqual([0, 0, 0, 1, 1, 1]);
    expect(r2.historie.eintraege.slice(3).map((e) => e.samen)).toEqual(s2.aufgaben.map((a) => a.samen));
    expect(tage(r2.historie)).toEqual(['2026-11-17', '2026-11-18']);
  });

  it('nochmal abschließen schreibt nichts doppelt', () => {
    const r1 = abschluss(pruefe(alleRichtig(neueSitzung(SAMEN))));
    const r2 = abschliessen(r1.sitzung, r1.profil, r1.historie, HEUTE);
    expect(r2.historie).toBe(r1.historie);
    expect(r2.historie.eintraege).toHaveLength(3);
    expect(r2.profil.saetze).toBe(r1.profil.saetze);
  });

  it('nicht fertiger Satz kommt nicht hinein', () => {
    const s = pruefe(setze(alleRichtig(neueSitzung(SAMEN)), 0, falsch(neueSitzung(SAMEN), 0)));
    const h = neueHistorie();
    expect(abschluss(s, h).historie).toBe(h);
  });

  it('Satz von vor A3 (ohne Liste der Fehlantworten): die Zahl der Fehlversuche bleibt als null', () => {
    let s = ladeSitzung(structuredClone(v1.sitzung))!;
    // Perle 1: einmal falsch geprüft (vor A3, ohne Liste); jetzt korrigiert
    expect(s.satz.perlen[1].falsch).toBeUndefined();
    expect(fehlantworten(s.satz.perlen[1])).toEqual([null]);
    s = pruefe(setze(s, 1, loesung(s, 1)));
    const e = abschluss(s).historie.eintraege[1];
    expect(e.falsch).toEqual([null]);
    expect(e.ergebnis).toBe('hilfe'); // Hilfe 3 war in der Vorlage schon offen
    expect(e.hilfe).toBe(3);
  });
});

describe('Historie lesen', () => {
  it('ladeHistorie: Version 1 so, wie sie ist; nichts, kaputt oder unbekannt → null', () => {
    const h = abschluss(pruefe(alleRichtig(neueSitzung(SAMEN)))).historie;
    expect(ladeHistorie(h)).toBe(h);
    expect(ladeHistorie(structuredClone(h))).toEqual(h);
    expect(ladeHistorie(undefined)).toBeNull();
    expect(ladeHistorie('kaputt')).toBeNull();
    expect(ladeHistorie({ version: 1 })).toBeNull();
    expect(ladeHistorie({ version: 2, eintraege: [] })).toBeNull();
  });

  it('eintraege: nach Format und Zeitraum, in Lösungsreihenfolge; tage für den Kalender', () => {
    let r = abschluss(pruefe(alleRichtig(neueSitzung(SAMEN))), neueHistorie(), new Date(2026, 10, 16, 9));
    r = abschliessen(pruefe(alleRichtig(neueSitzung(7))), r.profil, r.historie, new Date(2026, 10, 17, 9));
    r = abschliessen(pruefe(alleRichtig(neueSitzung(8))), r.profil, r.historie, new Date(2026, 10, 17, 19));
    const h = r.historie;
    expect(eintraege(h)).toHaveLength(9);
    const muster = eintraege(h, { format: 'muster' });
    expect(muster.map((e) => e.satz)).toEqual([0, 1, 2]);
    expect(muster.every((e) => e.format === 'muster')).toBe(true);
    expect(eintraege(h, { von: '2026-11-17' })).toHaveLength(6);
    expect(eintraege(h, { bis: '2026-11-16' })).toHaveLength(3);
    expect(eintraege(h, { format: 'zahlenmauer', von: '2026-11-17', bis: '2026-11-17' }).map((e: Eintrag) => e.satz)).toEqual([1, 2]);
    expect(tage(h)).toEqual(['2026-11-16', '2026-11-17']);
    expect(tage(neueHistorie())).toEqual([]);
  });

  it('historieLesen: vom Gerät; leer → neue Historie', async () => {
    expect(await historieLesen()).toEqual(neueHistorie());
    const h = abschluss(pruefe(alleRichtig(neueSitzung(SAMEN)))).historie;
    await schreiben('historie', h);
    expect(await historieLesen()).toEqual(h);
    await schreiben('historie', undefined);
  });
});

describe('Profil: Umzug von Version 1', () => {
  it('das Profil aus Version 1 öffnet sich mit denselben Werten', () => {
    const p = ladeProfil(structuredClone(v1.profil))!;
    expect(p).toEqual(v1.profil);
    expect(p.version).toBe(1);
  });

  it('fehlt ein Feld, kommt der Wert eines neuen Profils dazu; Unbekanntes → null', () => {
    const { ton: _ton, ...ohneTon } = v1.profil;
    expect(ladeProfil(ohneTon)).toEqual({ ...v1.profil, ton: true });
    expect(ladeProfil(undefined)).toBeNull();
    expect(ladeProfil('kaputt')).toBeNull();
    expect(ladeProfil({ ...v1.profil, version: 2 })).toBeNull();
  });
});

describe('Unbekannte neuere Version wird nicht überschrieben', () => {
  it('aufbewahren: Vorhandenes bleibt, keine Doppelten', () => {
    expect(aufbewahren(undefined, { a: 1 })).toEqual([{ a: 1 }]);
    expect(aufbewahren([{ a: 1 }], { a: 1 })).toEqual([{ a: 1 }]);
    expect(aufbewahren([{ a: 1 }], { a: 2 })).toEqual([{ a: 1 }, { a: 2 }]);
    expect(aufbewahren('etwas', { a: 2 })).toEqual(['etwas', { a: 2 }]);
  });

  it.each([
    ['sitzung', ladeSitzung, { ...neueSitzung(3), version: 3, neu: 'Feld aus der Zukunft' }],
    ['profil', ladeProfil, { ...neuesProfil(), version: 9, blaetter: 120 }],
    ['historie', ladeHistorie, { version: 2, eintraege: [{ format: 'muster', ergebnis: 'gold' }], mehr: true }],
  ] as const)('%s: unverändert unter „…-unbekannt“, die App arbeitet mit neuen Daten weiter', async (schluessel, lade, alt) => {
    await schreiben(schluessel, structuredClone(alt));
    expect(await ladeGeschuetzt<unknown>(schluessel, lade)).toBeNull();
    expect(await lesen(unbekanntSchluessel(schluessel))).toEqual([alt]);
    // erneutes Laden legt keine zweite Kopie an
    await ladeGeschuetzt<unknown>(schluessel, lade);
    expect(await lesen(unbekanntSchluessel(schluessel))).toEqual([alt]);
    // die App schreibt neue Daten unter den eigentlichen Schlüssel – die Kopie bleibt
    await schreiben(schluessel, { version: 1, neu: true });
    expect(await lesen(unbekanntSchluessel(schluessel))).toEqual([alt]);
  });

  it('historieLesen: unbekannte Historie bleibt aufbewahrt, gelesen wird eine neue', async () => {
    const alt = { version: 7, eintraege: [{ x: 1 }] };
    await schreiben('historie', alt);
    expect(await historieLesen()).toEqual(neueHistorie());
    expect(await lesen(unbekanntSchluessel('historie'))).toContainEqual(alt);
  });

  it('nichts gespeichert → keine Kopie', async () => {
    expect(await ladeGeschuetzt('leer-test', ladeSitzung)).toBeNull();
    expect(await lesen(unbekanntSchluessel('leer-test'))).toBeUndefined();
  });

  it('bekannte Version bleibt ohne Kopie', async () => {
    const s = neueSitzung(11);
    await schreiben('bekannt-test', s);
    expect(await ladeGeschuetzt('bekannt-test', ladeSitzung)).toEqual(s);
    expect(await lesen(unbekanntSchluessel('bekannt-test'))).toBeUndefined();
  });
});
