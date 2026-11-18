import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FORMATE } from '../src/aufgaben';
import type { HilfeStufe } from '../src/aufgaben/format';
import { gleich, type Antwort } from '../src/perlen/antwort';
import { hilfeOeffnen, hilfePulst, hoechsteHilfe, neueFehler, pulsNachfuehren, PULS_AB } from '../src/satz/hilfe';
import { neueHistorie } from '../src/satz/historie';
import { abschliessen, ladeSitzung, neueSitzung, neuesProfil, type Sitzung } from '../src/satz/sitzung';
import { setzeAntwort, vergleiche, zuruecklegen } from '../src/satz/vergleich';

/** Hilfeknopf gegen Durchprobieren (docs/PLAN.md, A6): wann er pulsiert, wann nicht mehr; Historie; Speicher */

const v1 = JSON.parse(readFileSync(resolve(__dirname, 'fixtures/speicher-v1.json'), 'utf8'));
const SAMEN = 20261115;
const HEUTE = new Date(2026, 10, 18, 10, 30);

/** Zahlenmauer: die Antwort ist eine Zahl, falsche Antworten lassen sich beliebig viele bilden */
const s0 = neueSitzung(SAMEN);
const M = s0.aufgaben.findIndex((a) => a.format === 'zahlenmauer');

function loesung(s: Sitzung, i: number): Antwort {
  const a = s.aufgaben[i];
  return FORMATE[a.format].loesungen(a.bedingung)[0];
}
/** k-te falsche Zahl der Mauer (k = 0, 1, …): Lösung + 1 + k */
function falsch(s: Sitzung, i: number, k = 0): Antwort {
  const l = loesung(s, i);
  return { art: 'zahl', wert: l.art === 'zahl' ? l.wert + 1 + k : 1 + k };
}

/** wie das Kind: Antwort setzen */
const setze = (s: Sitzung, i: number, a: Antwort | null): Sitzung => ({ ...s, satz: setzeAntwort(s.satz, i, a) });
/** wie der Bildschirm: Vergleichen, danach den Puls festhalten */
const pruefe = (s: Sitzung): Sitzung => {
  const st = (i: number, a: Antwort) => FORMATE[s.aufgaben[i].format].loesungen(s.aufgaben[i].bedingung).some((l) => gleich(l, a));
  return pulsNachfuehren({ ...s, satz: vergleiche(s.satz, st).satz });
};
/** alle anderen Perlen richtig, Perle M bekommt `a`, dann Vergleichen */
const erste = (a: Antwort): Sitzung => pruefe(setze(s0.aufgaben.reduce((acc, _, i) => setze(acc, i, loesung(s0, i)), s0), M, a));
/** an Perle M: Antworten nacheinander eingeben und jeweils vergleichen */
const versuche = (s: Sitzung, ...antworten: Antwort[]): Sitzung => antworten.reduce((acc, a) => pruefe(setze(acc, M, a)), s);

const f = (k: number) => falsch(s0, M, k);

describe('Hilfeknopf pulsiert', () => {
  it('nicht vor dem ersten Vergleichen, auch wenn sich die Antwort oft ändert', () => {
    let s = s0;
    for (let k = 0; k < 5; k++) s = setze(s, M, f(k));
    expect(s.satz.runden).toBe(0);
    s0.satz.perlen.forEach((_, i) => expect(hilfePulst(s, i)).toBe(false));
  });

  it('nicht nach einer Fehlprüfung', () => {
    const s = erste(f(0));
    expect(s.satz.perlen[M].fehlversuche).toBe(1);
    expect(hilfePulst(s, M)).toBe(false);
  });

  it('nicht nach nochmal Vergleichen ohne Änderung', () => {
    let s = erste(f(0));
    s = pruefe(s);
    s = pruefe(s);
    expect(hilfePulst(s, M)).toBe(false);
  });

  it('nicht nach Wiederholung derselben Fehlantwort (dazwischen geändert und zurück)', () => {
    let s = erste(f(0));
    s = setze(s, M, f(1));
    s = pruefe(setze(s, M, f(0)));
    expect(s.satz.perlen[M].fehlversuche).toBe(1);
    expect(hilfePulst(s, M)).toBe(false);
  });

  it('nach zwei Fehlprüfungen mit verschiedenen Antworten – nur bei dieser Perle', () => {
    const s = versuche(erste(f(0)), f(1));
    expect(PULS_AB).toBe(2);
    expect(hilfePulst(s, M)).toBe(true);
    s.satz.perlen.forEach((_, i) => i !== M && expect(hilfePulst(s, i)).toBe(false));
    // auch wenn das Kind gerade bei einer anderen Perle ist: der Zustand gehört der Perle
    expect(hilfePulst({ ...s, aktuell: (M + 1) % 3 }, M)).toBe(true);
  });

  it('verrät nichts: nah an der Lösung oder weit weg pulsiert gleich', () => {
    const nah = versuche(erste(f(0)), f(1));
    const weit = versuche(erste(f(40)), f(70));
    expect(hilfePulst(nah, M)).toBe(hilfePulst(weit, M));
    // eine dritte Fehlantwort, nah oder weit: weiter Puls
    expect(hilfePulst(versuche(nah, f(2)), M)).toBe(true);
    expect(hilfePulst(versuche(nah, f(90)), M)).toBe(true);
  });

  it('nicht, wenn alle Hilfestufen offen sind (nach dem Vergleichen: 4)', () => {
    let s = versuche(erste(f(0)), f(1));
    expect(hoechsteHilfe(s.satz)).toBe(4);
    const mitStufe = (h: HilfeStufe): Sitzung => ({ ...s, hilfeOffen: s.hilfeOffen.map((x, j) => (j === M ? h : x)) });
    expect(hilfePulst(mitStufe(3), M)).toBe(true);
    expect(hilfePulst(mitStufe(4), M)).toBe(false);
    // über den Knopf bis Stufe 4, dann weitere Fehlantworten: kein Puls mehr
    for (let k = 0; k < 4; k++) s = hilfeOeffnen(s, M);
    expect(s.hilfeOffen[M]).toBe(4);
    s = versuche(s, f(5), f(6), f(7));
    expect(hilfePulst(s, M)).toBe(false);
  });

  it('hört auf, wenn das Kind Hilfe drückt; danach erst nach zwei NEUEN Fehlantworten wieder', () => {
    let s = versuche(erste(f(0)), f(1));
    expect(hilfePulst(s, M)).toBe(true);
    s = hilfeOeffnen(s, M);
    expect(s.hilfeOffen[M]).toBe(1);
    expect(hilfePulst(s, M)).toBe(false);
    s = versuche(s, f(2)); // eine neue
    expect(hilfePulst(s, M)).toBe(false);
    s = versuche(s, f(0)); // alte Fehlantwort von vor dem Drücken: zählt nicht
    expect(hilfePulst(s, M)).toBe(false);
    s = versuche(s, f(2)); // Wiederholung aus der neuen Reihe: zählt nicht
    expect(hilfePulst(s, M)).toBe(false);
    s = versuche(s, f(3)); // zweite neue
    expect(hilfePulst(s, M)).toBe(true);
  });

  it('Hilfe vor den Fehlantworten gedrückt (Stufe 1–2 vor dem Vergleichen): zwei Fehlprüfungen danach pulsieren', () => {
    let s = hilfeOeffnen(hilfeOeffnen(s0, M), M);
    expect(s.hilfeOffen[M]).toBe(2);
    // vor dem Vergleichen höchstens Stufe 2
    expect(hilfeOeffnen(s, M)).toBe(s);
    s = pruefe(setze(s0.aufgaben.reduce((acc, _, i) => setze(acc, i, loesung(s0, i)), s), M, f(0)));
    s = versuche(s, f(1));
    expect(hilfePulst(s, M)).toBe(true);
  });

  it('hört auf, wenn die Perle gelöst oder zurückgelegt ist', () => {
    const s = versuche(erste(f(0)), f(1));
    const geloest = versuche(s, loesung(s, M));
    expect(geloest.satz.perlen[M].blatt).toBe('gehoben');
    expect(hilfePulst(geloest, M)).toBe(false);
    const zurueck = { ...s, satz: zuruecklegen(s.satz, M) };
    expect(hilfePulst(zurueck, M)).toBe(false);
  });

  it('die Hilfe öffnet sich nie von selbst: Vergleichen ändert keine Hilfestufe', () => {
    const s = versuche(erste(f(0)), f(1), f(2), f(3));
    expect(s.hilfeOffen).toEqual(s0.hilfeOffen);
    expect(s.aufgaben.map((a) => a.hilfe)).toEqual(s0.aufgaben.map((a) => a.hilfe));
  });

  it('neueFehler: nur Antworten ab der Marke, die vorher nie nicht gepasst haben; unbekannte (null) zählen', () => {
    const z = (wert: number): Antwort => ({ art: 'zahl', wert });
    expect(neueFehler([], 0)).toBe(0);
    expect(neueFehler([z(5), z(7)], 0)).toBe(2);
    expect(neueFehler([z(5), z(7), z(5)], 0)).toBe(2);
    expect(neueFehler([z(5), z(7), z(5), z(9)], 2)).toBe(1);
    expect(neueFehler([null, null], 0)).toBe(2);
    expect(neueFehler([null, z(5), z(5)], 1)).toBe(1);
  });
});

describe('Hilfe öffnen', () => {
  it('nächste Stufe, höchste Stufe in der Aufgabe; vor dem Vergleichen bis 2, danach bis 4', () => {
    let s = s0;
    s = hilfeOeffnen(s, M);
    expect(s.hilfeOffen[M]).toBe(1);
    expect(s.aufgaben[M].hilfe).toBe(1);
    s = hilfeOeffnen(s, M);
    expect(hilfeOeffnen(s, M)).toBe(s);
    // Standard: die aktuelle Perle
    const t = hilfeOeffnen({ ...s0, aktuell: 2 });
    expect(t.hilfeOffen).toEqual([0, 0, 1]);
  });

  it('Puls wird festgehalten: nach dem Vergleichen und beim Drücken; nachführen ändert sonst nichts', () => {
    let s = erste(f(0));
    expect(s.puls[M]).toEqual({ marke: 0, puls: false, hilfeNachPuls: false });
    expect(pulsNachfuehren(s)).toBe(s);
    s = versuche(s, f(1));
    expect(s.puls[M]).toEqual({ marke: 0, puls: true, hilfeNachPuls: false });
    expect(pulsNachfuehren(s)).toBe(s);
    s = hilfeOeffnen(s, M);
    expect(s.puls[M]).toEqual({ marke: 2, puls: true, hilfeNachPuls: true });
    // nochmal drücken, ohne dass er pulsiert: bleibt so, Marke wandert mit
    s = hilfeOeffnen(versuche(s, f(2)), M);
    expect(s.puls[M]).toEqual({ marke: 3, puls: true, hilfeNachPuls: true });
  });
});

describe('Historie: Puls und Hilfe danach', () => {
  const fertig = (s: Sitzung) => {
    const r = abschliessen(versuche(s, loesung(s, M)), neuesProfil(), neueHistorie(), HEUTE);
    return r.historie.eintraege;
  };

  it('kein Puls: beide false; bei jeder Aufgabe steht es da', () => {
    const e = fertig(erste(f(0)));
    expect(e).toHaveLength(3);
    for (const x of e) expect([x.puls, x.hilfeNachPuls]).toEqual([false, false]);
    expect(e[M].ergebnis).toBe('selbst');
  });

  it('gepulst, ohne Hilfe gelöst: puls true, hilfeNachPuls false', () => {
    const e = fertig(versuche(erste(f(0)), f(1)));
    expect([e[M].puls, e[M].hilfeNachPuls]).toEqual([true, false]);
    expect(e[M].ergebnis).toBe('selbst');
    e.forEach((x, i) => i !== M && expect(x.puls).toBe(false));
  });

  it('gepulst, Hilfe gedrückt, dann gelöst: beide true', () => {
    let s = versuche(erste(f(0)), f(1));
    s = hilfeOeffnen(hilfeOeffnen(s, M), M);
    const e = fertig(s);
    expect([e[M].puls, e[M].hilfeNachPuls]).toEqual([true, true]);
    expect(e[M].ergebnis).toBe('hilfe');
    expect(e[M].hilfe).toBe(2);
  });

  it('Hilfe gedrückt, bevor er pulsierte: puls false, hilfeNachPuls false', () => {
    let s = hilfeOeffnen(erste(f(0)), M);
    s = versuche(s, f(1));
    const e = fertig(s);
    expect([e[M].puls, e[M].hilfeNachPuls]).toEqual([false, false]);
  });

  it('gepulst, Hilfe gedrückt, bis „Später“: zurückgelegt mit beiden true', () => {
    let s = versuche(erste(f(0)), f(1));
    for (let k = 0; k < 4; k++) s = hilfeOeffnen(s, M);
    s = { ...s, satz: zuruecklegen(s.satz, M) };
    const e = abschliessen(s, neuesProfil(), neueHistorie(), HEUTE).historie.eintraege;
    expect(e[M].ergebnis).toBe('zurueck');
    expect([e[M].puls, e[M].hilfeNachPuls]).toEqual([true, true]);
  });
});

describe('Speicher: Puls übersteht Neuladen; Sätze von vorher', () => {
  it('nach Speichern und Laden: derselbe Zustand, der Knopf pulsiert weiter bzw. nicht', () => {
    const an = versuche(erste(f(0)), f(1));
    const aus = hilfeOeffnen(an, M);
    for (const s of [an, aus]) {
      const geladen = ladeSitzung(JSON.parse(JSON.stringify(s)))!;
      expect(geladen).toEqual(s);
      expect(hilfePulst(geladen, M)).toBe(hilfePulst(s, M));
    }
    expect(hilfePulst(ladeSitzung(JSON.parse(JSON.stringify(an)))!, M)).toBe(true);
  });

  it('Satz der Version 2 von vor A6 (ohne Puls): bekommt ihn beim Laden, sonst bleibt alles', () => {
    const { puls: _p, ...alt } = versuche(erste(f(0)), f(1));
    const geladen = ladeSitzung(structuredClone(alt))!;
    expect(geladen.version).toBe(2);
    expect({ ...geladen, puls: undefined }).toEqual({ ...alt, puls: undefined });
    expect(geladen.puls).toHaveLength(3);
    // ohne offene Hilfe zählen alle Fehlantworten: pulsiert, wird beim Laden festgehalten
    expect(hilfePulst(geladen, M)).toBe(true);
    expect(pulsNachfuehren(geladen).puls[M]).toEqual({ marke: 0, puls: true, hilfeNachPuls: false });
    // mit schon offener Hilfe: vorsichtig als danach gedrückt – zählt erst ab jetzt
    const { puls: _q, ...mitHilfe } = versuche(hilfeOeffnen(erste(f(0)), M), f(1));
    const g2 = ladeSitzung(structuredClone(mitHilfe))!;
    expect(g2.puls[M]).toEqual({ marke: 2, puls: false, hilfeNachPuls: false });
    expect(hilfePulst(g2, M)).toBe(false);
  });

  it('Satz aus Version 1: Puls dazu, Hilfe 3 war offen → Marke hinter der bekannten Fehlprüfung', () => {
    const s = ladeSitzung(structuredClone(v1.sitzung))!;
    expect(s.puls).toEqual([
      { marke: 0, puls: false, hilfeNachPuls: false },
      { marke: 1, puls: false, hilfeNachPuls: false },
      { marke: 0, puls: false, hilfeNachPuls: false },
    ]);
    expect(hilfePulst(s, 1)).toBe(false);
  });
});
