import { describe, expect, it } from 'vitest';
import { FORMATE } from '../src/aufgaben';
import type { FormatId } from '../src/aufgaben/format';
import { gleich, type Antwort } from '../src/perlen/antwort';
import { neueHistorie } from '../src/satz/historie';
import { hilfeOeffnen } from '../src/satz/hilfe';
import { setzeAntwort, vergleiche, zuruecklegen } from '../src/satz/vergleich';
import {
  abschliessen,
  ERSTER_SATZ,
  mischPlan,
  naechsteSitzung,
  neueSitzung,
  neuesProfil,
  probePlan,
  SATZ_LAENGE,
  type Profil,
  type Sitzung,
} from '../src/satz/sitzung';

/** Gemischter Satz aus allen Formaten (Г1а): Länge, Vielfalt nach Fähigkeiten, Stufen, zurückgelegte Aufgabe */

const IDS = Object.keys(FORMATE) as FormatId[];
const bekannt = (): Profil => ({ ...neuesProfil(), saetze: 4, formate: Object.fromEntries(IDS.map((id) => [id, 'bekannt'])) });

describe('gemischter Satz', () => {
  it('der allererste Satz hat 3 Aufgaben, jeder weitere 5', () => {
    expect([ERSTER_SATZ, SATZ_LAENGE]).toEqual([3, 5]);
    for (let s = 0; s < 200; s++) {
      expect(naechsteSitzung(s, neuesProfil()).aufgaben).toHaveLength(3);
      expect(naechsteSitzung(s, bekannt()).aufgaben).toHaveLength(5);
    }
  });

  it('keine zwei Formate derselben Fähigkeit, solange es genug Fähigkeiten gibt; möglichst viele Bereiche', () => {
    const faehigkeiten = new Set(IDS.map((id) => FORMATE[id].faehigkeit)).size;
    const bereiche = new Set(IDS.map((id) => FORMATE[id].bereich)).size;
    for (let s = 0; s < 500; s++) {
      const plan = mischPlan(s, 5);
      const f = plan.map((p) => FORMATE[p.format].faehigkeit);
      expect(new Set(f).size).toBe(Math.min(5, faehigkeiten));
      expect(new Set(plan.map((p) => FORMATE[p.format].bereich)).size).toBe(Math.min(5, bereiche));
      expect(new Set(plan.map((p) => p.format)).size).toBe(5);
    }
  });

  it('jedes eingetragene Format kommt vor; Stufe 1 oder 2, beide kommen vor; auch die Reihenfolge wechselt', () => {
    const gesehen = new Set<FormatId>();
    const stufen = new Set<number>();
    const erste = new Set<FormatId>();
    for (let s = 0; s < 400; s++) {
      const plan = mischPlan(s, 5);
      plan.forEach((p) => (gesehen.add(p.format), stufen.add(p.stufe)));
      erste.add(plan[0].format);
    }
    expect([...gesehen].sort()).toEqual([...IDS].sort());
    expect([...stufen].sort()).toEqual([1, 2]);
    expect(erste.size).toBeGreaterThan(3);
  });

  it('ein neues Format in der Liste kommt von selbst in die Sätze (Vielfalt bleibt)', () => {
    // nur mit einem Teil der Formate: es wird aufgefüllt, Doppelte erst, wenn keine anderen mehr da sind
    const zwei: FormatId[] = ['zahlenmauer', 'muster'];
    for (let s = 0; s < 50; s++) {
      const plan = mischPlan(s, 5, undefined, zwei);
      expect(plan).toHaveLength(5);
      expect(new Set(plan.map((p) => p.format))).toEqual(new Set(zwei));
    }
  });

  it('ein Samen → derselbe Satz; Aufgaben eindeutig wie jede andere', () => {
    expect(naechsteSitzung(77, bekannt())).toEqual(naechsteSitzung(77, bekannt()));
    const s = naechsteSitzung(77, bekannt());
    for (const a of s.aufgaben) expect(FORMATE[a.format].loesungen(a.bedingung)).toHaveLength(1);
  });

  it('ohne Plan bleibt neueSitzung der Probesatz (feste Sätze der Tests)', () => {
    expect(neueSitzung(5)).toEqual(neueSitzung(5, undefined, probePlan(5)));
    expect(neueSitzung(5).aufgaben.map((a) => a.format).sort()).toEqual(['muster', 'wer-ist-es', 'zahlenmauer']);
  });
});

describe('zurückgelegte Aufgabe im gemischten Satz', () => {
  const loesung = (s: Sitzung, i: number): Antwort => FORMATE[s.aufgaben[i].format].loesungen(s.aufgaben[i].bedingung)[0];
  const falsch = (s: Sitzung, i: number): Antwort => {
    const a = s.aufgaben[i];
    const l = loesung(s, i);
    return a.wahl ? a.wahl.find((w) => !gleich(w, l))! : { art: 'zahl', wert: l.art === 'zahl' ? l.wert + 1 : 1 };
  };

  it.each(IDS)('%s zurückgelegt → das Format ist im nächsten gemischten Satz, die Aufgabe genau wie damals', (id) => {
    // Satz nur aus diesem Format; die erste Aufgabe wird zurückgelegt
    const s1 = neueSitzung(31, undefined, [{ format: id, stufe: 2 }, { format: 'muster', stufe: 1 }, { format: 'wer-ist-es', stufe: 1 }]);
    let x = s1.aufgaben.reduce((acc, _, i) => (i === 0 ? acc : { ...acc, satz: setzeAntwort(acc.satz, i, loesung(s1, i)) }), s1);
    x = { ...x, satz: setzeAntwort(x.satz, 0, falsch(s1, 0)) };
    const st = (i: number, a: Antwort) => FORMATE[x.aufgaben[i].format].loesungen(x.aufgaben[i].bedingung).some((l) => gleich(l, a));
    x = { ...x, satz: vergleiche(x.satz, st).satz };
    while (x.hilfeOffen[0] < 4) x = hilfeOeffnen(x, 0);
    x = { ...x, satz: zuruecklegen(x.satz, 0) };
    const r = abschliessen(x, bekannt(), neueHistorie());
    expect(r.profil.zurueckgelegt).toHaveLength(1);
    for (let samen = 100; samen < 130; samen++) {
      const s2 = naechsteSitzung(samen, r.profil);
      expect(s2.aufgaben).toHaveLength(5);
      const j = s2.aufgaben.findIndex((a) => a.format === id && a.samen === s1.aufgaben[0].samen);
      expect(j, `Samen ${samen}`).toBeGreaterThanOrEqual(0);
      expect(s2.aufgaben[j].bedingung).toEqual(s1.aufgaben[0].bedingung);
      expect(s2.zurueckAus![j]).toEqual({ satz: 0, nr: 0 });
      // die übrigen Plätze: andere Fähigkeiten
      const f = s2.aufgaben.map((a) => FORMATE[a.format].faehigkeit);
      expect(new Set(f).size).toBe(5);
    }
  });
});

describe('A10: erster Satz auf Stufe 1, neue Felder im Profil', () => {
  it('der allererste Satz: jede Aufgabe auf Stufe 1; danach Stufe 1 und 2 gemischt', () => {
    let zwei = 0;
    for (let s = 0; s < 200; s++) {
      expect(naechsteSitzung(s, neuesProfil()).aufgaben.every((a) => a.stufe === 1)).toBe(true);
      zwei += naechsteSitzung(s, bekannt()).aufgaben.filter((a) => a.stufe === 2).length;
    }
    expect(zwei).toBeGreaterThan(100);
  });
  it('Profil Version 3 von vor A10 (ohne Geste und Abgaben) lädt mit Geste offen und null Abgaben, sonst unverändert', async () => {
    const { ladeProfil } = await import('../src/satz/sitzung');
    const { geste: _g, abgaben: _a, ...alt } = { ...bekannt(), blaetter: 17 };
    const p = ladeProfil(structuredClone(alt))!;
    expect(p.geste).toBe(false);
    expect(p.abgaben).toEqual({ wahl: 0, bild: 0 });
    expect(p.blaetter).toBe(17);
    expect(p.formate).toEqual(bekannt().formate);
  });
});
