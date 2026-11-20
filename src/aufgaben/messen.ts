import type { Antwort } from '../perlen/antwort';
import type { Zufall } from '../core/zufall';
import type { Einstellung, Format, ZeichenOptionen } from './format';
import { FORM_FARBEN, HOLZ, HOLZ_KANTE, LATERNE, LATERNE_KANTE, TINTE, TINTE_LEISE, WEISS, kanteZu, mix, type FormFarbe } from '../design/farbe';
import { gewaehlteZahl, nest, svgHuelle } from './zaehlen';

/**
 * Messen (Nr. 83, Engine Bild): über einem Lineal liegt ein Stäbchen – wie lang ist es (in cm)?
 * Das Lineal beginnt wie ein echtes Lineal nicht am Rand: links vor der 0 ist ein Stück Holz frei.
 * Stufe 1: das Stäbchen beginnt bei 0, jede Zahl steht am Lineal; 2–8 cm (bei Zahlenraum 100: bis 10 cm).
 * Stufe 2: schwerer wird das Ablesen – nur 0, 5, 10 und 15 stehen am Lineal, dazwischen nur Striche; 5–15 cm
 *          (bei Zahlenraum 10: 5–10 cm).
 * Stufe 3: schwerer wird der Anfang – das Stäbchen beginnt nicht bei 0 (bei 1–5), jede Zahl steht da;
 *          3–10 cm (bei Zahlenraum 10: 3–8 cm, Ende höchstens 10).
 * Der Löser liest Anfang und Ende des Stäbchens am Lineal: beide müssen genau auf einem Zentimeterstrich des
 * Lineals liegen, sonst ist die Länge nicht abzulesen (zwei Antworten, verworfen).
 *
 * Hilfe auf dem Bild: Stufe 2 zieht gestrichelte Linien von beiden Enden des Stäbchens hinunter auf das Lineal;
 * Stufe 3 färbt dazu die Zentimeter unter dem Stäbchen abwechselnd warm ein – jeder Zentimeter ist ein Feld,
 * gezählt wird selbst. Keine Zahl.
 */
export interface Messen {
  /** Anfang und Länge in cm */
  start: number;
  laenge: number;
  /** Länge des Lineals in cm (Striche 0 … lineal) */
  lineal: number;
  /** jede wievielte Zahl steht am Lineal */
  beschriftung: 1 | 5;
  farbe: FormFarbe;
}

/** ein Zentimeter im Bild */
export const CM = 28;
const LINKS = 26;
const RAND = 12;

/** Löser: Anfang und Ende auf ganzen Strichen innerhalb des Lineals → Länge; sonst nicht abzulesen */
function loesungen(m: Messen): Antwort[] {
  const ende = m.start + m.laenge;
  const ganz = (x: number) => Math.abs(x - Math.round(x)) < 1e-9;
  if (m.laenge <= 0 || m.start < 0 || ende > m.lineal) return [];
  if (!ganz(m.start) || !ganz(ende)) return [{ art: 'zahl', wert: Math.floor(m.laenge) }, { art: 'zahl', wert: Math.ceil(m.laenge) }];
  return [{ art: 'zahl', wert: Math.round(m.laenge) }];
}

const FARBEN: FormFarbe[] = ['rot', 'orange', 'gruen', 'blau', 'lila'];

export function baue(start: number, laenge: number, beschriftung: 1 | 5, farbe: FormFarbe): Messen {
  // das Lineal reicht mindestens bis 10 und einen Zentimeter über das Stäbchen hinaus (das Ende ist nie der Rand)
  const lineal = Math.max(10, start + laenge + 1);
  return { start, laenge, lineal, beschriftung, farbe };
}

function erzeuge(z: Zufall, stufe: number, e: Einstellung): Messen {
  const farbe = z.eins(FARBEN);
  const zr = e.zahlenraum;
  if (stufe === 1) return baue(0, z.ganz(2, zr === 100 ? 10 : 8), 1, farbe);
  if (stufe === 2) return baue(0, z.ganz(5, zr === 10 ? 10 : 15), 5, farbe);
  for (;;) {
    const start = z.ganz(1, 5);
    const laenge = z.ganz(3, zr === 10 ? 8 : 10);
    if (zr === 10 && start + laenge > 10) continue;
    return baue(start, laenge, 1, farbe);
  }
}

/* ---------- Bild ---------- */

const x = (cm: number) => LINKS + RAND + cm * CM;

/**
 * Stäbchen oben, Lineal darunter, Nest mit „cm“ unten rechts.
 * `hilfe` 2: gestrichelte Linien von den Enden zum Lineal; 3: dazu die Zentimeter unter dem Stäbchen abwechselnd warm.
 * `vorrechnen`: Linien und Zentimeter, im Nest die Zahl.
 */
function zeichne(m: Messen, o: ZeichenOptionen): string {
  const W = x(m.lineal) + RAND + 14;
  const stabY = 22;
  const stabH = 26;
  const linealY = stabY + stabH + 34;
  const linealH = 62;
  const c = FORM_FARBEN[m.farbe];
  let s = '';
  // Lineal aus hellem Holz, Kante unten
  s += `<rect x="${LINKS}" y="${linealY + 5}" width="${x(m.lineal) + RAND - LINKS}" height="${linealH}" rx="8" fill="${HOLZ_KANTE}"/>`;
  s += `<rect x="${LINKS}" y="${linealY}" width="${x(m.lineal) + RAND - LINKS}" height="${linealH}" rx="8" fill="${HOLZ}"/>`;
  const zeigen = o.hilfe >= 3 || !!o.vorrechnen;
  if (zeigen)
    for (let k = 0; k < m.laenge; k++)
      s += `<rect data-hilfe="${o.vorrechnen ? 'teil' : 'schritt'}" x="${x(m.start + k)}" y="${linealY + 2}" width="${CM}" height="${linealH - 30}" fill="${k % 2 ? LATERNE : mix(LATERNE, LATERNE_KANTE, 0.45)}"/>`;
  for (let k = 0; k <= m.lineal; k++) {
    const lang = k % 5 === 0;
    s += `<path d="M${x(k)} ${linealY}V${linealY + (lang ? 24 : 16)}" stroke="${TINTE}" stroke-width="${lang ? 2.6 : 1.8}"/>`;
    if (k < m.lineal) s += `<path d="M${x(k) + CM / 2} ${linealY}V${linealY + 8}" stroke="${TINTE_LEISE}" stroke-width="1.2"/>`;
    if (k % m.beschriftung === 0) s += `<text x="${x(k)}" y="${linealY + 46}" text-anchor="middle" font-size="19" font-weight="800" fill="${TINTE}">${k}</text>`;
  }
  // Stäbchen: gerade Enden, Kante unten, Licht oben
  const [a, b] = [x(m.start), x(m.start + m.laenge)];
  s += `<rect x="${a}" y="${stabY + 4}" width="${b - a}" height="${stabH}" rx="3" fill="${kanteZu(c)}"/>`;
  s += `<rect x="${a}" y="${stabY}" width="${b - a}" height="${stabH}" rx="3" fill="${c}"/>`;
  s += `<rect x="${a + 5}" y="${stabY + 4}" width="${Math.max(0, b - a - 10)}" height="5" rx="2.5" fill="${WEISS}" opacity="0.45"/>`;
  if (o.hilfe >= 2 || o.vorrechnen)
    for (const px of [a, b]) s += `<path data-hilfe="teil" d="M${px} ${stabY - 6}V${linealY + 26}" stroke="${LATERNE_KANTE}" stroke-width="4" stroke-dasharray="7 5"/>`;
  const ny = linealY + linealH + 18;
  const loesung = o.vorrechnen ? m.laenge : null;
  s += nest(W - 4 - 84 - 46, ny, 84, 54, loesung ?? gewaehlteZahl(o.gewaehlt), { loesung: loesung !== null });
  s += `<text x="${W - 4 - 22}" y="${ny + 38}" text-anchor="middle" font-size="24" font-weight="800" fill="${TINTE_LEISE}">cm</text>`;
  return svgHuelle(W, ny + 54 + 10, 'Messen', s);
}

export const MESSEN: Format<Messen> = {
  id: 'messen',
  nr: 83,
  version: 1,
  bereich: 'zahlen',
  faehigkeit: 'Z8',
  motor: 'bild',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'wieLang',
  stufen: 3,
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'zahl' }),
  zeichne,
  /** Lernbeispiel: (1) 1 cm; (2) 3 cm; (3) gewöhnliche Aufgabe der Stufe 1: 6 cm, grün. */
  beispiele: () => [baue(0, 1, 1, 'blau'), baue(0, 3, 1, 'orange'), baue(0, 6, 1, 'gruen')],
};
