/**
 * Zahl in Plätze eingeben (docs/TZ.md, „Движки“; docs/PLAN.md, A5): Zehner links, Einer rechts, wie in
 * der Stellenwerttafel. Reine Logik ohne Bildschirm: Zustand der Plätze + Handlung → neuer Zustand.
 *
 * - Plätze aus der größten Antwort des Formats (`max`): unter 10 nur E; bis 99 Z und E; ab 100 H, Z und E.
 *   So bleibt jede Ziffer an ihrem Platz – auch bei 100 (1 Hunderter, 0 Zehner, 0 Einer).
 * - Gewöhnliches Tippen: die erste Ziffer geht in E; die nächste schiebt die Zahl nach links und geht in E.
 *   Passt die geschobene Zahl nicht mehr in die Plätze oder wäre sie größer als `max`, beginnt die Zahl
 *   neu. Bis 100: 1, 0, 0 ergibt 100; bis 20: die dritte Ziffer beginnt neu.
 * - Tipp auf einen Platz wählt ihn: die nächste Ziffer ersetzt nur diesen Platz; danach geht die Wahl auf
 *   den anderen Platz (Z oder E), wenn er leer ist, sonst ist nichts mehr gewählt. Eine Ziffer, mit der die
 *   Zahl größer als `max` würde, ändert nichts. Tipp auf den schon gewählten Platz lässt ihn gewählt
 *   (sonst würde „Platz E, 4, Platz Z, 1“ zu 41).
 * - Löschen leert den gewählten Platz; ohne Wahl den Platz der zuletzt getippten Ziffer (sonst die
 *   rechteste Ziffer). Die anderen Ziffern bleiben, wo sie sind.
 * - Eine führende Null verschwindet, sobald rechts davon eine Ziffer steht: 0 in Z und 4 in E ist 4.
 *
 * Die Antwort ist der Wert der Plätze (`wertVon`); die Plätze selbst werden nicht gespeichert.
 * Ob die Zahl stimmt, spielt hier keine Rolle.
 */

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

/** Anzahl der Plätze für die größte Antwort des Formats */
export function anzahlPlaetze(max: number): 1 | 2 | 3 {
  return max < 10 ? 1 : max < 100 ? 2 : 3;
}

/** Stellenwert jedes Platzes, von links: z. B. ['Z', 'E'] */
export function stellenwerte(max: number): Stellenwert[] {
  return (['H', 'Z', 'E'] as const).slice(3 - anzahlPlaetze(max));
}

export function leer(max: number): Plaetze {
  return { stellen: Array<Stelle>(anzahlPlaetze(max)).fill(null), gewaehlt: null, zuletzt: null };
}

/** Plätze aus einer gespeicherten Zahl (nach Neuladen, anderer Perle): rechtsbündig, nichts gewählt */
export function ausWert(wert: number | null, max: number): Plaetze {
  const p = leer(max);
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

/** kleinste Zahl, die aus diesen Plätzen noch werden kann (leere Plätze als 0); über `max` → Ziffer passt nicht */
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

export function schritt(p: Plaetze, h: Handlung, max: number): Plaetze {
  const n = p.stellen.length;
  const e = n - 1;

  if (h.art === 'platz') {
    if (h.platz < 0 || h.platz >= n) return p;
    return { ...p, gewaehlt: h.platz };
  }

  if (h.art === 'loeschen') {
    if (p.gewaehlt !== null) {
      if (p.stellen[p.gewaehlt] === null) return p;
      const stellen = [...p.stellen];
      stellen[p.gewaehlt] = null;
      return { ...p, stellen: ordnen(stellen), zuletzt: null };
    }
    const rechteste = p.stellen.map((d, i) => (d === null ? -1 : i)).reduce((a, b) => Math.max(a, b), -1);
    const ziel = p.zuletzt !== null && p.stellen[p.zuletzt] !== null ? p.zuletzt : rechteste;
    if (ziel < 0) return p;
    const stellen = [...p.stellen];
    stellen[ziel] = null;
    return { ...p, stellen: ordnen(stellen), zuletzt: null };
  }

  const d = h.ziffer;
  if (!Number.isInteger(d) || d < 0 || d > 9) return p;

  // gewählter Platz: nur er ändert sich
  if (p.gewaehlt !== null) {
    const stellen = [...p.stellen];
    stellen[p.gewaehlt] = d;
    if (mindestens(stellen) > max) return p;
    const geordnet = ordnen(stellen);
    return { stellen: geordnet, gewaehlt: naechsteWahl(geordnet, p.gewaehlt), zuletzt: p.gewaehlt };
  }

  // gewöhnliches Tippen
  const neuBeginnen = (): Plaetze => {
    if (d > max) return p;
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
  if (mindestens(stellen) > max) return neuBeginnen();
  return { stellen: ordnen(stellen), gewaehlt: null, zuletzt: e };
}
