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
};
