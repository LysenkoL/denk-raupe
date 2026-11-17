import { LATERNE, TINTE } from '../design/farbe';
import { perlenBild } from '../perlen/perle';
import { blattImg, kopfHtml, leerSvg, mulde, perleSvg, perlenBox, R } from '../perlen/maler';
import { fertig, type Satz } from './vergleich';
import type { KopfArt } from '../bilder/bilder';
import { KIND } from '../i18n/kind';

/**
 * Bühne des Satzes: oben die Raupe des Kindes, darunter der Zwilling mit Blättern.
 * Reines HTML aus dem Zustand – derselbe Code zeichnet die App und die Musterseite.
 *
 * Perle i des Zwillings steht genau unter Perle i der Raupe. Der Platz unter dem Blatt ist immer
 * so breit wie die Perle des Kindes darüber – nie wie die Lösung, damit die Breite nichts verrät.
 */

export interface SzenenOptionen {
  /** Aufgabe, an der das Kind gerade ist (Ring um die Perle) */
  aktuell?: number | null;
  /** Blätter, die gerade wackeln (nach dem Vergleichen liegen geblieben) */
  wackeln?: readonly number[];
  /** Blatt, das sich gerade hebt */
  hebt?: number | null;
  /** Perle, die gerade gefüllt wurde (kleiner Hüpfer) */
  hupf?: number | null;
  /** gestrichelter Ring über Perlen, deren Blatt liegen geblieben ist (nach dem Wackeln) */
  ringe?: boolean;
  /** Perlen sind Knöpfe (App) oder nur Bild (Musterseite) */
  knoepfe?: boolean;
  /** Ausdruck der Raupe; sonst aus dem Zustand */
  kopf?: KopfArt;
}

/** Ausdruck der Raupe des Kindes: nie traurig – nach dem Vergleichen mit liegendem Blatt nachdenklich */
export function kopfFuer(s: Satz): KopfArt {
  if (fertig(s)) return 'freude';
  if (s.runden > 0) return 'denkt';
  if (s.perlen.some((p) => p.antwort !== null)) return 'schaut';
  return 'normal';
}

function breite(s: Satz, i: number): number {
  const a = s.perlen[i].antwort;
  return a ? perlenBild(a).breite : 2;
}

/** Summe der Perlenbreiten in Durchmessern – CSS rechnet daraus die Perlengröße */
export function einheiten(s: Satz): number {
  return s.perlen.reduce((n, _, i) => n + breite(s, i) / 2, 0);
}

const ZURUECK_MARKE = `<svg class="marke" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="${LATERNE}" stroke="${TINTE}" stroke-width="1.6"/><path d="M8 9.5h6.5a3.5 3.5 0 0 1 0 7H10" fill="none" stroke="${TINTE}" stroke-width="2" stroke-linecap="round"/><path d="M10.5 6.5 7.5 9.5l3 3" fill="none" stroke="${TINTE}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export function szeneHtml(s: Satz, o: SzenenOptionen = {}): string {
  const knopf = o.knoepfe ?? true;
  const tag = knopf ? 'button' : 'div';
  const oben: string[] = [];
  const unten: string[] = [];
  s.perlen.forEach((p, i) => {
    const w = breite(s, i) / 2;
    const bild = p.antwort ? perlenBild(p.antwort) : null;
    const klassen = ['perle'];
    if (i === o.aktuell) klassen.push('aktuell');
    if (i === o.hupf) klassen.push('hupf');
    if (o.ringe && p.blatt === 'zu' && !p.zurueck && s.runden > 0) klassen.push('offen');
    const name = KIND.perleName(i + 1, bild?.name ?? null);
    const attrs = knopf ? ` type="button" data-i="${i}" aria-label="${name}"${i === o.aktuell ? ' aria-current="step"' : ''}` : '';
    oben.push(
      `<${tag} class="${klassen.join(' ')}"${attrs} style="--w:${w}">${bild ? perleSvg(bild) : leerSvg()}${p.zurueck ? ZURUECK_MARKE : ''}</${tag}>`,
    );

    // Zwilling: gehoben → dieselbe Perle (sie ist ja gleich); sonst Mulde mit Blatt
    const zk = ['zwilling-perle'];
    let inhalt: string;
    if (p.blatt !== 'zu' && i !== o.hebt) {
      inhalt = perleSvg(bild!) + `<span class="lohn">${blattImg(p.blatt === 'gold' ? 'gold' : 'normal')}</span>`;
    } else {
      const { w: bw, h: bh } = perlenBox(breite(s, i));
      const mitte = `<svg class="perle-svg" viewBox="0 0 ${bw} ${bh}" aria-hidden="true"><g transform="translate(${(bw - 2 * R - 12) / 2} 0)">${mulde()}</g></svg>`;
      const unter = i === o.hebt && bild ? perleSvg(bild) : mitte;
      const bk = ['blatt'];
      if (o.wackeln?.includes(i)) bk.push('wackelt');
      if (i === o.hebt) bk.push('hebt');
      inhalt = `${unter}<span class="${bk.join(' ')}">${blattImg(i === o.hebt && p.blatt === 'gold' ? 'gold' : 'normal')}</span>`;
    }
    unten.push(`<div class="${zk.join(' ')}" style="--w:${w}">${inhalt}</div>`);
  });
  const e = einheiten(s).toFixed(2);
  return `<div class="buehne" style="--e:${e};--n:${s.perlen.length}">
    <div class="raupe-zeile kind" role="group" aria-label="${KIND.deineRaupe}">${oben.join('')}${kopfHtml(o.kopf ?? kopfFuer(s))}</div>
    <div class="raupe-zeile zwilling" role="img" aria-label="${KIND.zwilling}">${unten.join('')}${kopfHtml('zwilling')}</div>
  </div>`;
}
