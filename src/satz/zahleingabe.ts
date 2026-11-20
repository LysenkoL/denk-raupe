/**
 * Zahl in ein Fenster eingeben (docs/STIL.md, „Управление набором — одна стеклянная бусина“; docs/PLAN.md, A10).
 * Ersetzt die Plätze Z und E aus A5: das Kind tippt matte Ziffern, die Zahl steht sofort in der Aufgabe und in der
 * Perle unten; abgeschickt wird sie nur mit der Perle. Reine Logik ohne Bildschirm: Zahl + Taste → neue Zahl.
 *
 * Harte Regel 7 (docs/TZ.md): die Eingabe verrät nichts über die Antwort. Deshalb hängt die Größe des Feldes nie
 * von der einzelnen Aufgabe ab (`zahlfeld`): bis 99 nimmt jede Aufgabe jede Zahl 0–99; bis 100 nur, wenn der
 * Elternteil „bis 100“ eingestellt hat; eine Stelle nur bei einem Format, das bei jeder Aufgabe einstellig antwortet.
 *
 * - Ziffer: hängt sich rechts an (1, 4 → 14). Eine führende Null verschwindet (0, 4 → 4). Passt die Zahl nicht
 *   mehr ins Feld, beginnt sie mit dieser Ziffer neu (bis 99: 1, 4, 5 → 5; bis 100: 1, 0, 0 → 100, 1, 0, 1 → 1).
 * - Löschen: nimmt die letzte Ziffer weg (14 → 1 → leer).
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

export type Taste = { art: 'ziffer'; ziffer: number } | { art: 'loeschen' };

/** neue Zahl nach einer Taste; null = leer */
export function tippe(wert: number | null, t: Taste, feld: Zahlfeld): number | null {
  if (t.art === 'loeschen') return wert === null || wert < 10 ? null : Math.floor(wert / 10);
  const d = t.ziffer;
  if (!Number.isInteger(d) || d < 0 || d > 9) return wert;
  if (feld === 9 || wert === null || wert === 0) return d;
  const n = wert * 10 + d;
  return n > feld ? d : n;
}
