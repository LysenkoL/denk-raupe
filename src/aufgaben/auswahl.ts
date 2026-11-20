import { FOKUS, LATERNE, LATERNE_KANTE, PAPIER, SCHATTEN, STEIN, STEIN_KANTE, TINTE, WEISS } from '../design/farbe';
import type { Antwort } from '../perlen/antwort';

/**
 * Bauteile der Engine Auswahl (docs/FORMATE.md, Abschnitt 5: „нажать на объект в картинке“): Karten aus Sandstein mit
 * kleiner Nummer, auf die das Kind tippt. Eine Karte ist ein Wahlziel (class="wahl-ziel", data-wahl = Nummer in der
 * Wahl). Gewählt: sie hebt sich um 4 und bekommt die doppelte Linie (Papiersaum innen, Fokus außen) – gleich, ob sie
 * stimmt. Halbschatten der Hilfe macht eine Karte blass (opacity 0.25), aber sie bleibt antippbar.
 */

export const KARTE_B = 108;
export const KARTE_H = 102;
export const KARTE_AB = 120;
export const KARTE_ZEILE = 116;

export interface KartenOptionen {
  /** Nummer der gewählten Karte (Index) oder null */
  gewaehlt: number | null;
  /** Hilfe: Karte blass (data-hilfe="schritt" oder "schatten") */
  blass?: (k: number) => 'schritt' | 'schatten' | null;
  /** Hilfe: Karte warm umrahmt – Stufe 2 „teil“, Stufe 3 „schritt“ (gestrichelt) */
  hell?: (k: number) => 'teil' | 'schritt' | null;
  /** Nummer oben links zeigen (z. B. wenn die Antwort die Nummer ist) */
  nummer?: boolean;
}

/** eine Karte aus Sandstein mit Kante; `inhalt` wird mittig gezeichnet (Mitte cx, cy) */
export function karte(x: number, y: number, gewaehlt: boolean, inhalt: string, nr: number | null, hell: 'teil' | 'schritt' | null = null): string {
  const hub = gewaehlt ? -4 : 0;
  let t = '';
  if (hell) t += `<rect data-hilfe="${hell}" x="${x - 7}" y="${y - 7}" width="${KARTE_B + 14}" height="${KARTE_H + 18}" rx="24" fill="${LATERNE}" stroke="${LATERNE_KANTE}" stroke-width="3.5"${hell === 'schritt' ? ' stroke-dasharray="9 6"' : ''}/>`;
  t += `<rect x="${x + 2}" y="${y + 7}" width="${KARTE_B}" height="${KARTE_H}" rx="18" fill="${SCHATTEN}" opacity="${gewaehlt ? 0.8 : 0.5}"/>`;
  t += `<g transform="translate(0 ${hub})"${gewaehlt ? ' data-inhalt=""' : ''}>`;
  t += `<rect x="${x}" y="${y + 4}" width="${KARTE_B}" height="${KARTE_H}" rx="18" fill="${STEIN_KANTE}"/>`;
  t += `<rect x="${x}" y="${y}" width="${KARTE_B}" height="${KARTE_H}" rx="18" fill="${STEIN}"/>`;
  t += `<rect x="${x + 10}" y="${y + 4}" width="${KARTE_B - 20}" height="4" rx="2" fill="${WEISS}" opacity="0.45"/>`;
  if (gewaehlt) {
    t += `<rect x="${x - 2}" y="${y - 2}" width="${KARTE_B + 4}" height="${KARTE_H + 10}" rx="20" fill="none" stroke="${PAPIER}" stroke-width="4"/>`;
    t += `<rect x="${x - 6.5}" y="${y - 6.5}" width="${KARTE_B + 13}" height="${KARTE_H + 19}" rx="24" fill="none" stroke="${FOKUS}" stroke-width="5"/>`;
  }
  t += inhalt;
  if (nr !== null) t += `<text x="${x + 16}" y="${y + 26}" text-anchor="middle" font-size="19" font-weight="800" fill="${TINTE}">${nr}</text>`;
  return t + '</g>';
}

/**
 * `n` Karten in Reihen zu höchstens `spalten`, mittig in der Breite `breite`, ab Höhe `oben`. `inhalt(k, cx, cy)`
 * zeichnet den Inhalt der Karte k um die Mitte. Gibt das SVG und die Höhe zurück.
 */
export function kartenReihe(
  n: number,
  spalten: number,
  breite: number,
  oben: number,
  inhalt: (k: number, cx: number, cy: number) => string,
  o: KartenOptionen,
  name: (k: number) => string,
): { svg: string; hoehe: number } {
  let s = '';
  const zeilen = Math.ceil(n / spalten);
  for (let k = 0; k < n; k++) {
    const zeile = Math.floor(k / spalten);
    const inZeile = Math.min(spalten, n - zeile * spalten);
    const x0 = (breite - (inZeile * KARTE_AB - (KARTE_AB - KARTE_B))) / 2;
    const x = x0 + (k % spalten) * KARTE_AB;
    const y = oben + zeile * KARTE_ZEILE + 6;
    const blass = o.blass?.(k) ?? null;
    s += `<g class="wahl-ziel" data-wahl="${k}" role="button" tabindex="0" aria-label="${name(k)}" opacity="${blass ? 0.25 : 1}"${blass ? ` data-hilfe="${blass}"` : ''}>`;
    s += karte(x, y, o.gewaehlt === k, inhalt(k, x + KARTE_B / 2, y + KARTE_H / 2 + 2), o.nummer ? k + 1 : null, o.hell?.(k) ?? null);
    s += '</g>';
  }
  return { svg: s, hoehe: zeilen * KARTE_ZEILE + 10 };
}

/** Index der gewählten Antwort in der Wahl (oder null) */
export function gewaehltIndex(wahl: readonly Antwort[], gewaehlt: Antwort | null, gleich: (a: Antwort, b: Antwort) => boolean): number | null {
  if (!gewaehlt) return null;
  const k = wahl.findIndex((w) => gleich(w, gewaehlt));
  return k >= 0 ? k : null;
}
