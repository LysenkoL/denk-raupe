import { perlenBild } from '../perlen/perle';
import { perleSvg } from '../perlen/maler';
import { fertig, type Satz } from './vergleich';
import { blattFigur, figur } from '../bilder/bilder';
import { tippMarkeSvg, zurueckMarkeSvg, type Ausdruck } from '../bilder/figuren';
import { KIND } from '../i18n/kind';

/**
 * Ast des Satzes (docs/STIL.md, Abschnitte 8 und 11): oben die Raupe des Kindes, darunter der Zwilling.
 * Der Körper jeder Raupe ist eine Reihe von Nestern auf einem Holzast; vorn richtet sie ihr Vorderteil auf
 * (Kopf, Kleidungsstück, erstes Segment, zwei Beine). Breit: das Vorderteil steht am Anfang der Reihe;
 * schmal: es ist über das erste Nest gehoben und geht in es über (app.css, Container-Abfrage).
 * Reines HTML aus dem Zustand – derselbe Code zeichnet die App und die Musterseite.
 *
 * Perle i des Zwillings steht genau unter Perle i der Raupe. Unter einem Blatt liegt immer ein leeres Nest,
 * so breit wie die Perle des Kindes darüber – nie die Lösung, nie ihre Breite.
 */

export interface SzenenOptionen {
  /** Aufgabe, an der das Kind gerade ist (doppelte Linie um die Perle) */
  aktuell?: number | null;
  /** Blätter, die gerade einmal wackeln (nach dem Vergleichen liegen geblieben) */
  wackeln?: readonly number[];
  /**
   * Blätter, die beim Vergleichen gleich gehoben werden, aber noch liegen (Bewegung „Blatt hebt sich“):
   * sie werden wie geschlossen gezeichnet, mit leerem Nest darunter.
   */
  verdeckt?: readonly number[];
  /** Perle, die gerade zur Antwort geworden ist: sie fliegt ein, eine Welle läuft über die Raupe */
  frisch?: number | null;
  /** Perlen sind Knöpfe (App) oder nur Bild (Musterseite) */
  knoepfe?: boolean;
  /** Ausdruck der Raupe; sonst aus dem Zustand */
  ausdruck?: Ausdruck;
  /** Zahl der Blätter im Korb; ohne: kein Korb */
  korb?: number | null;
}

/** Ausdruck der Raupe des Kindes: nie traurig – nach dem Vergleichen mit liegendem Blatt nachdenklich */
export function ausdruckFuer(s: Satz): Ausdruck {
  if (fertig(s)) return 'freude';
  if (s.runden > 0) return 'denkt';
  return 'ruhig';
}

function breite(s: Satz, i: number): number {
  const a = s.perlen[i].antwort;
  return a ? perlenBild(a).breite : 2;
}

/** Summe der Perlenbreiten in Durchmessern – CSS rechnet daraus die Perlengröße */
export function einheiten(s: Satz): number {
  return s.perlen.reduce((n, _, i) => n + breite(s, i) / 2, 0);
}

/** Korb mit Holzschild und Zahl (docs/STIL.md, Abschnitt 7, „Корзинка“) */
export function korbHtml(zahl: number, voll = false, cls = ''): string {
  return `<span class="korb-figur${cls ? ' ' + cls : ''}" aria-label="${KIND.korb(zahl)}" role="img">${figur(voll ? 'korb-voll' : 'korb')}<span class="korb-schild" aria-hidden="true">${zahl}</span></span>`;
}

export function szeneHtml(s: Satz, o: SzenenOptionen = {}): string {
  const knopf = o.knoepfe ?? true;
  const tag = knopf ? 'button' : 'div';
  const verdeckt = new Set(o.verdeckt ?? []);
  const oben: string[] = [];
  const unten: string[] = [];
  s.perlen.forEach((p, i) => {
    const w = breite(s, i) / 2;
    const bild = p.antwort ? perlenBild(p.antwort) : null;
    const klassen = ['perle'];
    if (!bild) klassen.push('leer');
    if (i === o.aktuell) klassen.push('aktuell');
    if (i === o.frisch) klassen.push('einflug');
    if (o.frisch != null) klassen.push('welle');
    const name = KIND.perleName(i + 1, bild?.name ?? null);
    const attrs = knopf ? ` type="button" data-i="${i}" aria-label="${name}"${i === o.aktuell ? ' aria-current="step"' : ''}` : '';
    oben.push(
      `<${tag} class="${klassen.join(' ')}"${attrs} style="--w:${w};--k:${i + 1}"><span class="mulde" aria-hidden="true"></span>${bild ? perleSvg(bild) : ''}${p.zurueck ? zurueckMarkeSvg() : ''}</${tag}>`,
    );

    // Zwilling: gehoben → dieselbe Perle (sie ist ja gleich); sonst leeres Nest unter dem Blatt
    const offen = p.blatt !== 'zu' && !verdeckt.has(i);
    if (offen) {
      unten.push(`<div class="zwilling-perle" data-zi="${i}" style="--w:${w}"><span class="mulde" aria-hidden="true"></span>${perleSvg(bild!)}</div>`);
    } else {
      // liegen geblieben nach dem Vergleichen: ruhige Marke „hier darfst du tippen“, und das Blatt führt zur Aufgabe
      const tippbar = s.runden > 0 && !p.zurueck && !verdeckt.has(i);
      const bk = ['blatt'];
      if (o.wackeln?.includes(i)) bk.push('wackelt');
      const blatt = `<span class="${bk.join(' ')}" aria-hidden="true">${blattFigur('normal')}${tippbar ? tippMarkeSvg() : ''}</span>`;
      const zt = tippbar && knopf ? 'button' : 'div';
      const za = zt === 'button' ? ` type="button" data-i="${i}" aria-label="${KIND.blattLiegt(i + 1)}"` : '';
      unten.push(`<${zt} class="zwilling-perle${tippbar ? ' offen' : ''}" data-zi="${i}"${za} style="--w:${w}"><span class="mulde" aria-hidden="true"></span><span class="unter"></span>${blatt}</${zt}>`);
    }
  });
  const e = einheiten(s).toFixed(2);
  const ausdruck = o.ausdruck ?? ausdruckFuer(s);
  const welle = o.frisch != null ? ' welle' : '';
  return `<div class="buehne" style="--e:${e};--n:${s.perlen.length}">
    <div class="reihe kind-reihe">
      <div class="raupe-zeile kind" role="group" aria-label="${KIND.deineRaupe}"><span class="vorne${welle}" data-ausdruck="${ausdruck}" style="--k:0">${figur(`raupe-${ausdruck}`)}</span>${oben.join('')}</div>
      <p class="zeilen-name" aria-hidden="true">${KIND.deineRaupe}</p>
    </div>
    <div class="reihe zwilling-reihe">
      <div class="raupe-zeile zwilling" role="group" aria-label="${KIND.zwilling}"><span class="vorne">${figur('zwilling')}</span>${unten.join('')}</div>
      <div class="zeilen-fuss"><p class="zeilen-name" aria-hidden="true">${KIND.deinZwilling}</p>${o.korb != null ? korbHtml(o.korb, o.korb > 0) : ''}</div>
    </div>
  </div>`;
}
