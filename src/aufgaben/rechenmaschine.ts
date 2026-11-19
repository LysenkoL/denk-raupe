import type { Antwort } from '../perlen/antwort';
import type { Zufall } from '../core/zufall';
import type { Einstellung, Format, ZeichenOptionen } from './format';
import { FIGUR_TOKEN, HONIG, HONIG_KANTE, WEISS } from '../design/farbe';
import { gewaehlteZahl, hilfeRahmen, kachel, kleinerRaum, nest, pfeil, punkte, punktefeld, svgHuelle, type PunktArt } from './zaehlen';
import { ueberZehner } from './rechenbild';

/**
 * Rechenmaschine (Nr. 13, Engine Bild): eine Zahl geht links in die Maschine, die Maschine rechnet, was auf ihrem
 * Schild steht (+ 2, − 5 …), rechts kommt eine Zahl heraus. Eine Zahl fehlt (Nest mit „?“).
 * Stufe 1: was kommt heraus? Schild + 1 bis + 3 oder − 1 bis − 3, ohne Zehnerübergang; bis 10, bei Zahlenraum 100 bis 20.
 * Stufe 2: schwerer wird die Rechnung – Schild bis ± 9 im ganzen Zahlenraum; bei 20 und 100 über den Zehner,
 *          bei 100 auch volle Zehner (+ 20, − 30).
 * Stufe 3: schwerer wird die Richtung – die Umkehraufgabe: bekannt ist, was herauskommt; welche Zahl ging hinein?
 * Der Löser probiert für jede fehlende Zahl 0–100 und prüft die Rechnung der Maschine.
 *
 * Hilfe auf dem Bild: Stufe 2 rahmt das Schild und die bekannte Zahl warm ein; Stufe 3 legt die Rechnung als
 * Punkte darunter (die Zahl als Punkte, was die Maschine dazutut in anderer Farbe, was sie wegnimmt
 * durchgestrichen, was gesucht ist als leere Punkte). Keine Zahl.
 */
export interface Maschine {
  /** null = fehlt (Nest) */
  ein: number | null;
  zeichen: '+' | '−';
  zahl: number | null;
  aus: number | null;
}

export const BREITE = 340;
const KY = 66;
const KW = 70;
const KH = 58;
const MX = 108;
const MW = 124;

const rechne = (ein: number, zeichen: Maschine['zeichen'], zahl: number) => (zeichen === '+' ? ein + zahl : ein - zahl);

function erzeuge(z: Zufall, stufe: number, e: Einstellung): Maschine {
  const zr = e.zahlenraum;
  const g = stufe === 1 ? kleinerRaum(zr) : zr;
  for (;;) {
    const zeichen = z.zahl() < 0.5 ? '+' : '−';
    const zehner = stufe > 1 && zr === 100 && z.zahl() < 0.3;
    const zahl = zehner ? 10 * z.ganz(1, 4) : stufe === 1 ? z.ganz(1, 3) : zr === 10 ? z.ganz(2, 6) : z.ganz(2, 9);
    const ein = z.ganz(0, g);
    const aus = rechne(ein, zeichen, zahl);
    if (aus < 0 || aus > g) continue;
    if (stufe === 1 && ueberZehner(ein, aus)) continue;
    if (stufe === 2 && zr !== 10 && !zehner && !ueberZehner(ein, aus)) continue;
    return stufe === 3 ? { ein: null, zeichen, zahl, aus } : { ein, zeichen, zahl, aus: null };
  }
}

/** Löser: jede fehlende Zahl 0–100; die Antwort ist der Wert im Nest (bei mehr als einer Lücke: mehrdeutig) */
function loesungen(m: Maschine): Antwort[] {
  const out: number[] = [];
  const werte = (v: number | null) => (v === null ? Array.from({ length: 101 }, (_, i) => i) : [v]);
  for (const ein of werte(m.ein))
    for (const zahl of werte(m.zahl))
      for (const aus of werte(m.aus)) {
        if (rechne(ein, m.zeichen, zahl) !== aus) continue;
        // Antwort: die erste fehlende Zahl von links; jede passende Belegung zählt einzeln (zwei Lücken → viele)
        out.push(m.ein === null ? ein : m.zahl === null ? zahl : aus);
      }
  return out.map((wert) => ({ art: 'zahl', wert }));
}

/** Punkte der Hilfe Stufe 3 (nur bei genau einer Lücke) */
export function hilfePunkte(m: Maschine): PunktArt[] {
  const k = m.zahl ?? 0;
  if (m.ein !== null) return m.zeichen === '+' ? [...punkte(m.ein, 'erster'), ...punkte(k, 'zweiter')] : [...punkte(m.ein - k, 'erster'), ...punkte(k, 'weg')];
  const aus = m.aus ?? 0;
  // Umkehraufgabe: ? + k = aus → aus Punkte, die k der Maschine in anderer Farbe, die gesuchten leer;
  // ? − k = aus → aus Punkte und die k, die die Maschine weggenommen hat (durchgestrichen)
  return m.zeichen === '+' ? [...punkte(aus - k, 'leer'), ...punkte(k, 'zweiter')] : [...punkte(aus, 'erster'), ...punkte(k, 'weg')];
}

/** Maschine aus Holz: Körper, Einwurf links, Ausgang rechts, Lämpchen oben, Schild mit der Regel */
function maschine(): string {
  const y = 30;
  const h = 112;
  let s = `<rect x="${MX + MW / 2 - 9}" y="${y - 12}" width="18" height="16" rx="5" fill="${FIGUR_TOKEN['ast-kante']}"/>`;
  s += `<circle cx="${MX + MW / 2}" cy="${y - 13}" r="9" fill="${HONIG_KANTE}"/><circle cx="${MX + MW / 2}" cy="${y - 14.5}" r="8" fill="${HONIG}"/>`;
  s += `<ellipse cx="${MX + MW / 2 - 3}" cy="${y - 17.5}" rx="3" ry="2" fill="${WEISS}" opacity="0.7"/>`;
  s += `<rect x="${MX}" y="${y + 6}" width="${MW}" height="${h}" rx="20" fill="${FIGUR_TOKEN['ast-kante']}"/>`;
  s += `<rect x="${MX}" y="${y}" width="${MW}" height="${h}" rx="20" fill="${FIGUR_TOKEN.ast}"/>`;
  s += `<rect x="${MX + 14}" y="${y + 5}" width="${MW - 28}" height="4" rx="2" fill="${FIGUR_TOKEN['ast-licht']}"/>`;
  // Einwurf und Ausgang: dunkle Schlitze an den Seiten
  for (const x of [MX - 2, MX + MW - 8]) s += `<rect x="${x}" y="${KY + 8}" width="10" height="${KH - 16}" rx="5" fill="${FIGUR_TOKEN['ast-kante']}"/>`;
  // zwei Füße
  for (const x of [MX + 22, MX + MW - 42]) s += `<rect x="${x}" y="${y + h + 2}" width="20" height="12" rx="5" fill="${FIGUR_TOKEN['ast-kante']}"/>`;
  return s;
}

/** linke oder rechte Zahl: Kachel oder Nest */
function feld(x: number, wert: number | null, o: ZeichenOptionen, loesung: number | null): string {
  if (wert !== null) return kachel(x, KY, KW, KH, String(wert), 30);
  return nest(x, KY, KW, KH - 4, loesung ?? gewaehlteZahl(o.gewaehlt), { loesung: loesung !== null });
}

/**
 * Zahl → Maschine → Zahl. `hilfe` 2: Schild und bekannte Zahl warm eingerahmt; 3: dazu die Punkte darunter.
 * `vorrechnen`: wie 2, im Nest die Lösung.
 */
function zeichne(m: Maschine, o: ZeichenOptionen): string {
  const hervor = o.hilfe >= 2 || !!o.vorrechnen;
  let s = '';
  const sx = MX + 14;
  const sy = 60;
  const sw = MW - 28;
  if (hervor) {
    if (m.ein !== null) s += hilfeRahmen(4 - 3, KY - 5, KW + 8, KH + 14, 'teil');
    if (m.aus !== null) s += hilfeRahmen(BREITE - 4 - KW - 5, KY - 5, KW + 8, KH + 14, 'teil');
  }
  s += maschine();
  if (hervor) s += hilfeRahmen(sx - 7, sy - 7, sw + 14, 64 + 14, 'teil');
  s += kachel(sx, sy, sw, 60, `${m.zeichen} ${m.zahl ?? '?'}`, 32);
  const loesung = o.vorrechnen ? (loesungen(m)[0] as { wert: number }).wert : null;
  s += feld(4, m.ein, o, loesung);
  s += feld(BREITE - 4 - KW, m.aus, o, loesung);
  s += pfeil(4 + KW + 6, KY + KH / 2, MX - 8, KY + KH / 2);
  s += pfeil(MX + MW + 8, KY + KH / 2, BREITE - 4 - KW - 6, KY + KH / 2);
  let H = 164;
  if (o.hilfe >= 3 && !o.vorrechnen) {
    const f = punktefeld(hilfePunkte(m), BREITE, H);
    s += f.svg;
    H += f.hoehe + 6;
  }
  return svgHuelle(BREITE, H, 'Rechenmaschine', s);
}

export const RECHENMASCHINE: Format<Maschine> = {
  id: 'rechenmaschine',
  nr: 13,
  version: 1,
  bereich: 'zahlen',
  faehigkeit: 'Z3',
  motor: 'bild',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'welcheZahlFehlt',
  stufen: 3,
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'zahl' }),
  zeichne,
  /** Lernbeispiel: (1) 1 und + 1; (2) 4 und − 1; (3) gewöhnliche Aufgabe der Stufe 1: 5 und + 3 */
  beispiele: () => [
    { ein: 1, zeichen: '+', zahl: 1, aus: null },
    { ein: 4, zeichen: '−', zahl: 1, aus: null },
    { ein: 5, zeichen: '+', zahl: 3, aus: null },
  ],
};
