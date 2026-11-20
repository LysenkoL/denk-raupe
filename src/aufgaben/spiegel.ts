import type { Antwort } from '../perlen/antwort';
import type { Zufall } from '../core/zufall';
import { aufgabeAus, type Format, type ZeichenOptionen } from './format';
import { LATERNE, LATERNE_KANTE, TINTE, TINTE_LEISE, type FormFarbe } from '../design/farbe';
import { kartenReihe } from './auswahl';
import { gitterSvg, gleichesGitter, spiegelLR, spiegelOU, type Gitter } from './zellen';

/**
 * Spiegel (Nr. 35, Engine Auswahl): links die eine Hälfte eines Bildes aus Kästchen, rechts von der gestrichelten
 * Spiegelachse leer. Welche Karte ist die andere Hälfte (das Spiegelbild)?
 * Stufe 1: 3 × 2 Kästchen, eine Farbe; drei Karten – das Spiegelbild, die Hälfte unverändert (verschoben statt
 *          gespiegelt), das oben-unten gespiegelte.
 * Stufe 2: 3 × 3 Kästchen, zwei Farben; vier Karten, dazu ein Spiegelbild mit einem anderen Kästchen.
 * Stufe 3: 4 × 3 Kästchen, drei Farben; vier Karten, zwei davon mit nur einem anderen Kästchen.
 * Der Löser vergleicht jede Karte mit dem Spiegelbild der Hälfte; genau eine muss gleich sein.
 *
 * Hilfe auf dem Bild: Stufe 2 hebt die Spiegelachse und die Spalte an ihr hervor (sie bleibt an der Achse);
 * Stufe 3 setzt die oberste Zeile des Spiegelbilds in die leere Hälfte – nur wenn danach noch zwei Karten passen.
 */
export interface Spiegel {
  haelfte: Gitter;
  karten: Gitter[];
}

function loesungen(s: Spiegel): Antwort[] {
  const ziel = spiegelLR(s.haelfte);
  return s.karten.flatMap((k, i) => (gleichesGitter(k, ziel) ? [{ art: 'zahl', wert: i + 1 } as Antwort] : []));
}

const FARBEN: FormFarbe[] = ['rot', 'blau', 'gruen', 'orange', 'lila'];

function zufallsGitter(z: Zufall, zeilen: number, spalten: number, farben: FormFarbe[]): Gitter {
  return Array.from({ length: zeilen }, () => Array.from({ length: spalten }, () => (z.zahl() < 0.55 ? z.eins(farben) : null)));
}
/** ein Kästchen anders (leer ↔ Farbe) */
function einAnders(z: Zufall, g: Gitter, farben: FormFarbe[]): Gitter {
  const n = g.map((r) => [...r]);
  const i = z.ganz(0, g.length - 1);
  const j = z.ganz(0, g[0].length - 1);
  n[i][j] = n[i][j] ? null : z.eins(farben);
  return n;
}

function erzeuge(z: Zufall, stufe: number): Spiegel {
  const [zeilen, spalten, nf, anzahl] = stufe === 1 ? [3, 2, 1, 3] : stufe === 2 ? [3, 3, 2, 4] : [4, 3, 3, 4];
  const farben = z.mischen(FARBEN).slice(0, nf);
  for (;;) {
    const h = zufallsGitter(z, zeilen, spalten, farben);
    const voll = h.flat().filter((c) => c).length;
    // genug Kästchen, jede Zeile und die Spalte an der Achse nicht leer; nicht schon selbst symmetrisch
    if (voll < zeilen + 1 || h.some((r) => r.every((c) => !c)) || h.every((r) => !r[spalten - 1])) continue;
    if (gleichesGitter(h, spiegelLR(h)) || gleichesGitter(spiegelLR(h), spiegelOU(spiegelLR(h)))) continue;
    if (nf > 1 && new Set(h.flat().filter((c) => c)).size < nf) continue;
    const ziel = spiegelLR(h);
    const kandidaten: Gitter[] = [h, spiegelOU(ziel), einAnders(z, ziel, farben), einAnders(z, ziel, farben), spiegelOU(h)];
    const karten: Gitter[] = [ziel];
    const reihe = stufe === 1 ? kandidaten.slice(0, 2) : stufe === 2 ? [kandidaten[0], kandidaten[2], kandidaten[1]] : [kandidaten[2], kandidaten[3], kandidaten[0]];
    for (const k of [...reihe, ...kandidaten]) if (karten.length < anzahl && !karten.some((x) => gleichesGitter(x, k))) karten.push(k);
    if (karten.length < anzahl) continue;
    return { haelfte: h, karten: z.mischen(karten) };
  }
}

/** passt die oberste Zeile des Spiegelbilds zu mindestens zwei Karten? (sonst verrät Stufe 3 die Lösung) */
const schrittVerraet = (s: Spiegel) => s.karten.filter((k) => k[0].every((c, j) => c === spiegelLR(s.haelfte)[0][j])).length < 2;

/* ---------- Bild ---------- */

const Z = 30;

function zeichne(s: Spiegel, o: ZeichenOptionen): string {
  const zeilen = s.haelfte.length;
  const spalten = s.haelfte[0].length;
  // drei Karten nebeneinander brauchen 3 · 120 + Rand
  const W = s.karten.length === 3 ? 372 : 300;
  const bx = W / 2 - spalten * Z;
  const by = 10;
  let t = '';
  if (o.hilfe >= 2 || o.vorrechnen) t += `<rect data-hilfe="teil" x="${W / 2 - Z - 6}" y="${by - 6}" width="${Z + 12}" height="${zeilen * Z + 12}" rx="10" fill="${LATERNE}" stroke="${LATERNE_KANTE}" stroke-width="3"/>`;
  t += gitterSvg(s.haelfte, bx, by, Z);
  const ziel = spiegelLR(s.haelfte);
  const leer: Gitter = ziel.map((r) => r.map(() => null));
  const zeigen = o.vorrechnen ? ziel : o.hilfe >= 3 && (o.aehnlich || !schrittVerraet(s)) ? [ziel[0], ...leer.slice(1)] : leer;
  if (o.hilfe >= 3 && !o.vorrechnen && zeigen !== leer) t += `<g data-hilfe="schritt">${gitterSvg([ziel[0]], W / 2, by, Z)}</g>` + gitterSvg(leer.slice(1), W / 2, by + Z, Z);
  else t += gitterSvg(zeigen, W / 2, by, Z);
  if (!o.vorrechnen && (o.hilfe < 3 || zeigen === leer)) t += `<text x="${W / 2 + (spalten * Z) / 2}" y="${by + (zeilen * Z) / 2 + 10}" text-anchor="middle" font-size="28" font-weight="800" fill="${TINTE_LEISE}">?</text>`;
  t += `<path data-zeichen="achse" d="M${W / 2} ${by - 8}V${by + zeilen * Z + 8}" stroke="${TINTE}" stroke-width="3" stroke-dasharray="7 5"/>`;
  const oben = by + zeilen * Z + 18;
  const gew = o.vorrechnen ? (loesungen(s)[0] as { wert: number }).wert - 1 : o.gewaehlt?.art === 'zahl' ? o.gewaehlt.wert - 1 : null;
  const kz = Math.min(18, 84 / Math.max(zeilen, spalten));
  const reihe = kartenReihe(s.karten.length, s.karten.length === 4 ? 2 : 3, W, oben, (i, cx, cy) => gitterSvg(s.karten[i], cx - (spalten * kz) / 2, cy - (zeilen * kz) / 2 + 4, kz), { gewaehlt: gew, nummer: true }, (i) => `Karte ${i + 1}`);
  t += reihe.svg;
  return `<svg class="aufgabe-svg" viewBox="0 0 ${W} ${oben + reihe.hoehe}" role="group" aria-label="Spiegel">${t}</svg>`;
}

export const SPIEGEL: Format<Spiegel> = {
  id: 'spiegel',
  nr: 35,
  version: 1,
  bereich: 'raum',
  faehigkeit: 'R1',
  motor: 'auswahl',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'welcheHaelfte',
  stufen: 3,
  /** hängt nicht vom Zahlenraum ab: liest die Einstellung nicht */
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'bild' }),
  wahl: (s) => s.karten.map((_, i) => ({ art: 'zahl', wert: i + 1 }) as Antwort),
  zeichne,
  schrittVerraet,
  /** Lernbeispiel: (1) zwei Karten, Hälfte aus zwei Zeilen; (2) gewöhnliche Aufgabe der Stufe 1 aus dem Generator. */
  beispiele: () => {
    const [r, _] = ['rot' as FormFarbe, null];
    const h: Gitter = [[r, r], [_, r]];
    return [{ haelfte: h, karten: [h, spiegelLR(h)] }, aufgabeAus(SPIEGEL, 0, 1).bedingung];
  },
};
