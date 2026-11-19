import type { Format, FormatId } from './format';
import { ZAHLENMAUER } from './zahlenmauer';
import { WER_IST_ES } from './wer-ist-es';
import { MUSTER } from './muster';
// Gruppe Г1б
import { BILD_GLEICHUNGEN } from './bild-gleichungen';
import { MALAUFGABEN } from './malaufgaben';
import { HUNDERTERFELD } from './hunderterfeld';
import { ZAHLENSTRAHL } from './zahlenstrahl';
import { ENTDECKERPAECKCHEN } from './entdeckerpaeckchen';
import { RECHENSTRICH } from './rechenstrich';

/** Alle Formate. Etappe 3: der Mustersatz aus drei Formaten verschiedener Engines. */
export const FORMATE: Record<FormatId, Format<unknown>> = {
  zahlenmauer: ZAHLENMAUER as Format<unknown>,
  'wer-ist-es': WER_IST_ES as Format<unknown>,
  muster: MUSTER as Format<unknown>,
  // Gruppe Г1б
  'bild-gleichungen': BILD_GLEICHUNGEN as Format<unknown>,
  malaufgaben: MALAUFGABEN as Format<unknown>,
  hunderterfeld: HUNDERTERFELD as Format<unknown>,
  zahlenstrahl: ZAHLENSTRAHL as Format<unknown>,
  entdeckerpaeckchen: ENTDECKERPAECKCHEN as Format<unknown>,
  rechenstrich: RECHENSTRICH as Format<unknown>,
};
