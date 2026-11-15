import type { Antwort } from '../perlen/antwort';
import type { Format } from './format';
import type { Zufall } from '../core/zufall';

/**
 * Wer ist es? (Auswahl): sechs Raupen mit Hut und Brille; Hinweis-Karten sagen, welche gemeint ist.
 * Stufe 1: ein Hinweis. Stufe 2: zwei Hinweise, jeder allein passt auf mehrere.
 * Stufe 3: zwei Hinweise, einer davon durchgestrichen („kein …“).
 * Antwort = Nummer der Raupe. Der Löser zählt, welche Raupen zu ALLEN Hinweisen passen.
 */
export type Hut = 'kein' | 'rot' | 'blau' | 'gelb';
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

const HUT_FARBE: Record<Exclude<Hut, 'kein'>, string> = { rot: '#E53935', blau: '#3A86FF', gelb: '#FFD23F' };

export function passt(r: Raupe, h: Hinweis): boolean {
  const ja = h.art === 'hut' ? r.hut === h.farbe : h.art === 'hut-da' ? r.hut !== 'kein' : r.brille;
  return h.nicht ? !ja : ja;
}

function zufallsRaupe(z: Zufall): Raupe {
  return { hut: z.eins<Hut>(['kein', 'rot', 'blau', 'gelb']), brille: z.zahl() < 0.5 };
}

function hinweiseFuer(r: Raupe, z: Zufall, negativ: boolean): Hinweis[] {
  const moeglich: Hinweis[] = [];
  if (r.hut !== 'kein') moeglich.push({ art: 'hut', farbe: r.hut, nicht: false });
  if (r.brille) moeglich.push({ art: 'brille', nicht: false });
  if (negativ) {
    if (r.hut === 'kein') moeglich.push({ art: 'hut-da', nicht: true });
    if (!r.brille) moeglich.push({ art: 'brille', nicht: true });
    for (const f of ['rot', 'blau', 'gelb'] as const) if (r.hut !== f) moeglich.push({ art: 'hut', farbe: f, nicht: true });
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

function hut(x: number, y: number, s: number, h: Hut, grau = false): string {
  if (h === 'kein') return '';
  const c = grau ? '#B8C2BC' : HUT_FARBE[h];
  return (
    `<ellipse cx="${x}" cy="${y}" rx="${s * 1.05}" ry="${s * 0.22}" fill="${c}" stroke="#1B2033" stroke-width="2.5"/>` +
    `<path d="M${x - s * 0.62} ${y} Q${x - s * 0.62} ${y - s * 0.95} ${x} ${y - s * 0.95} Q${x + s * 0.62} ${y - s * 0.95} ${x + s * 0.62} ${y} Z" fill="${c}" stroke="#1B2033" stroke-width="2.5" stroke-linejoin="round"/>`
  );
}

function brille(x: number, y: number, s: number): string {
  const k = `fill="#FFFFFF" fill-opacity=".35" stroke="#1B2033" stroke-width="2.6"`;
  return `<circle cx="${x - s * 0.36}" cy="${y}" r="${s * 0.27}" ${k}/><circle cx="${x + s * 0.36}" cy="${y}" r="${s * 0.27}" ${k}/><path d="M${x - s * 0.09} ${y}h${s * 0.18}" stroke="#1B2033" stroke-width="2.6"/>`;
}

/** kleine Raupe: zwei Perlen und Kopf */
function raupe(x: number, y: number, r: Raupe): string {
  const s = 26;
  let t = '';
  for (const dx of [-46, -24]) t += `<circle cx="${x + dx}" cy="${y + 8}" r="15" fill="#8BD13B" stroke="#1B2033" stroke-width="2.5"/>`;
  t += `<circle cx="${x}" cy="${y}" r="${s}" fill="#8BD13B" stroke="#1B2033" stroke-width="3"/>`;
  t += `<circle cx="${x - 9}" cy="${y - 3}" r="4" fill="#1B2033"/><circle cx="${x + 9}" cy="${y - 3}" r="4" fill="#1B2033"/>`;
  t += `<path d="M${x - 8} ${y + 10} Q${x} ${y + 16} ${x + 8} ${y + 10}" fill="none" stroke="#1B2033" stroke-width="2.5" stroke-linecap="round"/>`;
  if (r.brille) t += brille(x, y - 3, s);
  t += hut(x, y - s * 0.78, s, r.hut);
  return t;
}

/** Hinweis-Karte: Bild des Merkmals, durchgestrichen bei „kein …“ */
function karte(x: number, y: number, h: Hinweis, hell: boolean): string {
  const w = 92;
  const hh = 70;
  let t = `<rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="14" fill="${hell ? '#FFF3B0' : '#FFFFFF'}" stroke="${hell ? '#E8B10E' : '#1B2033'}" stroke-width="${hell ? 4 : 2.5}"/>`;
  const cx = x + w / 2;
  const cy = y + hh / 2;
  if (h.art === 'brille') t += brille(cx, cy, 44);
  else t += hut(cx, cy + 14, 30, h.art === 'hut' ? h.farbe : 'rot', h.art === 'hut-da');
  if (h.nicht) t += `<path d="M${x + 14} ${y + hh - 12}L${x + w - 14} ${y + 12}" stroke="#1B2033" stroke-width="6" stroke-linecap="round"/>`;
  return t;
}

const SPALTE = 120;
const ZEILE = 112;

function zeichne(w: WerIstEs, o: { hilfe: number; gewaehlt: Antwort | null; vorrechnen?: boolean }): string {
  const W = 3 * SPALTE + 20;
  const kartenH = 92;
  const H = kartenH + 2 * ZEILE + 10;
  let s = '';
  const kx = (W - w.hinweise.length * 104 + 12) / 2;
  w.hinweise.forEach((h, i) => (s += karte(kx + i * 104, 8, h, (o.hilfe >= 2 && i === 0) || !!o.vorrechnen)));
  const ziel = loesungen(w)[0];
  w.raupen.forEach((r, i) => {
    const cx = 10 + (i % 3) * SPALTE + SPALTE / 2 + 22;
    const cy = kartenH + Math.floor(i / 3) * ZEILE + 50;
    // Hilfe 3: Raupen, die zum ersten Hinweis nicht passen, werden blass (nur wenn mehrere bleiben)
    const blass = (o.hilfe >= 3 && !schrittVerraet(w) && !passt(r, w.hinweise[0])) || (!!o.vorrechnen && !w.hinweise.every((h) => passt(r, h)));
    const gewaehlt = o.gewaehlt?.art === 'zahl' && o.gewaehlt.wert === i + 1;
    const loesung = !!o.vorrechnen && ziel?.art === 'zahl' && ziel.wert === i + 1;
    s += `<g class="wahl-ziel" data-wahl="${i}" role="button" tabindex="0" aria-label="Raupe ${i + 1}" opacity="${blass ? 0.25 : 1}">`;
    s += `<rect x="${cx - 80}" y="${cy - 52}" width="${SPALTE - 6}" height="${ZEILE - 6}" rx="16" fill="${gewaehlt || loesung ? '#FDEEDC' : 'transparent'}" stroke="${gewaehlt || loesung ? '#E8893A' : 'transparent'}" stroke-width="4"/>`;
    s += raupe(cx, cy - 2, r);
    s += `<text x="${cx - 24}" y="${cy + 47}" text-anchor="middle" font-size="22" font-weight="800" fill="#1F2421">${i + 1}</text>`;
    s += `</g>`;
  });
  return `<svg class="aufgabe-svg" viewBox="0 0 ${W} ${H}" role="group" aria-label="Wer ist es?">${s}</svg>`;
}

export const WER_IST_ES: Format<WerIstEs> = {
  id: 'wer-ist-es',
  version: 1,
  auftrag: 'Wer ist es?',
  stufen: 3,
  eingabe: 'bild',
  erzeuge,
  loesungen,
  wahl: () => Array.from({ length: 6 }, (_, i) => ({ art: 'zahl', wert: i + 1 }) as Antwort),
  zeichne,
  schrittVerraet,
  beispiel: () => ({
    raupen: [
      { hut: 'kein', brille: false },
      { hut: 'rot', brille: false },
      { hut: 'kein', brille: true },
      { hut: 'blau', brille: false },
      { hut: 'kein', brille: false },
      { hut: 'gelb', brille: true },
    ],
    hinweise: [{ art: 'hut', farbe: 'blau', nicht: false }],
  }),
};
