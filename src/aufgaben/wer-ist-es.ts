import { FIGUR_TOKEN, FOKUS, FORM_FARBEN, HOLZ_KANTE, HOLZKNOPF, LATERNE, LATERNE_KANTE, PAPIER, SCHATTEN, STEIN, STEIN_KANTE, TINTE, WEISS, kanteZu, type FormFarbe } from '../design/farbe';
import type { Antwort } from '../perlen/antwort';
import type { Format, ZeichenOptionen } from './format';
import type { Zufall } from '../core/zufall';

/**
 * Wer ist es? (Auswahl): sechs Raupen mit Hut und Brille; Hinweis-Karten sagen, welche gemeint ist.
 * Stufe 1: ein Hinweis, immer bejaht (Hut einer Farbe oder Brille).
 * Stufe 2: schwerer wird die Zahl der Bedingungen – zwei Hinweise (ein Hut-, ein Brillen-Hinweis), jeder
 *          allein passt auf mehrere Raupen: beide müssen zugleich beachtet werden.
 * Stufe 3: schwerer wird die Art der Bedingung – zwei Hinweise, einer davon durchgestrichen („kein …“,
 *          „gar kein Hut“), also eine Verneinung.
 * Antwort = Nummer der Raupe. Der Löser zählt, welche Raupen zu ALLEN Hinweisen passen.
 *
 * Zeichen der Bedingungen (ein kleiner Satz, docs/TZ.md, „Интерфейс и надёжность“): Karte mit Hut in seiner
 * Farbe; Karte mit grauem Hut = irgendein Hut (nur durchgestrichen); Karte mit Brille; schräger Strich über
 * der Karte = „nicht“.
 *
 * Hilfe auf dem Bild (docs/TZ.md, „Помощь“): Stufe 2 hebt die erste Karte hervor, die übrigen gehen in den
 * Halbschatten; Stufe 3 lässt dazu die Raupen blass werden, die zur ersten Karte nicht passen – nur wenn
 * danach mehrere sichtbar bleiben (sonst `schrittVerraet`: der Schritt kommt an der ähnlichen Aufgabe).
 */
/** Hutfarben: eine Auswahl der Formfarben, damit sie dieselbe Farbprüfung bestehen wie die Palette */
export const HUT_FARBEN = ['rot', 'blau', 'gelb'] as const satisfies readonly FormFarbe[];
export type Hut = 'kein' | (typeof HUT_FARBEN)[number];
export interface Raupe {
  hut: Hut;
  brille: boolean;
}
export type Hinweis =
  | { art: 'hut'; farbe: Exclude<Hut, 'kein'>; nicht: boolean }
  /** irgendein Hut; nur durchgestrichen benutzt: „gar kein Hut“ */
  | { art: 'hut-da'; nicht: boolean }
  | { art: 'brille'; nicht: boolean };

export interface WerIstEs {
  raupen: Raupe[];
  hinweise: Hinweis[];
}

/** Farbe eines Hutes – immer aus den Formfarben, nie hier im Format festgelegt */
export function hutFarbe(h: Exclude<Hut, 'kein'>): string {
  return FORM_FARBEN[h];
}

export function passt(r: Raupe, h: Hinweis): boolean {
  const ja = h.art === 'hut' ? r.hut === h.farbe : h.art === 'hut-da' ? r.hut !== 'kein' : r.brille;
  return h.nicht ? !ja : ja;
}

function zufallsRaupe(z: Zufall): Raupe {
  return { hut: z.eins<Hut>(['kein', ...HUT_FARBEN]), brille: z.zahl() < 0.5 };
}

function hinweiseFuer(r: Raupe, z: Zufall, negativ: boolean): Hinweis[] {
  const moeglich: Hinweis[] = [];
  if (r.hut !== 'kein') moeglich.push({ art: 'hut', farbe: r.hut, nicht: false });
  if (r.brille) moeglich.push({ art: 'brille', nicht: false });
  if (negativ) {
    if (r.hut === 'kein') moeglich.push({ art: 'hut-da', nicht: true });
    if (!r.brille) moeglich.push({ art: 'brille', nicht: true });
    for (const f of HUT_FARBEN) if (r.hut !== f) moeglich.push({ art: 'hut', farbe: f, nicht: true });
  }
  return z.mischen(moeglich);
}

function erzeuge(z: Zufall, stufe: number): WerIstEs {
  for (;;) {
    const raupen = Array.from({ length: 6 }, () => zufallsRaupe(z));
    const ziel = z.ganz(0, 5);
    const k = hinweiseFuer(raupen[ziel], z, stufe === 3);
    if (stufe === 1) {
      const h = k.filter((x) => !x.nicht)[0];
      if (h) return { raupen, hinweise: [h] };
      continue;
    }
    for (let a = 0; a < k.length; a++)
      for (let b = a + 1; b < k.length; b++) {
        const hs = [k[a], k[b]];
        if (hs[0].art === hs[1].art || (hs[0].art !== 'brille' && hs[1].art !== 'brille')) continue; // ein Hut-, ein Brillen-Hinweis
        if (stufe === 3 && !hs.some((h) => h.nicht)) continue;
        if (stufe === 2 && hs.some((h) => h.nicht)) continue;
        // jeder Hinweis allein passt auf mehrere Raupen: beide werden gebraucht
        if (hs.some((h) => raupen.filter((r) => passt(r, h)).length < 2)) continue;
        return { raupen, hinweise: hs };
      }
  }
}

function loesungen(w: WerIstEs): Antwort[] {
  return w.raupen.flatMap((r, i) => (w.hinweise.every((h) => passt(r, h)) ? [{ art: 'zahl', wert: i + 1 } as Antwort] : []));
}

/** Hilfe Stufe 3 blendet die Raupen aus, die zum ersten Hinweis nicht passen – nur wenn danach mehrere übrig bleiben */
export function schrittVerraet(w: WerIstEs): boolean {
  return w.raupen.filter((r) => passt(r, w.hinweise[0])).length < 2;
}

/** Hut ohne Umriss: Krempe und Krone in der Farbe, Kante darunter; grau = irgendein Hut */
function hut(x: number, y: number, s: number, h: Hut, grau = false): string {
  if (h === 'kein') return '';
  const c = grau ? FIGUR_TOKEN['hut-grau'] : hutFarbe(h);
  const k = grau ? FIGUR_TOKEN['hut-grau-kante'] : kanteZu(c);
  return (
    `<ellipse cx="${x}" cy="${y + s * 0.07}" rx="${s * 1.05}" ry="${s * 0.24}" fill="${k}"/>` +
    `<path d="M${x - s * 0.6} ${y} Q${x - s * 0.62} ${y - s * 0.95} ${x} ${y - s * 0.95} Q${x + s * 0.62} ${y - s * 0.95} ${x + s * 0.6} ${y} Z" fill="${c}"/>` +
    `<path d="M${x - s * 0.6} ${y} Q${x} ${y + s * 0.12} ${x + s * 0.6} ${y} L${x + s * 0.58} ${y - s * 0.22} Q${x} ${y - s * 0.1} ${x - s * 0.58} ${y - s * 0.22} Z" fill="${k}"/>` +
    `<ellipse data-hut="" cx="${x}" cy="${y - s * 0.02}" rx="${s * 1.02}" ry="${s * 0.2}" fill="${c}"/>` +
    `<ellipse cx="${x - s * 0.26}" cy="${y - s * 0.66}" rx="${s * 0.16}" ry="${s * 0.09}" fill="${WEISS}" opacity="0.55" transform="rotate(-30 ${x - s * 0.26} ${y - s * 0.66})"/>`
  );
}

/** Brille: dunkle Fassung (ein Gegenstand, kein Umriss), leicht getöntes Glas */
function brille(x: number, y: number, s: number): string {
  const k = `fill="${WEISS}" fill-opacity=".4" stroke="${TINTE}" stroke-width="3"`;
  return `<circle cx="${x - s * 0.36}" cy="${y}" r="${s * 0.27}" ${k}/><circle cx="${x + s * 0.36}" cy="${y}" r="${s * 0.27}" ${k}/><path d="M${x - s * 0.09} ${y}h${s * 0.18}" stroke="${TINTE}" stroke-width="3"/>`;
}

/** kleine Raupe aus Samt (wie die Raupe auf dem Ast, ohne Kontur): zwei Segmente und Kopf */
function raupe(x: number, y: number, r: Raupe): string {
  const s = 25;
  const c = FIGUR_TOKEN.raupe;
  const k = FIGUR_TOKEN['raupe-kante'];
  const l = FIGUR_TOKEN['raupe-licht'];
  const kugel = (cx: number, cy: number, rr: number) =>
    `<circle cx="${cx}" cy="${cy + rr * 0.12}" r="${rr}" fill="${k}"/><circle cx="${cx}" cy="${cy}" r="${rr}" fill="${c}"/><ellipse cx="${cx - rr * 0.35}" cy="${cy - rr * 0.38}" rx="${rr * 0.42}" ry="${rr * 0.28}" fill="${l}" opacity="0.8"/>`;
  let t = kugel(x - 46, y + 9, 14) + kugel(x - 25, y + 6, 16);
  t += kugel(x, y, s);
  t += `<ellipse cx="${x - 8}" cy="${y - 2}" rx="4.6" ry="5.2" fill="${FIGUR_TOKEN.auge}"/><ellipse cx="${x + 8}" cy="${y - 2}" rx="4.6" ry="5.2" fill="${FIGUR_TOKEN.auge}"/>`;
  t += `<circle cx="${x - 7.5}" cy="${y - 1}" r="2.8" fill="${TINTE}"/><circle cx="${x + 8.5}" cy="${y - 1}" r="2.8" fill="${TINTE}"/>`;
  t += `<path d="M${x - 7} ${y + 10} Q${x} ${y + 15} ${x + 7} ${y + 10}" fill="none" stroke="${k}" stroke-width="2.8" stroke-linecap="round"/>`;
  if (r.brille) t += brille(x, y - 2, s);
  t += hut(x, y - s * 0.74, s, r.hut);
  return t;
}

/** Hinweis-Karte als Holzschild: Bild des Merkmals, durchgestrichen bei „kein …“; `hilfe`: hervorgehoben oder im Halbschatten */
function karte(x: number, y: number, h: Hinweis, hilfe: 'teil' | 'schatten' | null): string {
  const w = 92;
  const hh = 70;
  const hell = hilfe === 'teil';
  let t = `<g${hilfe ? ` data-hilfe="${hilfe}"` : ''}${hilfe === 'schatten' ? ' opacity="0.35"' : ''}>`;
  if (hell) t += `<rect x="${x - 5}" y="${y - 5}" width="${w + 10}" height="${hh + 14}" rx="18" fill="${LATERNE}" stroke="${LATERNE_KANTE}" stroke-width="3.5"/>`;
  t += `<rect x="${x}" y="${y + 4}" width="${w}" height="${hh}" rx="14" fill="${HOLZ_KANTE}"/>`;
  t += `<rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="14" fill="${HOLZKNOPF}"/>`;
  const cx = x + w / 2;
  const cy = y + hh / 2;
  if (h.art === 'brille') t += brille(cx, cy, 44);
  else t += hut(cx, cy + 14, 30, h.art === 'hut' ? h.farbe : 'rot', h.art === 'hut-da');
  if (h.nicht) t += `<path data-zeichen="nicht" d="M${x + 14} ${y + hh - 12}L${x + w - 14} ${y + 12}" stroke="${TINTE}" stroke-width="6" stroke-linecap="round"/>`;
  return t + '</g>';
}

const SPALTE = 120;
const ZEILE = 112;

/** Raupen, die nach Hilfe Stufe 3 blass sind: die nicht zur ersten Karte passen – an der eigenen Aufgabe nur, wenn mehrere bleiben */
export function blassNachSchritt(w: WerIstEs, aehnlich = false): boolean[] {
  if (!aehnlich && schrittVerraet(w)) return w.raupen.map(() => false);
  return w.raupen.map((r) => !passt(r, w.hinweise[0]));
}

/**
 * Fische aus Sandstein mit Kante (Engine Auswahl, docs/STIL.md, „Движки“). Gewählt: sie hebt sich um 4 und
 * bekommt die doppelte Linie (Papiersaum innen, --fokus außen); ihre Größe ändert sich nicht.
 */
function fische(x: number, y: number, gewaehlt: boolean, inhalt: string, nr: number): string {
  const w = 108;
  const h = 102;
  const hub = gewaehlt ? -4 : 0;
  let t = `<rect x="${x + 2}" y="${y + 7}" width="${w}" height="${h}" rx="18" fill="${SCHATTEN}" opacity="${gewaehlt ? 0.8 : 0.5}"/>`;
  t += `<g transform="translate(0 ${hub})"${gewaehlt ? ' data-inhalt=""' : ''}>`;
  t += `<rect x="${x}" y="${y + 4}" width="${w}" height="${h}" rx="18" fill="${STEIN_KANTE}"/>`;
  t += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="${STEIN}"/>`;
  t += `<rect x="${x + 10}" y="${y + 4}" width="${w - 20}" height="4" rx="2" fill="${WEISS}" opacity="0.45"/>`;
  if (gewaehlt) {
    t += `<rect x="${x - 2}" y="${y - 2}" width="${w + 4}" height="${h + 10}" rx="20" fill="none" stroke="${PAPIER}" stroke-width="4"/>`;
    t += `<rect x="${x - 6.5}" y="${y - 6.5}" width="${w + 13}" height="${h + 19}" rx="24" fill="none" stroke="${FOKUS}" stroke-width="5"/>`;
  }
  t += inhalt;
  t += `<text x="${x + 18}" y="${y + 30}" text-anchor="middle" font-size="22" font-weight="800" fill="${TINTE}">${nr}</text>`;
  return t + '</g>';
}

/**
 * `hilfe` 2: erste Karte hervorgehoben (data-hilfe="teil"), die anderen im Halbschatten.
 * `hilfe` 3: dazu werden die Raupen blass, die zur ersten Karte nicht passen (data-hilfe="schritt") –
 * an der eigenen Aufgabe nur, wenn danach mindestens zwei sichtbar bleiben; an der ähnlichen (`aehnlich`) immer.
 * `vorrechnen`: alle Karten hervorgehoben, nur die Lösung bleibt sichtbar und ist umrahmt.
 */
function zeichne(w: WerIstEs, o: ZeichenOptionen): string {
  const W = 3 * SPALTE + 20;
  const kartenH = 92;
  const H = kartenH + 2 * ZEILE + 18;
  let s = '';
  const kx = (W - w.hinweise.length * 104 + 12) / 2;
  w.hinweise.forEach((h, i) => {
    const hilfe = o.vorrechnen ? 'teil' : o.hilfe >= 2 ? (i === 0 ? 'teil' : 'schatten') : null;
    s += karte(kx + i * 104, 8, h, hilfe);
  });
  const ziel = loesungen(w)[0];
  const schritt = o.hilfe >= 3 && !o.vorrechnen ? blassNachSchritt(w, !!o.aehnlich) : w.raupen.map(() => false);
  w.raupen.forEach((r, i) => {
    const cx = 10 + (i % 3) * SPALTE + SPALTE / 2 + 22;
    const cy = kartenH + Math.floor(i / 3) * ZEILE + 58;
    const blass = schritt[i] || (!!o.vorrechnen && !w.hinweise.every((h) => passt(r, h)));
    const gewaehlt = o.gewaehlt?.art === 'zahl' && o.gewaehlt.wert === i + 1;
    const loesung = !!o.vorrechnen && ziel?.art === 'zahl' && ziel.wert === i + 1;
    s += `<g class="wahl-ziel" data-wahl="${i}" role="button" tabindex="0" aria-label="Raupe ${i + 1}" opacity="${blass ? 0.25 : 1}"${schritt[i] ? ' data-hilfe="schritt"' : ''}>`;
    s += fische(cx - 76, cy - 53, gewaehlt || loesung, raupe(cx + 2, cy + 6, r), i + 1);
    s += `</g>`;
  });
  return `<svg class="aufgabe-svg" viewBox="0 0 ${W} ${H}" role="group" aria-label="Wer ist es?">${s}</svg>`;
}

export const WER_IST_ES: Format<WerIstEs> = {
  id: 'wer-ist-es',
  nr: 29,
  version: 1,
  bereich: 'logik',
  faehigkeit: 'L2',
  motor: 'auswahl',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'werIstEs',
  stufen: 3,
  /** hängt nicht vom Zahlenraum ab: liest die Einstellung nicht */
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'bild' }),
  wahl: () => Array.from({ length: 6 }, (_, i) => ({ art: 'zahl', wert: i + 1 }) as Antwort),
  zeichne,
  schrittVerraet,
  /**
   * Lernbeispiel: immer ein Hut-Hinweis; es wächst die Zahl der anderen Raupen mit Hut, die man
   * ausschließen muss: (1) nur eine Raupe hat überhaupt einen Hut; (2) drei Hüte in drei Farben;
   * (3) gewöhnliche Aufgabe der Stufe 1 – vier Hüte, Brillen dazwischen.
   */
  beispiele: () => {
    const r = (hut: Hut, brille = false): Raupe => ({ hut, brille });
    return [
      { raupen: [r('kein'), r('kein'), r('rot'), r('kein'), r('kein'), r('kein')], hinweise: [{ art: 'hut', farbe: 'rot', nicht: false }] },
      {
        raupen: [r('kein'), r('rot'), r('kein', true), r('blau'), r('kein'), r('gelb', true)],
        hinweise: [{ art: 'hut', farbe: 'blau', nicht: false }],
      },
      {
        raupen: [r('rot', true), r('kein'), r('blau', true), r('gelb'), r('rot'), r('kein', true)],
        hinweise: [{ art: 'hut', farbe: 'gelb', nicht: false }],
      },
    ];
  },
};
