import type { Format, FormatId } from './format';
import { ZAHLENMAUER } from './zahlenmauer';
import { WER_IST_ES } from './wer-ist-es';
import { MUSTER } from './muster';
import { WIE_VIELE } from './wie-viele';
import { RECHENBILD } from './rechenbild';
import { RECHENMASCHINE } from './rechenmaschine';
import { KLECKS } from './klecks';
import { GROESSER_KLEINER } from './groesser-kleiner';
import { VERDOPPELN } from './verdoppeln';
// Gruppe Г1б
import { BILD_GLEICHUNGEN } from './bild-gleichungen';
import { MALAUFGABEN } from './malaufgaben';
import { HUNDERTERFELD } from './hunderterfeld';
import { ZAHLENSTRAHL } from './zahlenstrahl';
import { ENTDECKERPAECKCHEN } from './entdeckerpaeckchen';
import { RECHENSTRICH } from './rechenstrich';
// Gruppe Г2а
import { WUERFELBAU } from './wuerfelbau';
import { ZAEHL_BILD } from './zaehl-bild';
import { ECKEN_SEITEN } from './ecken-seiten';
import { PLAN } from './plan';
import { OBEN_UNTEN } from './oben-unten';
// Gruppe Г2б
import { MESSEN } from './messen';
import { AUFGABENFAMILIE } from './aufgabenfamilie';
import { WELCHE_AUFGABE } from './welche-aufgabe';
import { GEHEIMSCHRIFT } from './geheimschrift';

/**
 * Alle Formate. Jedes hier eingetragene Format kommt von selbst in die gemischten Sätze (src/satz/sitzung.ts,
 * `mischPlan`), auf die Probe-Seite #/alle und in die Tests über alle Formate.
 */
export const FORMATE: Record<FormatId, Format<unknown>> = {
  zahlenmauer: ZAHLENMAUER as Format<unknown>,
  'wer-ist-es': WER_IST_ES as Format<unknown>,
  muster: MUSTER as Format<unknown>,
  'wie-viele': WIE_VIELE as Format<unknown>,
  rechenbild: RECHENBILD as Format<unknown>,
  rechenmaschine: RECHENMASCHINE as Format<unknown>,
  klecks: KLECKS as Format<unknown>,
  'groesser-kleiner': GROESSER_KLEINER as Format<unknown>,
  verdoppeln: VERDOPPELN as Format<unknown>,
  // Gruppe Г1б
  'bild-gleichungen': BILD_GLEICHUNGEN as Format<unknown>,
  malaufgaben: MALAUFGABEN as Format<unknown>,
  hunderterfeld: HUNDERTERFELD as Format<unknown>,
  zahlenstrahl: ZAHLENSTRAHL as Format<unknown>,
  entdeckerpaeckchen: ENTDECKERPAECKCHEN as Format<unknown>,
  rechenstrich: RECHENSTRICH as Format<unknown>,
  // Gruppe Г2а
  wuerfelbau: WUERFELBAU as Format<unknown>,
  'zaehl-bild': ZAEHL_BILD as Format<unknown>,
  'ecken-seiten': ECKEN_SEITEN as Format<unknown>,
  plan: PLAN as Format<unknown>,
  'oben-unten': OBEN_UNTEN as Format<unknown>,
  // Gruppe Г2б
  messen: MESSEN as Format<unknown>,
  aufgabenfamilie: AUFGABENFAMILIE as Format<unknown>,
  'welche-aufgabe': WELCHE_AUFGABE as Format<unknown>,
  geheimschrift: GEHEIMSCHRIFT as Format<unknown>,
};
