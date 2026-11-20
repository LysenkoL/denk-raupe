import type { Antwort, Form } from '../perlen/antwort';
import { gleich } from '../perlen/antwort';
import type { Zufall } from '../core/zufall';
import { aufgabeAus, type Format, type ZeichenOptionen } from './format';
import { FOKUS, TINTE_LEISE, type FormFarbe } from '../design/farbe';
import { hilfeRahmen, schild, svgHuelle } from './zaehlen';
import { nest as mulde } from './bildteile';
import { FARBEN, FORMEN, ZELLE, formIm, stein, text, type Element } from './plan';

/**
 * Geheimschrift (Nr. 59, Engine Bild, Antwort Wahl): auf dem Schlüssel-Brett steht unter jedem Zeichen ein Buchstabe.
 * Darunter eine Geheimschrift aus Zeichen; ein Zeichen ist markiert – welcher Buchstabe ist es?
 * Zeichen sind die Formen der Aufgaben (Form und Farbe), Buchstaben groß, ohne leicht verwechselbare (I/J, C/G, V/W …).
 * Stufe 1: drei Paare im Schlüssel, ganz verschiedene Formen; die Geheimschrift ist ein einziges Zeichen; drei Perlen.
 * Stufe 2: schwerer wird die Menge – fünf Paare, die Geheimschrift hat 3–4 Zeichen, eins ist markiert; vier Perlen.
 * Stufe 3: schwerer wird die Ähnlichkeit – 6–8 Paare, dieselbe Form kommt in zwei oder drei Farben vor; 4–5 Zeichen;
 *          vier Perlen, darunter der Buchstabe des ähnlichen Zeichens.
 * Der Löser sucht das markierte Zeichen im Schlüssel (Form UND Farbe): kommt es dort nicht vor, gibt es keine Lösung;
 * kommt es zweimal mit verschiedenen Buchstaben vor, mehrere.
 *
 * Hilfe auf dem Bild: Stufe 2 hebt das markierte Zeichen und das Schlüssel-Brett hervor; Stufe 3 lässt im Schlüssel die
 * Zeichen anderer Form blass werden – übrig bleiben die gleicher Form (Farbe vergleicht das Kind selbst). Bleibt nur
 * eins übrig, verrät das die Lösung – dann zeigt die Hilfe den Schritt an der ähnlichen Aufgabe (`schrittVerraet`).
 */
export interface Paar {
  zeichen: Element;
  buchstabe: string;
}
export interface Geheimschrift {
  schluessel: Paar[];
  schrift: Element[];
  /** markierte Stelle in der Geheimschrift */
  stelle: number;
}

/** Buchstaben ohne leicht verwechselbare Paare (I/J/L, C/G, V/W/Y, Q/O, X) */
export const BUCHSTABEN = ['A', 'B', 'D', 'E', 'F', 'H', 'K', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'U', 'Z'];

const gleichesZeichen = (a: Element, b: Element) => a.form === b.form && a.farbe === b.farbe;
const buchstabe = (wert: string): Antwort => ({ art: 'buchstabe', wert });

function loesungen(g: Geheimschrift): Antwort[] {
  const ziel = g.schrift[g.stelle];
  if (!ziel) return [];
  const treffer = [...new Set(g.schluessel.filter((p) => gleichesZeichen(p.zeichen, ziel)).map((p) => p.buchstabe))];
  return treffer.map(buchstabe);
}

/** Zeichen für den Schlüssel: verschiedene Formen (Stufe 1–2) oder Gruppen gleicher Form in mehreren Farben (Stufe 3) */
function zeichenFuer(z: Zufall, n: number, aehnlich: boolean): Element[] {
  if (!aehnlich) {
    const formen = z.mischen(FORMEN).slice(0, n);
    return formen.map((form) => ({ form, farbe: z.eins(FARBEN) }));
  }
  const out: Element[] = [];
  for (const form of z.mischen(FORMEN)) {
    const farben = z.mischen(FARBEN).slice(0, z.ganz(2, 3));
    for (const farbe of farben) if (out.length < n) out.push({ form, farbe });
    if (out.length >= n) break;
  }
  return z.mischen(out);
}

function erzeuge(z: Zufall, stufe: number): Geheimschrift {
  const n = stufe === 1 ? 3 : stufe === 2 ? 5 : z.ganz(6, 8);
  const zeichen = zeichenFuer(z, n, stufe === 3);
  const buchstaben = z.mischen(BUCHSTABEN).slice(0, n);
  const schluessel = zeichen.map((zeichen, k) => ({ zeichen, buchstabe: buchstaben[k] }));
  const laenge = stufe === 1 ? 1 : stufe === 2 ? z.ganz(3, 4) : z.ganz(4, 5);
  const schrift = Array.from({ length: laenge }, () => z.eins(zeichen));
  const stelle = z.ganz(0, laenge - 1);
  // auf Stufe 3 hat das markierte Zeichen immer einen Zwilling gleicher Form im Schlüssel
  if (stufe === 3 && zeichen.filter((e) => e.form === schrift[stelle].form).length < 2) schrift[stelle] = zeichen.find((e) => zeichen.filter((x) => x.form === e.form).length >= 2)!;
  return { schluessel, schrift, stelle };
}

/** Wahl: Lösung; Buchstaben ähnlicher Zeichen (gleiche Form); Buchstaben der Nachbarn in der Schrift; andere im Schlüssel */
function wahl(g: Geheimschrift, z: Zufall): Antwort[] {
  const l = loesungen(g)[0];
  const ziel = g.schrift[g.stelle];
  const anzahl = g.schluessel.length <= 3 ? 3 : 4;
  const aehnlich = g.schluessel.filter((p) => p.zeichen.form === ziel.form && !gleichesZeichen(p.zeichen, ziel)).map((p) => p.buchstabe);
  const nachbarn = [g.schrift[g.stelle - 1], g.schrift[g.stelle + 1]].filter((e): e is Element => !!e).map((e) => g.schluessel.find((p) => gleichesZeichen(p.zeichen, e))!.buchstabe);
  const kandidaten = [...aehnlich, ...nachbarn, ...z.mischen(g.schluessel.map((p) => p.buchstabe)), ...z.mischen(BUCHSTABEN)];
  const out: Antwort[] = [l];
  for (const k of kandidaten) if (out.length < anzahl && !out.some((o) => gleich(o, buchstabe(k)))) out.push(buchstabe(k));
  return z.mischen(out);
}

const schrittVerraet = (g: Geheimschrift) => g.schluessel.filter((p) => p.zeichen.form === g.schrift[g.stelle].form).length < 2;

/* ---------- Bild ---------- */

const SP = 58;

/**
 * Schlüssel-Brett oben (Zeichen über Buchstabe, höchstens vier je Reihe), darunter die Geheimschrift auf Steinen; unter dem
 * markierten Stein das Nest. `hilfe` 2: markierter Stein und Schlüssel hervorgehoben; 3: Zeichen anderer Form blass.
 * `vorrechnen`: dazu der passende Schlüssel umrahmt, im Nest der Buchstabe.
 */
function zeichne(g: Geheimschrift, o: ZeichenOptionen): string {
  const je = Math.min(4, g.schluessel.length);
  const reihen = Math.ceil(g.schluessel.length / je);
  const brettB = je * SP + 16;
  const W = Math.max(brettB + 16, g.schrift.length * ZELLE + 16, 200);
  const bx = (W - brettB) / 2;
  const brettH = reihen * 96 + 8;
  const ziel = g.schrift[g.stelle];
  const blass = (o.hilfe >= 3 && (o.aehnlich || !schrittVerraet(g))) || !!o.vorrechnen;
  let s = '';
  if (o.hilfe >= 2 || o.vorrechnen) s += hilfeRahmen(bx - 6, 0, brettB + 12, brettH + 14, 'teil');
  s += schild(bx, 4, brettB, brettH);
  g.schluessel.forEach((p, k) => {
    const cx = bx + 8 + (k % je) * SP + SP / 2;
    const cy = 4 + 10 + Math.floor(k / je) * 96;
    const weg = blass && p.zeichen.form !== ziel.form;
    const treffer = !!o.vorrechnen && gleichesZeichen(p.zeichen, ziel);
    let t = '';
    if (treffer) t += hilfeRahmen(cx - SP / 2 + 3, cy - 4, SP - 6, 90, 'teil', 12);
    t += formIm(cx, cy + 22, p.zeichen, 18);
    t += text(cx, cy + 66, p.buchstabe, 28);
    s += weg ? `<g data-hilfe="${o.vorrechnen ? 'teil' : 'schritt'}" opacity="0.25">${t}</g>` : t;
  });
  // Geheimschrift
  const y0 = brettH + 30;
  const x0 = (W - g.schrift.length * ZELLE + 6) / 2;
  g.schrift.forEach((e, k) => {
    const x = x0 + k * ZELLE;
    if (k === g.stelle) {
      if (o.hilfe >= 2 || o.vorrechnen) s += hilfeRahmen(x - 6, y0 - 6, ZELLE + 6, ZELLE + 6, 'teil');
      s += `<rect x="${x - 4}" y="${y0 - 4}" width="${ZELLE - 6 + 8}" height="${ZELLE - 6 + 10}" rx="13" fill="none" stroke="${FOKUS}" stroke-width="4"/>`;
    }
    s += stein(x, y0, ZELLE - 6, ZELLE - 6) + formIm(x + ZELLE / 2 - 3, y0 + ZELLE / 2 - 3, e, 18);
  });
  // Nest unter dem markierten Zeichen
  const nx = Math.min(Math.max(x0 + g.stelle * ZELLE + ZELLE / 2 - 3 - 31, 4), W - 66);
  const ny = y0 + ZELLE + 14;
  s += `<path d="M${x0 + g.stelle * ZELLE + ZELLE / 2 - 3} ${y0 + ZELLE + 2}V${ny + 2}" stroke="${FOKUS}" stroke-width="4"/>`;
  s += mulde(nx, ny, 62, 58);
  const a = o.vorrechnen ? loesungen(g)[0] : o.gewaehlt;
  if (a?.art === 'buchstabe') s += `<g${o.vorrechnen ? '' : ' data-inhalt=""'}>${text(nx + 31, ny + 29, a.wert, 32)}</g>`;
  else s += text(nx + 31, ny + 29, '?', 30, TINTE_LEISE);
  return svgHuelle(W, ny + 70, 'Geheimschrift', s);
}

export const GEHEIMSCHRIFT: Format<Geheimschrift> = {
  id: 'geheimschrift',
  nr: 59,
  version: 1,
  bereich: 'woerter',
  faehigkeit: 'W1',
  motor: 'bild',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'welcherBuchstabe',
  stufen: 3,
  /** hängt nicht vom Zahlenraum ab: liest die Einstellung nicht */
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'wahl' }),
  wahl,
  zeichne,
  schrittVerraet,
  /** Lernbeispiel: (1) zwei Paare, ein Zeichen; (2) gewöhnliche Aufgabe der Stufe 1 aus dem Generator (drei Paare). */
  beispiele: () => {
    const e = (form: Form, farbe: FormFarbe): Element => ({ form, farbe });
    const zwei = [{ zeichen: e('kreis', 'rot'), buchstabe: 'A' }, { zeichen: e('stern', 'blau'), buchstabe: 'O' }];
    return [{ schluessel: zwei, schrift: [e('kreis', 'rot')], stelle: 0 }, aufgabeAus(GEHEIMSCHRIFT, 0, 1).bedingung];
  },
};
