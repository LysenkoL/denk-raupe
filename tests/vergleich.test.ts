import { describe, expect, it } from 'vitest';
import type { Antwort } from '../src/perlen/antwort';
import {
  blaetter,
  fertig,
  kannVergleichen,
  neuerSatz,
  setzeAntwort,
  vergleiche,
  zuruecklegen,
  type Satz,
} from '../src/satz/vergleich';

const z = (wert: number): Antwort => ({ art: 'zahl', wert });
/** Lösungen 1, 2, 3 – nur die Aufgabe kennt sie */
const LOESUNG = [1, 2, 3];
const stimmt = (i: number, a: Antwort) => a.art === 'zahl' && a.wert === LOESUNG[i];

function mit(s: Satz, ...werte: (number | null)[]): Satz {
  return werte.reduce((acc, w, i) => setzeAntwort(acc, i, w === null ? null : z(w)), s);
}

describe('Vergleichen', () => {
  it('erst aktiv, wenn alle Perlen gefüllt sind', () => {
    let s = neuerSatz(3);
    expect(kannVergleichen(s)).toBe(false);
    s = mit(s, 1, 2, null);
    expect(kannVergleichen(s)).toBe(false);
    s = mit(s, 1, 2, 3);
    expect(kannVergleichen(s)).toBe(true);
    // Antwort lässt sich bis zum Vergleichen ändern und wieder leeren
    s = setzeAntwort(s, 2, null);
    expect(kannVergleichen(s)).toBe(false);
  });

  it('ohne Vergleichen kein Ergebnis', () => {
    const r = vergleiche(mit(neuerSatz(3), 1, null, 3), stimmt);
    expect(r.gehoben).toEqual([]);
    expect(r.satz.runden).toBe(0);
  });

  it('gleiche Perlen: Blatt hebt sich, beim ersten Mal golden; andere: Blatt bleibt', () => {
    const r = vergleiche(mit(neuerSatz(3), 1, 5, 3), stimmt);
    expect(r.gehoben).toEqual([0, 2]);
    expect(r.bleiben).toEqual([1]);
    expect(r.satz.perlen.map((p) => p.blatt)).toEqual(['gold', 'zu', 'gold']);
    expect(fertig(r.satz)).toBe(false);
  });

  it('nach dem Korrigieren: gewöhnliches Blatt, gehobene Perlen werden nicht mehr geprüft', () => {
    let s = vergleiche(mit(neuerSatz(3), 1, 5, 3), stimmt).satz;
    const geprueft: number[] = [];
    const zaehlend = (i: number, a: Antwort) => (geprueft.push(i), stimmt(i, a));
    s = setzeAntwort(s, 1, z(2));
    const r = vergleiche(s, zaehlend);
    expect(geprueft).toEqual([1]);
    expect(r.satz.perlen.map((p) => p.blatt)).toEqual(['gold', 'gehoben', 'gold']);
    expect(fertig(r.satz)).toBe(true);
    expect(blaetter(r.satz)).toEqual({ normal: 1, gold: 2, wert: 5 });
  });

  it('gehobene Perle lässt sich nicht mehr ändern', () => {
    const s = vergleiche(mit(neuerSatz(3), 1, 5, 3), stimmt).satz;
    expect(setzeAntwort(s, 0, z(9))).toBe(s);
  });

  it('nochmal Vergleichen ohne Änderung ist kein Fehler', () => {
    let s = vergleiche(mit(neuerSatz(3), 1, 5, 3), stimmt).satz;
    expect(s.perlen[1].fehlversuche).toBe(1);
    const r = vergleiche(s, stimmt);
    expect(r.wiederholung).toBe(true);
    expect(r.satz.runden).toBe(1);
    expect(r.satz.perlen[1].fehlversuche).toBe(1);
    // geänderte, aber wieder falsche Antwort zählt
    s = vergleiche(setzeAntwort(r.satz, 1, z(7)), stimmt).satz;
    expect(s.perlen[1].fehlversuche).toBe(2);
    expect(s.runden).toBe(2);
  });

  it('das Ergebnis verrät die richtige Lösung nicht', () => {
    const r = vergleiche(mit(neuerSatz(3), 1, 5, 3), stimmt);
    // unter dem liegen gebliebenen Blatt steht nur die eigene Antwort des Kindes
    expect(JSON.stringify(r)).not.toContain('"wert":2');
  });

  it('zurücklegen erst nach dem ersten Vergleichen; Satz gilt dann als fertig, Blatt bleibt zu', () => {
    let s = mit(neuerSatz(3), 1, 5, 3);
    expect(zuruecklegen(s, 1)).toBe(s);
    s = vergleiche(s, stimmt).satz;
    s = zuruecklegen(s, 1);
    expect(fertig(s)).toBe(true);
    expect(s.perlen[1].blatt).toBe('zu');
    expect(blaetter(s)).toEqual({ normal: 0, gold: 2, wert: 4 });
    expect(kannVergleichen(s)).toBe(false);
  });

  it('zurückgelegte Aufgabe doch noch lösen: Blatt kommt dann, aber nicht golden', () => {
    let s = vergleiche(mit(neuerSatz(3), 1, 5, 3), stimmt).satz;
    s = zuruecklegen(s, 1);
    s = setzeAntwort(s, 1, z(2));
    expect(s.perlen[1].zurueck).toBe(false);
    s = vergleiche(s, stimmt).satz;
    expect(s.perlen[1].blatt).toBe('gehoben');
  });

  it('alles beim ersten Mal gleich: alle Blätter golden, Satz fertig', () => {
    const r = vergleiche(mit(neuerSatz(3), 1, 2, 3), stimmt);
    expect(fertig(r.satz)).toBe(true);
    expect(blaetter(r.satz).gold).toBe(3);
    expect(kannVergleichen(r.satz)).toBe(false);
  });
});
