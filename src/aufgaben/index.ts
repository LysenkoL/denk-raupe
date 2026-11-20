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
// Gruppe Г2в
import { UHR } from './uhr';
import { GELD } from './geld';
// Gruppe Г3 (Engine Auswahl)
import { MUSTER_FEHLER } from './muster-fehler';
import { PASST_NICHT } from './passt-nicht';
import { ZWEI_KREISE } from './zwei-kreise';
import { SPIEGEL } from './spiegel';
import { DREHEN } from './drehen';
import { SPIEGELACHSE } from './spiegelachse';
import { DIAGRAMM } from './diagramm';
import { MAUER_FEHLER } from './mauer-fehler';
// Gruppen Г4–Г6
import { ZAHLENHAUS } from './zahlenhaus';
import { RECHENDREIECK } from './rechendreieck';
import { BILDER_GITTER } from './bilder-gitter';
import { ZAHLENREIHE } from './zahlenreihe';
import { PERLENKETTE } from './perlenkette';
import { ABC_REIHE } from './abc-reihe';
import { RAUPEN_WEG } from './raupen-weg';
import { LABYRINTH } from './labyrinth';

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
  // Gruppe Г2в
  uhr: UHR as Format<unknown>,
  geld: GELD as Format<unknown>,
  // Gruppe Г3 (Engine Auswahl)
  'muster-fehler': MUSTER_FEHLER as Format<unknown>,
  'passt-nicht': PASST_NICHT as Format<unknown>,
  'zwei-kreise': ZWEI_KREISE as Format<unknown>,
  spiegel: SPIEGEL as Format<unknown>,
  drehen: DREHEN as Format<unknown>,
  spiegelachse: SPIEGELACHSE as Format<unknown>,
  diagramm: DIAGRAMM as Format<unknown>,
  'mauer-fehler': MAUER_FEHLER as Format<unknown>,
  // Gruppen Г4–Г6
  zahlenhaus: ZAHLENHAUS as Format<unknown>,
  rechendreieck: RECHENDREIECK as Format<unknown>,
  'bilder-gitter': BILDER_GITTER as Format<unknown>,
  zahlenreihe: ZAHLENREIHE as Format<unknown>,
  perlenkette: PERLENKETTE as Format<unknown>,
  'abc-reihe': ABC_REIHE as Format<unknown>,
  'raupen-weg': RAUPEN_WEG as Format<unknown>,
  labyrinth: LABYRINTH as Format<unknown>,
};
