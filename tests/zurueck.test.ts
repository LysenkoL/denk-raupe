import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FORMATE } from '../src/aufgaben';
import type { FormatId } from '../src/aufgaben/format';
import { ladeGeschuetzt, lesen, schreiben, unbekanntSchluessel } from '../src/core/speicher';
import { gleich, type Antwort } from '../src/perlen/antwort';
import { hilfeOeffnen, hilfePulst, hoechsteHilfe, pulsNachfuehren } from '../src/satz/hilfe';
import { blattWert, endstand, neueHistorie, verlauf, type Historie } from '../src/satz/historie';
import {
  abschliessen,
  ladeProfil,
  ladeSitzung,
  lernbeispielVorher,
  naechsteSitzung,
  neueSitzung,
  neuesProfil,
  PROBE_FORMATE,
  ZURUECK_JE_SATZ,
  type Profil,
  type Sitzung,
} from '../src/satz/sitzung';
import { aenderbar, setzeAntwort, vergleiche, zuruecklegen } from '../src/satz/vergleich';

/** Zurückgelegte Aufgabe kommt wieder (docs/PLAN.md, A7): Reihe im Profil, Platz im Satz, Blatt, Historie, Speicher */

const v1 = JSON.parse(readFileSync(resolve(__dirname, 'fixtures/speicher-v1.json'), 'utf8'));
const SAMEN = 20261115;
const TAG = (d: number) => new Date(2026, 10, d, 10, 30);

const alleBekannt = (): Profil => ({ ...neuesProfil(), formate: Object.fromEntries(PROBE_FORMATE.map((id) => [id, 'bekannt'])) });
const platz = (s: Sitzung, id: FormatId) => s.aufgaben.findIndex((a) => a.format === id);

function loesung(s: Sitzung, i: number): Antwort {
  const a = s.aufgaben[i];
  return FORMATE[a.format].loesungen(a.bedingung)[0];
}
/** k-te falsche Antwort derselben Art (k = 0, 1, …) */
function falsch(s: Sitzung, i: number, k = 0): Antwort {
  const a = s.aufgaben[i];
  const l = loesung(s, i);
  if (a.wahl) return a.wahl.filter((w) => !gleich(w, l))[k];
  return { art: 'zahl', wert: l.art === 'zahl' ? l.wert + 1 + k : 1 + k };
}
/** wie das Kind: Antwort setzen */
const setze = (s: Sitzung, i: number, a: Antwort | null): Sitzung => ({ ...s, satz: setzeAntwort(s.satz, i, a) });
/** wie der Bildschirm: Vergleichen, danach den Puls festhalten */
const pruefe = (s: Sitzung): Sitzung => {
  const st = (i: number, a: Antwort) => FORMATE[s.aufgaben[i].format].loesungen(s.aufgaben[i].bedingung).some((l) => gleich(l, a));
  return pulsNachfuehren({ ...s, satz: vergleiche(s.satz, st).satz });
};
/** jede noch offene Perle richtig, dann Vergleichen */
const richtig = (s: Sitzung): Sitzung => pruefe(s.aufgaben.reduce((acc, _, i) => (aenderbar(acc.satz, i) ? setze(acc, i, loesung(s, i)) : acc), s));
/** wie das Kind: Hilfe bis Stufe 4 öffnen (nach dem ersten Vergleichen) */
const bisVier = (s: Sitzung, i: number): Sitzung => {
  let x = s;
  while (x.hilfeOffen[i] < 4) x = hilfeOeffnen(x, i);
  return x;
};
/**
 * Satz, in dem die Aufgaben an den Plätzen `plaetze` zurückgelegt werden: alle anderen richtig; dort nacheinander
 * die falschen Antworten `k` (k-te falsche) geprüft, Hilfe bis Stufe 4, „Später“.
 */
function legeZurueck(s: Sitzung, plaetze: number[], k: number[] = [0]): Sitzung {
  let x = s.aufgaben.reduce((acc, _, i) => (plaetze.includes(i) || !aenderbar(acc.satz, i) ? acc : setze(acc, i, loesung(s, i))), s);
  for (const n of k) x = pruefe(plaetze.reduce((acc, i) => setze(acc, i, falsch(s, i, n)), x));
  for (const i of plaetze) x = bisVier(x, i);
  return plaetze.reduce((acc, i) => ({ ...acc, satz: zuruecklegen(acc.satz, i) }), x);
}
/** Summe der Blätter über die ganze Historie */
const blaetterIn = (h: Historie) => h.eintraege.reduce((n, e) => n + blattWert(e), 0);

describe('Reihe der zurückgelegten Aufgaben', () => {
  it('ohne zurückgelegte Aufgabe: der nächste Satz ist genau der neu erzeugte', () => {
    expect(naechsteSitzung(SAMEN, neuesProfil())).toEqual(neueSitzung(SAMEN));
    expect(naechsteSitzung(SAMEN, neuesProfil())).not.toHaveProperty('zurueckAus');
  });

  it('höchstens eine zurückgelegte Aufgabe je Satz', () => {
    expect(ZURUECK_JE_SATZ).toBe(1);
  });

  it.each(PROBE_FORMATE)('%s: zurückgelegt → im nächsten Satz am Platz des gleichen Formats, Bedingung und Wahl genau wie damals', (id) => {
    const s1 = neueSitzung(SAMEN);
    const i = platz(s1, id);
    const r1 = abschliessen(legeZurueck(s1, [i]), alleBekannt(), neueHistorie(), TAG(17));
    expect(r1.profil.zurueckgelegt).toHaveLength(1);
    expect(r1.profil.zurueckgelegt[0].eintrag).toEqual({ satz: 0, nr: i });

    const frisch = neueSitzung(SAMEN + 1);
    const s2 = naechsteSitzung(SAMEN + 1, r1.profil);
    const j = platz(s2, id);
    expect(s2.aufgaben).toHaveLength(3);
    expect(s2.aufgaben.map((a) => a.format)).toEqual(frisch.aufgaben.map((a) => a.format));
    // dieselbe Aufgabe, nicht neu erzeugt: Format, Version, Samen, Stufe, Zahlenraum, Bedingung, Wahl in gezeigter Reihenfolge
    const alt = s1.aufgaben[i];
    expect(s2.aufgaben[j]).toEqual({ ...alt, hilfe: 4 });
    expect(s2.aufgaben[j].bedingung).toEqual(alt.bedingung);
    expect(s2.aufgaben[j].wahl).toEqual(alt.wahl);
    expect(s2.aufgaben[j].samen).not.toBe(frisch.aufgaben[j].samen);
    // die anderen Plätze bleiben, wie sie erzeugt wurden
    s2.aufgaben.forEach((a, k) => k !== j && expect(a).toEqual(frisch.aufgaben[k]));
    expect(s2.zurueckAus).toEqual(s2.aufgaben.map((_, k) => (k === j ? { satz: 0, nr: i } : null)));
    // die Perle beginnt leer, das Blatt liegt; die Fehlantwort von damals ist dabei
    expect(s2.satz.perlen[j]).toMatchObject({ antwort: null, blatt: 'zu', zurueck: false, keinGold: true, falsch: [falsch(s1, i)], fehlversuche: 1 });
    // die Reihe ändert sich erst beim Abschluss des Satzes
    expect(r1.profil.zurueckgelegt).toHaveLength(1);
  });

  it('gelöst → gewöhnliches Blatt (nie golden), genau einmal; die Reihe wird leer', () => {
    const s1 = neueSitzung(SAMEN);
    const M = platz(s1, 'zahlenmauer');
    const r1 = abschliessen(legeZurueck(s1, [M]), alleBekannt(), neueHistorie(), TAG(17));
    // die zurückgelegte Perle bringt nichts: zwei goldene Blätter
    expect(r1.profil.blaetter).toBe(4);

    const s2 = richtig(naechsteSitzung(SAMEN + 1, r1.profil));
    const j = platz(s2, 'zahlenmauer');
    // beim allerersten Vergleichen gleich – und trotzdem nicht golden
    expect(s2.satz.runden).toBe(1);
    expect(s2.satz.perlen.map((p, k) => (k === j ? p.blatt === 'gehoben' : p.blatt === 'gold'))).toEqual([true, true, true]);
    const r2 = abschliessen(s2, r1.profil, r1.historie, TAG(18));
    expect(r2.profil.blaetter - r1.profil.blaetter).toBe(2 + 2 + 1);
    expect(r2.profil.zurueckgelegt).toEqual([]);
    // nochmal abschließen gibt nichts dazu
    const r3 = abschliessen(r2.sitzung, r2.profil, r2.historie, TAG(18));
    expect(r3.profil).toBe(r2.profil);
    // der nächste Satz ist wieder ganz neu
    expect(naechsteSitzung(SAMEN + 2, r2.profil)).toEqual(neueSitzung(SAMEN + 2));
  });

  it('auch später korrigiert: ein gewöhnliches Blatt', () => {
    const s1 = neueSitzung(SAMEN);
    const M = platz(s1, 'zahlenmauer');
    const r1 = abschliessen(legeZurueck(s1, [M]), alleBekannt(), neueHistorie(), TAG(17));
    let s2 = naechsteSitzung(SAMEN + 1, r1.profil);
    const j = platz(s2, 'zahlenmauer');
    s2 = pruefe(setze(s2.aufgaben.reduce((acc, _, k) => setze(acc, k, loesung(s2, k)), s2), j, falsch(s2, j, 3)));
    s2 = richtig(s2);
    expect(s2.satz.perlen[j].blatt).toBe('gehoben');
    expect(abschliessen(s2, r1.profil, r1.historie, TAG(18)).profil.blaetter - r1.profil.blaetter).toBe(5);
  });

  it('wieder zurückgelegt → wieder hinten in der Reihe, nicht doppelt, ohne Blatt; kommt danach wieder', () => {
    const s1 = neueSitzung(SAMEN);
    const M = platz(s1, 'zahlenmauer');
    const r1 = abschliessen(legeZurueck(s1, [M]), alleBekannt(), neueHistorie(), TAG(17));
    const s2 = naechsteSitzung(SAMEN + 1, r1.profil);
    const j = platz(s2, 'zahlenmauer');
    const r2 = abschliessen(legeZurueck(s2, [j], [1]), r1.profil, r1.historie, TAG(18));
    expect(r2.profil.zurueckgelegt).toHaveLength(1);
    const z = r2.profil.zurueckgelegt[0];
    expect(z.eintrag).toEqual({ satz: 1, nr: j });
    expect(z.aufgabe).toEqual({ ...s1.aufgaben[M], hilfe: 4 });
    // der ganze Lösungsweg: Fehlantworten aus beiden Sätzen
    expect(z.falsch).toEqual([falsch(s1, M, 0), falsch(s1, M, 1)]);
    // zwei goldene Blätter, für die zurückgelegte keins
    expect(r2.profil.blaetter - r1.profil.blaetter).toBe(4);
    expect(r2.profil.formate.zahlenmauer).toBe('nochmal');

    // im dritten Satz wieder da, mit allem von vorher; jetzt gelöst
    const s3 = naechsteSitzung(SAMEN + 2, r2.profil);
    const k = platz(s3, 'zahlenmauer');
    expect(s3.aufgaben[k]).toEqual(z.aufgabe);
    expect(s3.zurueckAus![k]).toEqual({ satz: 1, nr: j });
    const r3 = abschliessen(richtig(s3), r2.profil, r2.historie, TAG(19));
    expect(r3.profil.zurueckgelegt).toEqual([]);
    expect(r3.profil.blaetter - r2.profil.blaetter).toBe(5);
    expect(blaetterIn(r3.historie)).toBe(r3.profil.blaetter);
  });

  it('wieder zurückgelegt kommt hinter die, die schon warten', () => {
    // Satz 1: Zahlenmauer und Muster zurückgelegt → Reihe [Mauer, Muster] (im selben Satz nach Platz)
    const s1 = neueSitzung(SAMEN);
    const [M, U] = [platz(s1, 'zahlenmauer'), platz(s1, 'muster')];
    const r1 = abschliessen(legeZurueck(s1, [M, U].sort()), alleBekannt(), neueHistorie(), TAG(17));
    const erste = r1.profil.zurueckgelegt.map((z) => z.aufgabe.format);
    expect(erste).toHaveLength(2);
    // Satz 2: nur eine kommt (die frühere); die andere wartet
    const s2 = naechsteSitzung(SAMEN + 1, r1.profil);
    expect(s2.zurueckAus!.filter(Boolean)).toHaveLength(1);
    const j = platz(s2, erste[0]);
    expect(s2.aufgaben[j]).toEqual(r1.profil.zurueckgelegt[0].aufgabe);
    expect(s2.aufgaben[platz(s2, erste[1])]).toEqual(neueSitzung(SAMEN + 1).aufgaben[platz(s2, erste[1])]);
    // wieder zurückgelegt → hinten
    const r2 = abschliessen(legeZurueck(s2, [j]), r1.profil, r1.historie, TAG(18));
    expect(r2.profil.zurueckgelegt.map((z) => z.aufgabe.format)).toEqual([erste[1], erste[0]]);
    expect(r2.profil.zurueckgelegt.map((z) => z.eintrag)).toEqual([{ satz: 0, nr: platz(s1, erste[1]) }, { satz: 1, nr: j }]);
    // Satz 3: jetzt die andere
    const s3 = naechsteSitzung(SAMEN + 2, r2.profil);
    expect(s3.zurueckAus!.filter(Boolean)).toEqual([{ satz: 0, nr: platz(s1, erste[1]) }]);
  });

  it('zwei zurückgelegte gleichen Formats: in den nächsten Satz nur die frühere, die zweite danach', () => {
    const sA = neueSitzung(SAMEN);
    const rA = abschliessen(legeZurueck(sA, [platz(sA, 'zahlenmauer')]), alleBekannt(), neueHistorie(), TAG(17));
    // ein Satz ohne die Rückkehr (etwa einer, der vor A7 begonnen wurde): noch eine Mauer zurückgelegt
    const sB = neueSitzung(SAMEN + 7);
    const rB = abschliessen(legeZurueck(sB, [platz(sB, 'zahlenmauer')]), rA.profil, rA.historie, TAG(17));
    const [a, b] = rB.profil.zurueckgelegt;
    expect([a.aufgabe.samen, b.aufgabe.samen]).toEqual([sA.aufgaben[platz(sA, 'zahlenmauer')].samen, sB.aufgaben[platz(sB, 'zahlenmauer')].samen]);

    const s3 = naechsteSitzung(SAMEN + 8, rB.profil);
    expect(s3.aufgaben.filter((x) => x.format === 'zahlenmauer')).toEqual([a.aufgabe]);
    expect(s3.aufgaben.some((x) => x.samen === b.aufgabe.samen && x.format === 'zahlenmauer')).toBe(false);
    const r3 = abschliessen(richtig(s3), rB.profil, rB.historie, TAG(18));
    expect(r3.profil.zurueckgelegt).toEqual([b]);

    const s4 = naechsteSitzung(SAMEN + 9, r3.profil);
    expect(s4.aufgaben.filter((x) => x.format === 'zahlenmauer')).toEqual([b.aufgabe]);
    const r4 = abschliessen(richtig(s4), r3.profil, r3.historie, TAG(19));
    expect(r4.profil.zurueckgelegt).toEqual([]);
    expect(blaetterIn(r4.historie)).toBe(r4.profil.blaetter);
  });

  it('eine Aufgabe, die ihr Format heute nicht mehr so zeigt (andere Version), wartet weiter und geht nicht verloren', () => {
    const s1 = neueSitzung(SAMEN);
    const M = platz(s1, 'zahlenmauer');
    const U = platz(s1, 'muster');
    const r1 = abschliessen(legeZurueck(s1, [M, U].sort()), alleBekannt(), neueHistorie(), TAG(17));
    const alt = r1.profil.zurueckgelegt.map((z) => (z.aufgabe.format === 'zahlenmauer' ? { ...z, aufgabe: { ...z.aufgabe, version: 1 } } : z));
    const p = { ...r1.profil, zurueckgelegt: alt };
    const s2 = naechsteSitzung(SAMEN + 1, p);
    // die Mauer der alten Version kommt nicht; das Muster dahinter schon
    expect(s2.zurueckAus!.filter(Boolean)).toEqual([{ satz: 0, nr: U }]);
    const r2 = abschliessen(richtig(s2), p, r1.historie, TAG(18));
    expect(r2.profil.zurueckgelegt).toEqual(alt.filter((z) => z.aufgabe.format === 'zahlenmauer'));
  });
});

describe('Lösungsweg der zurückgekehrten Aufgabe', () => {
  const s1 = neueSitzung(SAMEN);
  const M = platz(s1, 'zahlenmauer');
  const f = (k: number) => falsch(s1, M, k);
  // Satz 1: zwei verschiedene Fehlantworten → der Knopf pulsiert; Hilfe gedrückt bis Stufe 4; zurückgelegt
  const r1 = abschliessen(legeZurueck(s1, [M], [0, 1]), alleBekannt(), neueHistorie(), TAG(17));
  const s2 = naechsteSitzung(SAMEN + 1, r1.profil);
  const j = platz(s2, 'zahlenmauer');

  it('in der Reihe: Aufgabe mit höchster Hilfestufe, Fehlantworten, Puls', () => {
    expect(r1.profil.zurueckgelegt).toEqual([{ aufgabe: { ...s1.aufgaben[M], hilfe: 4 }, falsch: [f(0), f(1)], puls: true, hilfeNachPuls: true, eintrag: { satz: 0, nr: M } }]);
  });

  it('im neuen Satz: Hilfeleiter beginnt unten, die höchste Stufe bleibt an der Aufgabe; der Knopf pulsiert nicht von früher', () => {
    expect(s2.hilfeOffen[j]).toBe(0);
    expect(s2.aufgaben[j].hilfe).toBe(4);
    expect(hoechsteHilfe(s2.satz)).toBe(2);
    expect(hilfePulst(s2, j)).toBe(false);
    expect(s2.puls[j]).toEqual({ marke: 2, puls: true, hilfeNachPuls: true });
    const h1 = hilfeOeffnen(s2, j);
    expect(h1.hilfeOffen[j]).toBe(1);
    expect(h1.aufgaben[j].hilfe).toBe(4);
  });

  it('Puls zählt nur neue Fehlantworten; eine von damals ist keine neue', () => {
    let s = pruefe(setze(s2.aufgaben.reduce((acc, _, k) => setze(acc, k, loesung(s2, k)), s2), j, f(0)));
    expect(hilfePulst(s, j)).toBe(false);
    s = pruefe(setze(s, j, f(2)));
    expect(hilfePulst(s, j)).toBe(false);
    s = pruefe(setze(s, j, f(3)));
    expect(hilfePulst(s, j)).toBe(true);
  });

  it('Historie: neuer Eintrag mit Verweis auf den alten; ganzer Lösungsweg; Blätter nicht doppelt; Endstand zeigt die Lösung', () => {
    // im zweiten Satz erst die alte Fehlantwort noch einmal, dann richtig
    let s = pruefe(setze(s2.aufgaben.reduce((acc, _, k) => setze(acc, k, loesung(s2, k)), s2), j, f(0)));
    s = richtig(s);
    const r2 = abschliessen(s, r1.profil, r1.historie, TAG(18));
    const h = r2.historie;
    expect(h.eintraege).toHaveLength(6);
    const alt = h.eintraege[M];
    const neu = h.eintraege[3 + j];
    // der alte Eintrag bleibt, wie er war
    expect(alt).toEqual(r1.historie.eintraege[M]);
    expect(alt).toMatchObject({ ergebnis: 'zurueck', satz: 0, nr: M, hilfe: 4, falsch: [f(0), f(1)] });
    expect(alt.zurueckAus).toBeUndefined();
    // der neue führt den Lösungsweg weiter: über beide Sätze
    expect(neu).toMatchObject({
      ergebnis: 'hilfe',
      satz: 1,
      nr: j,
      zurueckAus: { satz: 0, nr: M },
      hilfe: 4,
      hilfeImSatz: 0,
      falsch: [f(0), f(1), f(0)],
      gleicherFehler: 1,
      antwort: loesung(s2, j),
      puls: true,
      hilfeNachPuls: true,
    });
    expect({ ...neu, satz: 0, nr: 0, tag: '', ergebnis: 'gold', antwort: null, falsch: [], gleicherFehler: 0, puls: false, hilfeNachPuls: false }).toMatchObject({
      format: 'zahlenmauer',
      version: alt.version,
      samen: alt.samen,
      stufe: alt.stufe,
      zahlenraum: alt.zahlenraum,
      bedingung: alt.bedingung,
      wahl: alt.wahl,
    });
    // Blätter: zurückgelegt 0, zurückgekehrt 1 – die Summe der Historie ist der Korb
    expect([blattWert(alt), blattWert(neu)]).toEqual([0, 1]);
    expect(blaetterIn(h)).toBe(r2.profil.blaetter);
    // jede Aufgabe einmal, mit ihrem Ausgang am Ende
    const ende = endstand(h);
    expect(ende).toHaveLength(5);
    expect(ende).toContain(neu);
    expect(ende).not.toContain(alt);
    expect(verlauf(h, neu)).toEqual([alt, neu]);
    expect(verlauf(h, h.eintraege[0])).toEqual([h.eintraege[0]]);
  });

  it('Historie: wieder zurückgelegt – eine Kette über drei Sätze, der Endstand ist die Lösung', () => {
    const r2 = abschliessen(legeZurueck(s2, [j], [2]), r1.profil, r1.historie, TAG(18));
    const s3 = naechsteSitzung(SAMEN + 2, r2.profil);
    const k = platz(s3, 'zahlenmauer');
    const r3 = abschliessen(richtig(s3), r2.profil, r2.historie, TAG(19));
    const h = r3.historie;
    const kette = verlauf(h, h.eintraege[6 + k]);
    expect(kette.map((e) => [e.satz, e.nr, e.ergebnis])).toEqual([
      [0, M, 'zurueck'],
      [1, j, 'zurueck'],
      [2, k, 'hilfe'],
    ]);
    expect(kette[2].falsch).toEqual([f(0), f(1), f(2)]);
    expect(kette.map((e) => blattWert(e))).toEqual([0, 0, 1]);
    expect(endstand(h)).toHaveLength(7);
    expect(endstand(h).filter((e) => e.format === 'zahlenmauer')).toEqual([kette[2]]);
    expect(blaetterIn(h)).toBe(r3.profil.blaetter);
  });
});

describe('Kenntnis des Formats (A4) mit zurückgekehrter Aufgabe', () => {
  const s1 = neueSitzung(SAMEN);
  const M = platz(s1, 'zahlenmauer');
  const r1 = abschliessen(legeZurueck(s1, [M]), alleBekannt(), neueHistorie(), TAG(17));
  // das Lernbeispiel vor der zurückgekehrten Aufgabe ist durch: wieder bekannt
  const nachBeispiel: Profil = { ...r1.profil, formate: { ...r1.profil.formate, zahlenmauer: 'bekannt' } };
  const s2 = naechsteSitzung(SAMEN + 1, r1.profil);
  const j = platz(s2, 'zahlenmauer');

  it('zurückgelegt → nochmal: das Lernbeispiel kommt vor der zurückgekehrten Aufgabe', () => {
    expect(r1.profil.formate.zahlenmauer).toBe('nochmal');
    expect(lernbeispielVorher(r1.profil, s2.aufgaben[j].format)).toBe(true);
  });

  it('jetzt ohne Stufe 4 gelöst → bleibt bekannt (Stufe 4 von damals zählt nicht noch einmal)', () => {
    const r2 = abschliessen(richtig(s2), nachBeispiel, r1.historie, TAG(18));
    expect(r2.profil.formate.zahlenmauer).toBe('bekannt');
  });

  it('jetzt erst mit Stufe 4 gelöst → nochmal', () => {
    let s = pruefe(setze(s2.aufgaben.reduce((acc, _, k) => setze(acc, k, loesung(s2, k)), s2), j, falsch(s2, j, 2)));
    s = richtig(bisVier(s, j));
    const r2 = abschliessen(s, nachBeispiel, r1.historie, TAG(18));
    expect(r2.historie.eintraege[3 + j]).toMatchObject({ ergebnis: 'hilfe', hilfe: 4, hilfeImSatz: 4 });
    expect(r2.profil.formate.zahlenmauer).toBe('nochmal');
  });

  it('wieder zurückgelegt → nochmal', () => {
    const r2 = abschliessen(legeZurueck(s2, [j], [2]), nachBeispiel, r1.historie, TAG(18));
    expect(r2.profil.formate.zahlenmauer).toBe('nochmal');
  });
});

describe('Speicher: die Reihe übersteht Neuladen; Umzüge', () => {
  const s1 = neueSitzung(SAMEN);
  const M = platz(s1, 'zahlenmauer');
  const r1 = abschliessen(legeZurueck(s1, [M], [0, 1]), alleBekannt(), neueHistorie(), TAG(17));

  it('Profil mit Reihe: nach Speichern und Laden dasselbe, der nächste Satz derselbe', async () => {
    await schreiben('profil', JSON.parse(JSON.stringify(r1.profil)));
    const geladen = (await ladeGeschuetzt('profil', ladeProfil))!;
    expect(geladen).toEqual(r1.profil);
    expect(naechsteSitzung(SAMEN + 1, geladen)).toEqual(naechsteSitzung(SAMEN + 1, r1.profil));
    await schreiben('profil', undefined);
  });

  it('Satz mit zurückgekehrter Aufgabe: nach Laden dasselbe, auch dann kein goldenes Blatt', () => {
    const s2 = naechsteSitzung(SAMEN + 1, r1.profil);
    const j = platz(s2, 'zahlenmauer');
    const geladen = ladeSitzung(JSON.parse(JSON.stringify(s2)))!;
    expect(geladen).toEqual(s2);
    expect(richtig(geladen).satz.perlen[j].blatt).toBe('gehoben');
  });

  it('Profil aus Version 1 (Schnappschuss): Reihe leer, alles andere wie vorher', () => {
    const p = ladeProfil(structuredClone(v1.profil))!;
    expect(p.version).toBe(3);
    expect(p.zurueckgelegt).toEqual([]);
    expect(p).toMatchObject({ blaetter: v1.profil.blaetter, saetze: v1.profil.saetze, geheim: v1.profil.geheim, ton: v1.profil.ton });
    expect(naechsteSitzung(SAMEN, p)).toEqual(neueSitzung(SAMEN));
  });

  it('Profil aus Version 2: Reihe leer, alles andere bleibt', () => {
    const v2 = { version: 2, formate: { muster: 'nochmal', zahlenmauer: 'bekannt' }, blaetter: 23, saetze: 4, geheim: { wort: 'BERGE', offen: [1, 4] }, ton: false };
    const p = ladeProfil(structuredClone(v2))!;
    expect(p).toEqual({ ...v2, version: 3, zurueckgelegt: [] });
    expect(Object.keys(p).sort()).toEqual(Object.keys(neuesProfil()).sort());
  });

  it('Version 3: fehlt die Reihe oder ist sie kaputt → leer; alles andere bleibt', () => {
    const { zurueckgelegt: _z, ...ohne } = r1.profil;
    expect(ladeProfil(structuredClone(ohne))).toEqual({ ...r1.profil, zurueckgelegt: [] });
    expect(ladeProfil({ ...r1.profil, zurueckgelegt: 'kaputt' })).toEqual({ ...r1.profil, zurueckgelegt: [] });
  });

  it('unbekannte neuere Version: wird nicht gelesen, bleibt mit ihrer Reihe unter „profil-unbekannt“', async () => {
    const neu = { ...structuredClone(r1.profil), version: 4, mehr: true };
    await schreiben('profil', neu);
    expect(await ladeGeschuetzt('profil', ladeProfil)).toBeNull();
    expect(await lesen(unbekanntSchluessel('profil'))).toContainEqual(neu);
    await schreiben('profil', undefined);
    await schreiben(unbekanntSchluessel('profil'), undefined);
  });
});
