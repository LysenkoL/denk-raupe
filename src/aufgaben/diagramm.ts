import type { Antwort, Form } from '../perlen/antwort';
import { gleich } from '../perlen/antwort';
import type { Zufall } from '../core/zufall';
import { aufgabeAus, type Einstellung, type Format, type ZeichenOptionen } from './format';
import { FORM_FARBEN, HOLZ, HOLZ_KANTE, LATERNE_KANTE, PAPIER, TINTE, TINTE_LEISE, kanteZu, type FormFarbe } from '../design/farbe';
import { formPfad } from '../perlen/maler';
import { hilfeRahmen } from './zaehlen';

/**
 * Diagramm lesen (Nr. 84, Engine Auswahl, Antwort Form): Kinder haben gewählt – was wurde am häufigsten gewählt?
 * Jede Sorte ist eine Form in ihrer Farbe; das Kind tippt auf die Sorte (unter der Säule oder vorn in der Zeile).
 * Stufe 1: Bilddiagramm – drei Sorten, jede Wahl ist eine Form in der Säule (1–6).
 * Stufe 2: Säulendiagramm mit Zahlen an der Achse – vier Sorten; bis 10 (Zahlenraum 10) oder bis 15.
 * Stufe 3: Strichliste – vier Sorten, Striche in Fünferbündeln (der fünfte quer); bis 15 (Zahlenraum 10: bis 10).
 * Der Löser liest die Höhen der Säulen (Zahl der Formen, Striche); die größte muss es genau einmal geben.
 *
 * Hilfe auf dem Bild: Stufe 2 hebt hervor, woran man abliest (Bilddiagramm: die Spitzen der Säulen; Säulen: die Achse;
 * Strichliste: die Fünferbündel). Stufe 3 macht die kleinste Sorte blass – übrig bleiben mindestens zwei.
 */
export type Art = 'bild' | 'saeulen' | 'striche';
export interface Sorte {
  form: Form;
  farbe: FormFarbe;
  anzahl: number;
}
export interface Diagramm {
  art: Art;
  sorten: Sorte[];
  /** Säulen: höchster Wert der Achse */
  achse: number;
}

const als = (s: Sorte): Antwort => ({ art: 'form', form: s.form, farbe: s.farbe });

function loesungen(d: Diagramm): Antwort[] {
  const max = Math.max(...d.sorten.map((s) => s.anzahl));
  if (d.art === 'saeulen' && max > d.achse) return [];
  return d.sorten.filter((s) => s.anzahl === max).map(als);
}

const PAARE: [Form, FormFarbe][] = [['kreis', 'rot'], ['stern', 'gelb'], ['dreieck', 'gruen'], ['quadrat', 'blau'], ['raute', 'lila'], ['kreis', 'orange']];

function erzeuge(z: Zufall, stufe: number, e: Einstellung): Diagramm {
  const art: Art = stufe === 1 ? 'bild' : stufe === 2 ? 'saeulen' : 'striche';
  const n = stufe === 1 ? 3 : 4;
  const max = stufe === 1 ? 6 : e.zahlenraum === 10 ? 10 : 15;
  for (;;) {
    const paare = z.mischen(PAARE).slice(0, n);
    const sorten = paare.map(([form, farbe]) => ({ form, farbe, anzahl: z.ganz(1, max) }));
    const werte = sorten.map((s) => s.anzahl).sort((a, b) => b - a);
    // die größte genau einmal; auf Stufe 2 und 3 liegt die zweite dicht dahinter (1–2 mehr)
    if (werte[0] === werte[1]) continue;
    if (stufe > 1 && werte[0] - werte[1] > 2) continue;
    return { art, sorten, achse: max };
  }
}

/** Hilfe Stufe 3: die kleinste Sorte blass (die erste, wenn es mehrere gibt) */
export function kleinste(d: Diagramm): number {
  const min = Math.min(...d.sorten.map((s) => s.anzahl));
  return d.sorten.findIndex((s) => s.anzahl === min);
}

/* ---------- Bild ---------- */

const W = 320;

/** Tippfläche einer Sorte: die ganze Säule bzw. Zeile; gewählt bekommt sie einen Fokusrahmen */
function ziel(k: number, x: number, y: number, w: number, h: number, inhalt: string, o: { gewaehlt: boolean; blass: boolean }): string {
  let t = `<g class="wahl-ziel" data-wahl="${k}" role="button" tabindex="0" aria-label="Sorte ${k + 1}" opacity="${o.blass ? 0.25 : 1}"${o.blass ? ' data-hilfe="schritt"' : ''}>`;
  t += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${PAPIER}" opacity="0.01"/>`;
  t += inhalt;
  if (o.gewaehlt) t += `<rect data-inhalt="" x="${x + 2}" y="${y + 2}" width="${w - 4}" height="${h - 4}" rx="12" fill="none" stroke="#2B289F" stroke-width="5"/>`;
  return t + '</g>';
}

function zeichne(d: Diagramm, o: ZeichenOptionen): string {
  const n = d.sorten.length;
  const gew = o.vorrechnen ? loesungen(d)[0] : o.gewaehlt;
  const gi = gew ? d.sorten.findIndex((s) => gleich(als(s), gew)) : -1;
  const blassK = o.hilfe >= 3 && !o.vorrechnen ? kleinste(d) : -1;
  const hell = o.hilfe >= 2 || !!o.vorrechnen;
  let s = '';
  if (d.art === 'striche') {
    // Strichliste: Zeilen mit Form vorn und Strichen
    const zh = 58;
    s += `<rect x="4" y="4" width="${W - 8}" height="${n * zh + 12}" rx="14" fill="${HOLZ}" stroke="${HOLZ_KANTE}" stroke-width="3"/>`;
    d.sorten.forEach((so, k) => {
      const y = 10 + k * zh;
      let t = formPfad(so.form, 40, y + zh / 2, 17, FORM_FARBEN[so.farbe]);
      for (let b = 0; b * 5 < so.anzahl; b++) {
        const im = Math.min(5, so.anzahl - b * 5);
        const bx = 78 + b * 70;
        if (hell && b === 0) t += hilfeRahmen(bx - 8, y + 6, 58, zh - 12, 'teil', 10);
        for (let j = 0; j < Math.min(4, im); j++) t += `<path d="M${bx + j * 11} ${y + 14}V${y + zh - 14}" stroke="${TINTE}" stroke-width="4" stroke-linecap="round"/>`;
        if (im === 5) t += `<path d="M${bx - 5} ${y + zh - 18}L${bx + 39} ${y + 18}" stroke="${TINTE}" stroke-width="4" stroke-linecap="round"/>`;
      }
      s += ziel(k, 8, y, W - 16, zh, t, { gewaehlt: gi === k, blass: blassK === k });
    });
    return `<svg class="aufgabe-svg" viewBox="0 0 ${W} ${n * zh + 24}" role="group" aria-label="Strichliste">${s}</svg>`;
  }
  // Säulen oder Bildsäulen
  const fuss = 56;
  const links = d.art === 'saeulen' ? 40 : 14;
  const sb = (W - links - 14) / n;
  const einheit = d.art === 'bild' ? 34 : Math.min(17, 260 / d.achse);
  const hoehe = (d.art === 'bild' ? 6 : d.achse) * einheit;
  const oben = 18;
  const boden = oben + hoehe;
  s += `<rect x="4" y="4" width="${W - 8}" height="${boden + fuss}" rx="14" fill="${PAPIER}" stroke="${HOLZ_KANTE}" stroke-width="3"/>`;
  if (d.art === 'saeulen') {
    if (hell) s += hilfeRahmen(6, oben - 12, links - 2, hoehe + 24, 'teil', 10);
    for (let v = 0; v <= d.achse; v++) {
      const y = boden - v * einheit;
      const stark = v % 5 === 0;
      s += `<path d="M${links} ${y}H${W - 12}" stroke="${stark ? TINTE_LEISE : HOLZ_KANTE}" stroke-width="${stark ? 1.6 : 1}"/>`;
      if (stark || d.achse <= 10) s += `<text x="${links - 8}" y="${y + 6}" text-anchor="end" font-size="16" font-weight="800" fill="${TINTE}">${v}</text>`;
    }
  }
  d.sorten.forEach((so, k) => {
    const x = links + k * sb;
    const c = FORM_FARBEN[so.farbe];
    let t = '';
    if (d.art === 'bild') {
      for (let j = 0; j < so.anzahl; j++) t += formPfad(so.form, x + sb / 2, boden - j * einheit - einheit / 2, 13, c);
      if (hell) t += `<path data-hilfe="teil" d="M${x + 8} ${boden - so.anzahl * einheit - 2}H${x + sb - 8}" stroke="${LATERNE_KANTE}" stroke-width="5" stroke-linecap="round"/>`;
    } else {
      const h = so.anzahl * einheit;
      t += `<rect x="${x + sb * 0.2}" y="${boden - h}" width="${sb * 0.6}" height="${h}" rx="4" fill="${c}" stroke="${kanteZu(c)}" stroke-width="2"/>`;
    }
    t += formPfad(so.form, x + sb / 2, boden + fuss / 2, 16, c);
    s += ziel(k, x + 2, oben - 8, sb - 4, hoehe + fuss + 4, t, { gewaehlt: gi === k, blass: blassK === k });
  });
  s += `<path d="M${links} ${boden}H${W - 12}" stroke="${TINTE}" stroke-width="3"/>`;
  return `<svg class="aufgabe-svg" viewBox="0 0 ${W} ${boden + fuss + 10}" role="group" aria-label="Diagramm">${s}</svg>`;
}

export const DIAGRAMM: Format<Diagramm> = {
  id: 'diagramm',
  nr: 84,
  version: 1,
  bereich: 'zahlen',
  faehigkeit: 'Z9',
  motor: 'auswahl',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'wasAmMeisten',
  stufen: 3,
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'bild' }),
  wahl: (d) => d.sorten.map(als),
  zeichne,
  /** Lernbeispiel: (1) zwei Sorten, 1 und 4; (2) gewöhnliche Aufgabe der Stufe 1 aus dem Generator. */
  beispiele: () => [
    { art: 'bild', sorten: [{ form: 'kreis', farbe: 'rot', anzahl: 1 }, { form: 'stern', farbe: 'gelb', anzahl: 4 }], achse: 6 },
    aufgabeAus(DIAGRAMM, 0, 1).bedingung,
  ],
};
