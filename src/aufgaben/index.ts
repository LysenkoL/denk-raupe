import type { Format, FormatId } from './format';
import { ZAHLENMAUER } from './zahlenmauer';
import { WER_IST_ES } from './wer-ist-es';
import { MUSTER } from './muster';

/** Alle Formate. Etappe 3: der Mustersatz aus drei Formaten verschiedener Engines. */
export const FORMATE: Record<FormatId, Format<unknown>> = {
  zahlenmauer: ZAHLENMAUER as Format<unknown>,
  'wer-ist-es': WER_IST_ES as Format<unknown>,
  muster: MUSTER as Format<unknown>,
};
