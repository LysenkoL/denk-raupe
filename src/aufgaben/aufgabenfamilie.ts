import type { Antwort, Rechenzeichen } from '../perlen/antwort';
import { ausdruck } from '../perlen/perle';
import type { Zufall } from '../core/zufall';
import { aufgabeAus, type Einstellung, type Format, type ZeichenOptionen, type Zahlenraum } from './format';
import { FIGUR_TOKEN, TINTE, TINTE_LEISE } from '../design/farbe';
import { hilfeRahmen, kleinerRaum, schild, svgHuelle } from './zaehlen';
import { nest as mulde } from './bildteile';

/**
 * Aufgabenfamilie (Nr. 89, Engine Bild, Antwort Wahl): auf dem Schild steht eine Aufgabe (3 + 7 = 10). Welche Aufgabe
 * gehört zu ihrer Familie? Zur Familie gehören die Aufgaben aus denselben drei Zahlen: 3 + 7, 7 + 3, 10 − 3, 10 − 7
 * (beim Malnehmen 3 · 5, 5 · 3, 15 : 3, 15 : 5). Unter den Perlen ist genau eine aus der Familie; die anderen sind aus
 * anderen Zahlen oder mit anderem Zeichen gebaut.
 * Stufe 1: Plusaufgabe bis 10 (bei Zahlenraum 100 bis 20), gesucht die Tauschaufgabe (7 + 3); drei Perlen.
 * Stufe 2: schwerer wird die Art – Plusaufgabe im Zahlenraum, gesucht die Umkehraufgabe (10 − 7 oder 10 − 3); vier Perlen,
 *          darunter dieselben Zahlen mit falschem Zeichen (10 + 3).
 * Stufe 3: schwerer wird der Anfang – auf dem Schild steht eine Minusaufgabe, gesucht ein Familienmitglied; bei
 *          Zahlenraum 100 auch Mal- und Geteiltaufgaben (Einmaleins, 2. Klasse); vier Perlen.
 * Die Perlen gehören zur Aufgabe (wie die Raupen bei Wer ist es?): der Löser nimmt die Perlen, die zur Familie der
 * Aufgabe auf dem Schild gehören, ohne die Aufgabe selbst. Genau eine muss es sein.
 *
 * Hilfe auf dem Bild: Stufe 2 hebt das Schild mit der Aufgabe hervor;
 * Stufe 3 legt dazu einen Ring um jede der drei Zahlen – „aus diesen Zahlen ist jede Aufgabe gebaut“.
 * Das verrät die Lösung nicht: es bleibt zu prüfen, welche Perle nur diese Zahlen benutzt und richtig rechnet.
 */
export interface Rechnung {
  links: number;
  zeichen: Rechenzeichen;
  rechts: number;
}
export interface Aufgabenfamilie {
  /** Aufgabe auf dem Schild (mit Ergebnis) */
  aufgabe: Rechnung;
  /** Perlen zur Wahl, in fester Reihenfolge */
  perlen: Rechnung[];
}

export const als = (r: Rechnung): Antwort => ({ art: 'ausdruck', links: r.links, zeichen: r.zeichen, rechts: r.rechts });

/** Ergebnis einer Rechnung oder null, wenn sie im Bereich der natürlichen Zahlen nicht aufgeht */
export function ergebnis(r: Rechnung): number | null {
  switch (r.zeichen) {
    case 'plus':
      return r.links + r.rechts;
    case 'minus':
      return r.links >= r.rechts ? r.links - r.rechts : null;
    case 'mal':
      return r.links * r.rechts;
    case 'geteilt':
      return r.rechts > 0 && r.links % r.rechts === 0 ? r.links / r.rechts : null;
  }
}

/** die vier Aufgaben der Familie (Plus/Minus oder Mal/Geteilt) zu a ∘ b = c */
export function familie(r: Rechnung): Rechnung[] {
  const c = ergebnis(r);
  if (c === null) return [];
  let [a, b, ganz] = [r.links, r.rechts, c];
  if (r.zeichen === 'minus' || r.zeichen === 'geteilt') [a, b, ganz] = [c, r.rechts, r.links];
  const punkt = r.zeichen === 'mal' || r.zeichen === 'geteilt';
  const [auf, ab]: Rechenzeichen[] = punkt ? ['mal', 'geteilt'] : ['plus', 'minus'];
  const alle: Rechnung[] = [
    { links: a, zeichen: auf, rechts: b },
    { links: b, zeichen: auf, rechts: a },
    { links: ganz, zeichen: ab, rechts: a },
    { links: ganz, zeichen: ab, rechts: b },
  ];
  // nur Aufgaben, die aufgehen (geteilt durch 0 gibt es nicht)
  return alle.filter((x) => ergebnis(x) !== null);
}

const gleicheRechnung = (x: Rechnung, y: Rechnung) => x.links === y.links && x.zeichen === y.zeichen && x.rechts === y.rechts;

/** Löser: Perlen aus der Familie der Aufgabe auf dem Schild, ohne die Aufgabe selbst */
function loesungen(f: Aufgabenfamilie): Antwort[] {
  const fam = familie(f.aufgabe).filter((x) => !gleicheRechnung(x, f.aufgabe));
  return f.perlen.filter((p) => fam.some((x) => gleicheRechnung(x, p))).map(als);
}

/** Nachbar-Aufgaben, die nicht zur Familie gehören: ein Zeichen falsch, eine Zahl daneben, andere Zahlen */
export function falsche(r: Rechnung, z: Zufall, grenze: number): Rechnung[] {
  const c = ergebnis(r)!;
  const fam = familie(r);
  const [a, b] = r.zeichen === 'minus' || r.zeichen === 'geteilt' ? [c, r.rechts] : [r.links, r.rechts];
  const ganz = r.zeichen === 'minus' || r.zeichen === 'geteilt' ? r.links : c;
  const punkt = r.zeichen === 'mal' || r.zeichen === 'geteilt';
  const [auf, ab]: Rechenzeichen[] = punkt ? ['mal', 'geteilt'] : ['plus', 'minus'];
  const d = z.eins([1, 2]);
  const kandidaten: Rechnung[] = [
    { links: ganz, zeichen: auf, rechts: a },
    { links: ganz, zeichen: auf, rechts: b },
    { links: a, zeichen: ab, rechts: b },
    { links: b, zeichen: ab, rechts: a },
    { links: b + d, zeichen: auf, rechts: a },
    { links: b, zeichen: auf, rechts: a + d },
    { links: ganz, zeichen: ab, rechts: a + d },
    { links: ganz + d, zeichen: ab, rechts: b },
    { links: b - d, zeichen: auf, rechts: a },
    { links: ganz - d, zeichen: ab, rechts: a },
  ];
  return z
    .mischen(kandidaten)
    .filter((x) => x.links >= 0 && x.rechts >= 0 && x.links <= grenze && x.rechts <= grenze)
    .filter((x) => {
      const e = ergebnis(x);
      return e !== null && e <= grenze && !(punkt && x.rechts === 0);
    })
    .filter((x) => !fam.some((y) => gleicheRechnung(x, y)));
}

/** Perlen: die gesuchte und so viele falsche, dass es `anzahl` verschiedene sind */
function perlenMit(richtig: Rechnung, r: Rechnung, z: Zufall, grenze: number, anzahl: number): Rechnung[] | null {
  const out = [richtig];
  for (const k of falsche(r, z, grenze)) if (out.length < anzahl && !out.some((o) => gleicheRechnung(o, k))) out.push(k);
  return out.length === anzahl ? z.mischen(out) : null;
}

function erzeuge(z: Zufall, stufe: number, e: Einstellung): Aufgabenfamilie {
  const zr: Zahlenraum = e.zahlenraum;
  const grenze = stufe === 1 ? kleinerRaum(zr) : zr;
  for (;;) {
    const mal = stufe === 3 && zr === 100 && z.zahl() < 0.5;
    let aufgabe: Rechnung;
    if (mal) {
      const [a, b] = [z.ganz(2, 10), z.ganz(2, 10)];
      if (a === b) continue;
      aufgabe = z.zahl() < 0.5 ? { links: a, zeichen: 'mal', rechts: b } : { links: a * b, zeichen: 'geteilt', rechts: b };
    } else {
      const c = z.ganz(stufe === 1 ? 3 : 5, grenze);
      const a = z.ganz(1, c - 1);
      const b = c - a;
      if (a === b) continue;
      aufgabe = stufe === 3 ? { links: c, zeichen: 'minus', rechts: z.eins([a, b]) } : { links: a, zeichen: 'plus', rechts: b };
    }
    const fam = familie(aufgabe).filter((x) => !gleicheRechnung(x, aufgabe));
    let gesucht: Rechnung;
    if (stufe === 1) gesucht = fam.find((x) => x.zeichen === aufgabe.zeichen)!;
    else if (stufe === 2) gesucht = z.eins(fam.filter((x) => x.zeichen !== aufgabe.zeichen));
    else gesucht = z.eins(fam);
    const perlen = perlenMit(gesucht, aufgabe, z, grenze, stufe === 1 ? 3 : 4);
    if (perlen) return { aufgabe, perlen };
  }
}

/* ---------- Bild ---------- */

const ZEICHEN: Record<Rechenzeichen, string> = { plus: '+', minus: '−', mal: '·', geteilt: ':' };

/**
 * Rechnung mit Ergebnis (3 + 7 = 10) als einzelne Zeichen, mittig bei cx: Zahlen und Zeichen mit fester Breite
 * je Ziffer, damit die Hilfe Ringe um die Zahlen legen kann. Gibt die Mitten und Breiten der drei Zahlen zurück.
 */
function zeile(r: Rechnung, cx: number, y: number, g = 34): { svg: string; zahlen: { x: number; w: number }[] } {
  const c = ergebnis(r)!;
  const teile: (number | string)[] = [r.links, ZEICHEN[r.zeichen], r.rechts, '=', c];
  const breite = (t: number | string) => (typeof t === 'number' ? String(t).length * g * 0.64 : g * 0.62);
  const luecke = g * 0.32;
  const gesamt = teile.reduce<number>((a, t) => a + breite(t), 0) + luecke * (teile.length - 1);
  let x = cx - gesamt / 2;
  let svg = '';
  const zahlen: { x: number; w: number }[] = [];
  for (const t of teile) {
    const w = breite(t);
    svg += `<text x="${(x + w / 2).toFixed(1)}" y="${y}" text-anchor="middle" font-size="${g}" font-weight="800" fill="${TINTE}">${t}</text>`;
    if (typeof t === 'number') zahlen.push({ x: x + w / 2, w });
    x += w + luecke;
  }
  return { svg, zahlen };
}

/** Nest für eine Rechnung: „?“ oder die gewählte Rechnung (data-inhalt), gleich, ob sie stimmt */
export function rechnungsNest(x: number, y: number, w: number, a: Antwort | null | undefined, loesung = false): string {
  let t = mulde(x, y, w, 58);
  if (a?.art === 'ausdruck') t += `<g${loesung ? '' : ' data-inhalt=""'}><text x="${x + w / 2}" y="${y + 40}" text-anchor="middle" font-size="28" font-weight="800" fill="${TINTE}">${ausdruck(a.links, a.zeichen, a.rechts)}</text></g>`;
  else t += `<text x="${x + w / 2}" y="${y + 40}" text-anchor="middle" font-size="30" font-weight="800" fill="${TINTE_LEISE}">?</text>`;
  return t;
}

/**
 * Schild mit der Aufgabe, darunter das Nest. `hilfe` 2: Schild warm umrahmt; 3: dazu ein Ring um jede der drei Zahlen –
 * „aus diesen Zahlen ist jede Aufgabe der Familie gebaut“ (keine neue Zahl im Bild). `vorrechnen`: im Nest die Lösung.
 */
function zeichne(f: Aufgabenfamilie, o: ZeichenOptionen): string {
  const W = 300;
  let s = '';
  if (o.hilfe >= 2 || o.vorrechnen) s += hilfeRahmen(14, 4, W - 28, 80, 'teil');
  s += schild(20, 10, W - 40, 64);
  const z = zeile(f.aufgabe, W / 2, 52);
  if (o.hilfe >= 3 && !o.vorrechnen)
    s += `<g data-hilfe="schritt">${z.zahlen.map((n) => `<rect x="${(n.x - n.w / 2 - 7).toFixed(1)}" y="20" width="${(n.w + 14).toFixed(1)}" height="44" rx="14" fill="${FIGUR_TOKEN.nest}" stroke="${FIGUR_TOKEN['ast-kante']}" stroke-width="3"/>`).join('')}</g>`;
  s += z.svg;
  const y = 96;
  const loesung = o.vorrechnen ? loesungen(f)[0] : null;
  s += rechnungsNest(W / 2 - 80, y, 160, loesung ?? o.gewaehlt, !!loesung);
  return svgHuelle(W, y + 70, 'Aufgabenfamilie', s);
}

export const AUFGABENFAMILIE: Format<Aufgabenfamilie> = {
  id: 'aufgabenfamilie',
  nr: 89,
  version: 1,
  bereich: 'zahlen',
  faehigkeit: 'Z4',
  motor: 'bild',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'welcheAufgabeFamilie',
  stufen: 3,
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'wahl' }),
  wahl: (f) => f.perlen.map(als),
  zeichne,
  /**
   * Lernbeispiel: (1) 1 + 2 = 3 – Tauschaufgabe unter ganz anderen Zahlen; (2) 2 + 5 = 7 – Tauschaufgabe, eine falsche
   * mit gleichen Zahlen und anderem Zeichen; (3) gewöhnliche Aufgabe der Stufe 1 (aus dem Generator).
   */
  beispiele: () => {
    const r = (links: number, zeichen: Rechenzeichen, rechts: number): Rechnung => ({ links, zeichen, rechts });
    return [
      { aufgabe: r(1, 'plus', 2), perlen: [r(5, 'plus', 4), r(2, 'plus', 1)] },
      { aufgabe: r(2, 'plus', 5), perlen: [r(5, 'plus', 2), r(7, 'plus', 2), r(6, 'plus', 2)] },
      dritte(),
    ];
  },
};

/** dritter Schritt des Lernbeispiels: erste Aufgabe der Stufe 1 aus dem Generator (Samen wie im Test) mit Ergebnis über 7 */
function dritte(): Aufgabenfamilie {
  for (let s = 0; ; s++) {
    const a = aufgabeAus(AUFGABENFAMILIE, s * 2654435761, 1).bedingung;
    if ((ergebnis(a.aufgabe) ?? 0) > 7) return a;
  }
}
