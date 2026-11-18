/**
 * Zahl in Plätze eingeben (docs/TZ.md, „Движки“; docs/PLAN.md, A5): Zehner links, Einer rechts, wie in
 * der Stellenwerttafel. Reine Logik ohne Bildschirm: Zustand der Plätze + Handlung → neuer Zustand.
 *
 * Harte Regel 7 (docs/TZ.md): die Eingabe verrät nichts über die Antwort. Deshalb hängt die Größe des
 * Feldes nie von der einzelnen Aufgabe ab (`zahlfeld`): zwei Plätze Z und E nehmen jede Zahl 0–99; drei
 * Plätze H, Z, E (bis 100) gibt es nur, wenn der Elternteil „bis 100“ eingestellt hat; ein Platz E nur bei
 * einem Format, das bei jeder Aufgabe einstellig antwortet. Innerhalb des Feldes geht jede Zahl.
 *
 * - Gewöhnliches Tippen: die erste Ziffer geht in E; die nächste schiebt die Zahl nach links und geht in E.
 *   Passt die geschobene Zahl nicht mehr ins Feld, beginnt die Zahl neu: bei Z und E mit der dritten
 *   Ziffer; bei H, Z und E ergibt 1, 0, 0 die 100, eine Zahl über 100 beginnt neu.
 * - Tipp auf einen Platz wählt ihn: die nächste Ziffer ersetzt nur diesen Platz; danach geht die Wahl auf
 *   den anderen Platz (Z oder E), wenn er leer ist, sonst ist nichts mehr gewählt. Tipp auf den schon
 *   gewählten Platz lässt ihn gewählt (sonst würde „Platz E, 4, Platz Z, 1“ zu 41). Nur H nimmt nicht
 *   jede Ziffer: über 100 geht das Feld nicht (das gilt für jede Aufgabe gleich).
 * - Löschen leert den gewählten Platz; ohne Wahl (oder wenn der gewählte Platz leer ist, etwa weil die Wahl
 *   von selbst weitergegangen ist) den Platz der zuletzt getippten Ziffer, sonst die rechteste Ziffer.
 *   Die anderen Ziffern bleiben, wo sie sind; die Wahl bleibt, außer wenn alles leer ist: dann geht die
 *   nächste Ziffer wieder in E.
 * - Eine führende Null verschwindet, sobald rechts davon eine Ziffer steht: 0 in Z und 4 in E ist 4.
 *
 * Die Antwort ist der Wert der Plätze (`wertVon`); die Plätze selbst werden nicht gespeichert.
 * Ob die Zahl stimmt, spielt hier keine Rolle.
 */

import type { Eingabe, Zahlenraum } from '../aufgaben/format';

/** Größe des Eingabefelds = größte Zahl, die es aufnimmt: ein Platz (9), Z und E (99), H, Z und E (100) */
export type Zahlfeld = 9 | 99 | 100;

/**
 * Feld für eine Zahleingabe: aus der Art des Formats und dem Zahlenraum der Eltern, nie aus der Aufgabe
 * selbst (sonst verriete die Größe des Feldes etwas über die Antwort).
 */
export function zahlfeld(e: Extract<Eingabe, { art: 'zahl' }>, zahlenraum: Zahlenraum): Zahlfeld {
  if (e.einstellig) return 9;
  return zahlenraum === 100 ? 100 : 99;
}

/** Ziffer 0–9 oder leer */
export type Stelle = number | null;

export interface Plaetze {
  /** Ziffern von links nach rechts: [E], [Z, E] oder [H, Z, E] */
  stellen: Stelle[];
  /** gewählter Platz (Index in `stellen`) oder keiner */
  gewaehlt: number | null;
  /** Platz der zuletzt getippten Ziffer – für Löschen ohne Wahl */
  zuletzt: number | null;
}

export type Handlung = { art: 'ziffer'; ziffer: number } | { art: 'platz'; platz: number } | { art: 'loeschen' };

/** Name des Platzes von rechts gezählt: E, Z, H */
export type Stellenwert = 'E' | 'Z' | 'H';

/** Anzahl der Plätze des Feldes */
export function anzahlPlaetze(feld: Zahlfeld): 1 | 2 | 3 {
  return feld === 9 ? 1 : feld === 99 ? 2 : 3;
}

/** Stellenwert jedes Platzes, von links: z. B. ['Z', 'E'] */
export function stellenwerte(feld: Zahlfeld): Stellenwert[] {
  return (['H', 'Z', 'E'] as const).slice(3 - anzahlPlaetze(feld));
}

export function leer(feld: Zahlfeld): Plaetze {
  return { stellen: Array<Stelle>(anzahlPlaetze(feld)).fill(null), gewaehlt: null, zuletzt: null };
}

/** Plätze aus einer gespeicherten Zahl (nach Neuladen, anderer Perle): rechtsbündig, nichts gewählt */
export function ausWert(wert: number | null, feld: Zahlfeld): Plaetze {
  const p = leer(feld);
  if (wert === null || !Number.isInteger(wert) || wert < 0) return p;
  const ziffern = [...String(wert)].map(Number);
  if (ziffern.length > p.stellen.length) return p;
  return { ...p, stellen: [...p.stellen.slice(0, p.stellen.length - ziffern.length), ...ziffern] };
}

/**
 * Wert der Plätze: die Ziffern ab der ersten belegten bis E, ohne Lücke. Leer oder unfertig (E leer,
 * Lücke zwischen zwei Ziffern) → null: noch keine Antwort.
 */
export function wertVon(p: Plaetze): number | null {
  const s = p.stellen;
  const erste = s.findIndex((d) => d !== null);
  if (erste < 0) return null;
  const rest = s.slice(erste);
  if (rest.some((d) => d === null)) return null;
  return Number(rest.join(''));
}

/** kleinste Zahl, die aus diesen Plätzen noch werden kann (leere Plätze als 0); über dem Feld → passt nicht */
function mindestens(s: Stelle[]): number {
  return s.reduce<number>((n, d) => n * 10 + (d ?? 0), 0);
}

/** führende Nullen weg, sobald rechts davon eine Ziffer steht */
function ordnen(s: Stelle[]): Stelle[] {
  const t = [...s];
  for (;;) {
    const erste = t.findIndex((d) => d !== null);
    if (erste < 0 || t[erste] !== 0 || !t.slice(erste + 1).some((d) => d !== null)) return t;
    t[erste] = null;
  }
}

/** nach dem Ersetzen: der andere Platz unter Z und E, wenn er leer ist (H wird nie von selbst gewählt) */
function naechsteWahl(s: Stelle[], platz: number): number | null {
  const e = s.length - 1;
  const z = e - 1;
  const kandidaten = platz === e ? [z] : platz === z ? [e] : [z, e];
  return kandidaten.find((k) => k >= 0 && s[k] === null) ?? null;
}

/** nach Löschen: geordnet; alles leer → keine Wahl mehr, die nächste Ziffer beginnt in E */
function geloescht(p: Plaetze, stellen: Stelle[]): Plaetze {
  const geordnet = ordnen(stellen);
  const leerAlles = geordnet.every((d) => d === null);
  return { stellen: geordnet, gewaehlt: leerAlles ? null : p.gewaehlt, zuletzt: null };
}

export function schritt(p: Plaetze, h: Handlung, feld: Zahlfeld): Plaetze {
  const n = p.stellen.length;
  const e = n - 1;

  if (h.art === 'platz') {
    if (h.platz < 0 || h.platz >= n) return p;
    return { ...p, gewaehlt: h.platz };
  }

  if (h.art === 'loeschen') {
    if (p.gewaehlt !== null && p.stellen[p.gewaehlt] !== null) {
      const stellen = [...p.stellen];
      stellen[p.gewaehlt] = null;
      return geloescht(p, stellen);
    }
    const rechteste = p.stellen.map((d, i) => (d === null ? -1 : i)).reduce((a, b) => Math.max(a, b), -1);
    const ziel = p.zuletzt !== null && p.stellen[p.zuletzt] !== null ? p.zuletzt : rechteste;
    if (ziel < 0) return p;
    const stellen = [...p.stellen];
    stellen[ziel] = null;
    return geloescht(p, stellen);
  }

  const d = h.ziffer;
  if (!Number.isInteger(d) || d < 0 || d > 9) return p;

  // gewählter Platz: nur er ändert sich
  if (p.gewaehlt !== null) {
    const stellen = [...p.stellen];
    stellen[p.gewaehlt] = d;
    if (mindestens(stellen) > feld) return p;
    const geordnet = ordnen(stellen);
    return { stellen: geordnet, gewaehlt: naechsteWahl(geordnet, p.gewaehlt), zuletzt: p.gewaehlt };
  }

  // gewöhnliches Tippen
  const neuBeginnen = (): Plaetze => {
    const stellen = Array<Stelle>(n).fill(null);
    stellen[e] = d;
    return { stellen, gewaehlt: null, zuletzt: e };
  };
  let stellen: Stelle[];
  if (p.stellen[e] === null) {
    stellen = [...p.stellen];
    stellen[e] = d;
  } else {
    // schieben: die linke Ziffer fiele hinaus → neu beginnen
    if (p.stellen[0] !== null) return neuBeginnen();
    stellen = [...p.stellen.slice(1), d];
  }
  if (mindestens(stellen) > feld) return neuBeginnen();
  return { stellen: ordnen(stellen), gewaehlt: null, zuletzt: e };
}
