import type { Antwort, Form } from '../perlen/antwort';
import { gleich } from '../perlen/antwort';
import type { Zufall } from '../core/zufall';
import { aufgabeAus, type Format, type ZeichenOptionen } from './format';
import { FIGUR_TOKEN, FORM_FARBEN, LATERNE, LATERNE_KANTE, PAPIER, TINTE, TINTE_LEISE, type FormFarbe } from '../design/farbe';
import { formPfad } from '../perlen/maler';
import { schild } from './zaehlen';
import { kartenReihe } from './auswahl';

/**
 * Zwei Kreise (Nr. 27, Engine Auswahl, Antwort Form): zwei Kreise überlappen sich; über jedem ein Schild mit seiner
 * Bedingung (Farbtupfer = diese Farbe, graue Form = diese Form). Im Bild steht „?“ an einer Stelle – welche Form gehört
 * dorthin? Darunter liegen Formen auf Karten zur Wahl. In den anderen Teilen liegt schon je ein Beispiel.
 * Stufe 1: „?“ in der Mitte (in beiden Kreisen); drei Formen: die richtige, eine nur für links, eine nur für rechts.
 * Stufe 2: „?“ in der Mitte; vier Formen, dazu eine, die in keinen Kreis gehört.
 * Stufe 3: schwerer wird die Art – „?“ in einem Kreis, aber nicht im anderen; vier Formen, darunter eine für die Mitte.
 * Der Löser prüft jede Karte gegen die Stelle des „?“ (in beiden; nur links; nur rechts). Liegt ein Beispiel im Bild an
 * falscher Stelle, gibt es keine Lösung (das Bild widerspräche sich).
 *
 * Hilfe auf dem Bild: Stufe 2 hebt das Schild des linken Kreises hervor; Stufe 3 macht die Karten blass, die nicht zum
 * linken Kreis passen – übrig bleiben mindestens zwei (sonst an der ähnlichen Aufgabe).
 */
export type Bedingung = { art: 'farbe'; farbe: FormFarbe } | { art: 'form'; form: Form };
export type Stelle = 'beide' | 'links' | 'rechts' | 'keiner';
export interface Element {
  form: Form;
  farbe: FormFarbe;
}
export interface ZweiKreise {
  links: Bedingung;
  rechts: Bedingung;
  frage: Exclude<Stelle, 'keiner'>;
  karten: Element[];
  beispiele: { stelle: Stelle; e: Element }[];
}

const passt = (e: Element, b: Bedingung) => (b.art === 'farbe' ? e.farbe === b.farbe : e.form === b.form);
export function stelleVon(z: Pick<ZweiKreise, 'links' | 'rechts'>, e: Element): Stelle {
  const [l, r] = [passt(e, z.links), passt(e, z.rechts)];
  return l && r ? 'beide' : l ? 'links' : r ? 'rechts' : 'keiner';
}
const als = (e: Element): Antwort => ({ art: 'form', form: e.form, farbe: e.farbe });

function loesungen(z: ZweiKreise): Antwort[] {
  if (z.beispiele.some((b) => stelleVon(z, b.e) !== b.stelle)) return [];
  return z.karten.filter((e) => stelleVon(z, e) === z.frage).map(als);
}

const FORMEN: Form[] = ['kreis', 'quadrat', 'dreieck', 'raute', 'stern'];
const FARBEN: FormFarbe[] = ['rot', 'orange', 'gelb', 'gruen', 'blau', 'lila'];

/** zufälliges Element an einer Stelle (Farbe links/Form rechts oder umgekehrt) */
function an(z: Zufall, k: Pick<ZweiKreise, 'links' | 'rechts'>, stelle: Stelle, nicht: Element[]): Element | null {
  const alle = FORMEN.flatMap((form) => FARBEN.map((farbe) => ({ form, farbe })));
  const moeglich = alle.filter((e) => stelleVon(k, e) === stelle && !nicht.some((x) => x.form === e.form && x.farbe === e.farbe));
  return moeglich.length ? z.eins(moeglich) : null;
}

function erzeuge(z: Zufall, stufe: number): ZweiKreise {
  for (;;) {
    const farbe: Bedingung = { art: 'farbe', farbe: z.eins(FARBEN) };
    const form: Bedingung = { art: 'form', form: z.eins(FORMEN) };
    const [links, rechts] = z.zahl() < 0.5 ? [farbe, form] : [form, farbe];
    const k = { links, rechts };
    const frage: ZweiKreise['frage'] = stufe < 3 ? 'beide' : z.eins(['links', 'rechts'] as const);
    const stellen: Stelle[] = stufe === 1 ? [frage, 'links', 'rechts'] : stufe === 2 ? [frage, 'links', 'rechts', 'keiner'] : [frage, 'beide', frage === 'links' ? 'rechts' : 'links', 'keiner'];
    const karten: Element[] = [];
    for (const st of stellen) {
      const e = an(z, k, st, karten);
      if (e) karten.push(e);
    }
    if (karten.length !== stellen.length) continue;
    // Beispiele: eins in jedem Teil außer dem gefragten (nicht dieselben wie die Karten)
    const beispiele: ZweiKreise['beispiele'] = [];
    for (const st of (['beide', 'links', 'rechts'] as Stelle[]).filter((s) => s !== frage)) {
      const e = an(z, k, st, [...karten, ...beispiele.map((b) => b.e)]);
      if (e) beispiele.push({ stelle: st, e });
    }
    return { links, rechts, frage, karten: z.mischen(karten), beispiele };
  }
}

const schrittVerraet = (z: ZweiKreise) => z.karten.filter((e) => passt(e, z.links)).length < 2;

/* ---------- Bild ---------- */

/** Breite: drei Karten nebeneinander passen hinein (3 · 120 + Rand) */
const W = 372;
const CY = 150;
const R = 84;
const [LX, RX] = [W / 2 - 52, W / 2 + 52];
const ORT: Record<Stelle, [number, number]> = { beide: [W / 2, CY], links: [LX - 40, CY], rechts: [RX + 40, CY], keiner: [0, 0] };

function bedingungSchild(cx: number, y: number, b: Bedingung, hell: boolean): string {
  let t = '';
  if (hell) t += `<rect data-hilfe="teil" x="${cx - 42}" y="${y - 5}" width="84" height="64" rx="16" fill="${LATERNE}" stroke="${LATERNE_KANTE}" stroke-width="3"/>`;
  t += schild(cx - 36, y, 72, 54);
  if (b.art === 'farbe') t += `<path data-zeichen="farbe" d="M${cx - 16} ${y + 30} q4 -18 16 -16 q14 -6 16 10 q4 16 -14 16 q-20 4 -18 -10z" fill="${FORM_FARBEN[b.farbe]}" stroke="${TINTE}" stroke-width="2"/>`;
  else t += formPfad(b.form, cx, y + 27, 16, FIGUR_TOKEN['hut-grau'], FIGUR_TOKEN['hut-grau-kante'], 3);
  return t;
}

/**
 * Zwei Kreise mit Schildern, Beispiele in den Teilen, „?“ an der gefragten Stelle; darunter die Karten.
 * `hilfe` 2: linkes Schild hervorgehoben; 3: Karten blass, die nicht zum linken Kreis passen.
 */
function zeichne(k: ZweiKreise, o: ZeichenOptionen): string {
  const hell = o.hilfe >= 2 || !!o.vorrechnen;
  let s = '';
  s += bedingungSchild(LX - 30, 4, k.links, hell) + bedingungSchild(RX + 30, 4, k.rechts, false);
  s += `<circle cx="${LX}" cy="${CY}" r="${R}" fill="${PAPIER}" fill-opacity="0.55" stroke="${FIGUR_TOKEN['ast-kante']}" stroke-width="4"/>`;
  s += `<circle cx="${RX}" cy="${CY}" r="${R}" fill="${PAPIER}" fill-opacity="0.55" stroke="${FIGUR_TOKEN['ast-kante']}" stroke-width="4"/>`;
  for (const b of k.beispiele) {
    const [x, y] = ORT[b.stelle];
    s += formPfad(b.e.form, x, y, 16, FORM_FARBEN[b.e.farbe]);
  }
  const [fx, fy] = ORT[k.frage];
  const gew = o.vorrechnen ? loesungen(k)[0] : o.gewaehlt;
  if (gew?.art === 'form') s += `<g${o.vorrechnen ? '' : ' data-inhalt=""'}>${formPfad(gew.form, fx, fy, 18, FORM_FARBEN[gew.farbe])}</g>`;
  else s += `<circle cx="${fx}" cy="${fy}" r="20" fill="${PAPIER}" stroke="${TINTE_LEISE}" stroke-width="2.5" stroke-dasharray="6 4"/><text x="${fx}" y="${fy + 9}" text-anchor="middle" font-size="26" font-weight="800" fill="${TINTE_LEISE}">?</text>`;
  const blass = o.hilfe >= 3 && !o.vorrechnen && (o.aehnlich || !schrittVerraet(k));
  const gi = gew ? k.karten.findIndex((e) => gleich(als(e), gew)) : -1;
  const n = k.karten.length;
  const reihe = kartenReihe(n, n === 4 ? 2 : 3, W, CY + R + 12, (i, cx, cy) => formPfad(k.karten[i].form, cx, cy + 4, 26, FORM_FARBEN[k.karten[i].farbe]), { gewaehlt: gi >= 0 ? gi : null, blass: (i) => (blass && !passt(k.karten[i], k.links) ? 'schritt' : null) }, (i) => `Karte ${i + 1}`);
  s += reihe.svg;
  return `<svg class="aufgabe-svg" viewBox="0 0 ${W} ${CY + R + 12 + reihe.hoehe}" role="group" aria-label="Zwei Kreise">${s}</svg>`;
}

export const ZWEI_KREISE: Format<ZweiKreise> = {
  id: 'zwei-kreise',
  nr: 27,
  version: 1,
  bereich: 'logik',
  faehigkeit: 'L1',
  motor: 'auswahl',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'wasGehoertHin',
  stufen: 3,
  /** hängt nicht vom Zahlenraum ab: liest die Einstellung nicht */
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'bild' }),
  wahl: (k) => k.karten.map(als),
  zeichne,
  schrittVerraet,
  /** Lernbeispiel: (1) rot und Kreis – zwei Karten; (2) gewöhnliche Aufgabe der Stufe 1 aus dem Generator. */
  beispiele: () => [
    {
      links: { art: 'farbe', farbe: 'rot' },
      rechts: { art: 'form', form: 'kreis' },
      frage: 'beide',
      karten: [{ form: 'stern', farbe: 'blau' }, { form: 'kreis', farbe: 'rot' }],
      beispiele: [{ stelle: 'links', e: { form: 'quadrat', farbe: 'rot' } }, { stelle: 'rechts', e: { form: 'kreis', farbe: 'blau' } }],
    },
    aufgabeAus(ZWEI_KREISE, 0, 1).bedingung,
  ],
};
