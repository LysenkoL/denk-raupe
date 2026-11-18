import { elternTexte, setSprache, t, type Key, type Sprache } from '../app/i18n';
import { FORMATE } from '../aufgaben';
import { aufgabeAus, type FormatId } from '../aufgaben/format';
import { HUNDERT_FARBE, HUNDERT_KANTE, ZIFFER_FARBEN, ZIFFER_KANTEN } from '../design/farbe';
import { KIND } from '../i18n/kind';
import type { Antwort } from '../perlen/antwort';
import { leerSvg, perleSvg } from '../perlen/maler';
import { figur, type FigurName } from '../bilder/bilder';
import { laterneSvg } from '../bilder/figuren';
import { perlenBild } from '../perlen/perle';
import { gleich } from '../perlen/antwort';
import { korbHtml, szeneHtml } from '../satz/szene';
import { neuerSatz, setzeAntwort, vergleiche, zuruecklegen, type Satz } from '../satz/vergleich';

/**
 * Musterseite des Designsystems (für die Autorin, Eltern-Sprache). Zeigt jede Perle und
 * jeden Zustand der Bühne – dieselben Funktionen, mit denen die App zeichnet.
 */

function perle(a: Antwort): string {
  const b = perlenBild(a);
  return `<figure class="muster-perle" style="--w:${b.breite / 2}">${perleSvg(b)}</figure>`;
}

function mitAntworten(s: Satz, antworten: (Antwort | null)[]): Satz {
  return antworten.reduce((acc, a, i) => setzeAntwort(acc, i, a), s);
}

function zustaende(): [string, string][] {
  // Beispielantworten nur für die Bilder dieser Seite
  const loesung: Antwort[] = [
    { art: 'zahl', wert: 7 },
    { art: 'zahl', wert: 14 },
    { art: 'form', form: 'dreieck', farbe: 'blau' },
    { art: 'buchstabe', wert: 'C' },
    { art: 'artikel', wert: 'die' },
    { art: 'wort', wert: 'Haus' },
  ];
  const stimmt = (i: number, a: Antwort) => gleich(loesung[i], a);
  const falsch: Antwort = { art: 'zahl', wert: 12 };
  const leer = neuerSatz(6);
  const teil = mitAntworten(leer, [loesung[0], loesung[1], null, loesung[3], null, null]);
  const voll = mitAntworten(leer, [loesung[0], falsch, ...loesung.slice(2, 5), { art: 'wort', wert: 'Hasu' }]);
  const geprueft = vergleiche(voll, stimmt).satz;
  const zurueck = zuruecklegen(setzeAntwort(geprueft, 5, { art: 'wort', wert: 'Haus' }), 1);
  const fertig = vergleiche(setzeAntwort(setzeAntwort(geprueft, 1, loesung[1]), 5, loesung[5]), stimmt).satz;
  const lang = mitAntworten(neuerSatz(5), [
    { art: 'wort', wert: 'Schmetterling' },
    { art: 'zahl', wert: 100 },
    { art: 'zeit', stunde: 7, minute: 30 },
    { art: 'geld', cent: 250 },
    { art: 'sammel', zeichen: 'reihe', wert: [3, 1, 2] },
  ]);
  const o = { knoepfe: false };
  return [
    [t('stil.z.start'), szeneHtml(leer, { ...o, aktuell: 0 })],
    [t('stil.z.teil'), szeneHtml(teil, { ...o, aktuell: 2 })],
    [t('stil.z.voll'), szeneHtml(voll, { ...o, aktuell: 5 })],
    [t('stil.z.geprueft'), szeneHtml(geprueft, { ...o, aktuell: 1, korb: 4 })],
    [t('stil.z.zurueck'), szeneHtml(zurueck, { ...o, korb: 8 })],
    [t('stil.z.fertig'), szeneHtml(fertig, { ...o, korb: 11 })],
    [t('stil.z.lang'), szeneHtml(lang, o)],
  ];
}

/** Samen der Beispielaufgaben dieser Seite: fest, damit die Seite immer gleich aussieht */
const FORMAT_SAMEN = 20261118;

/**
 * Jedes fertige Format: Pass, dieselbe Aufgabe (Stufe 2) ohne Hilfe, mit Hilfe 2 und 3, Texte für Eltern.
 * Stufe 2, weil dort jeder Schritt der Stufe 3 an der eigenen Aufgabe gezeigt werden kann.
 */
function formate(): string {
  return (Object.keys(FORMATE) as FormatId[])
    .map((id) => {
      const f = FORMATE[id];
      const a = aufgabeAus(f, FORMAT_SAMEN, 2);
      const e = elternTexte(id);
      const pass = t('stil.f.pass', { nr: f.nr, faehigkeit: f.faehigkeit, motor: f.motor, stufen: f.stufen, druck: t(f.druck ? 'stil.f.druck' : 'stil.f.nurBildschirm') });
      const bild = (hilfe: 0 | 2 | 3, titel: string) =>
        `<figure><figcaption>${titel}</figcaption><div class="aufgabe-bild">${f.zeichne(a.bedingung, { hilfe, gewaehlt: null })}</div></figure>`;
      return `<article class="format-probe" data-format="${id}">
        <h3>${e.name}</h3>
        <p class="hinweis">${pass}</p>
        <div class="format-bilder">${bild(0, t('stil.f.ohne'))}${bild(2, t('stil.f.hilfe2'))}${bild(3, t('stil.f.hilfe3'))}</div>
        <dl class="eltern-texte">
          <dt>${t('stil.f.uebt')}</dt><dd>${e.uebt}</dd>
          <dt>${t('stil.f.beispiel')}</dt><dd>${e.beispiel}</dd>
          <dt>${t('stil.f.helfen')}</dt><dd>${e.helfen}</dd>
        </dl>
      </article>`;
    })
    .join('');
}

export function renderStil(app: HTMLElement, params: URLSearchParams): void {
  const sp = params.get('sprache');
  if (sp === 'de' || sp === 'uk') setSprache(sp as Sprache);

  const ziffern = ZIFFER_FARBEN.map(
    (c, n) => `<li><span class="farbfeld" style="background:${c};border-color:${ZIFFER_KANTEN[n]}"></span><b>${n}</b><code>${c}</code></li>`,
  ).join('') + `<li><span class="farbfeld" style="background:${HUNDERT_FARBE};border-color:${HUNDERT_KANTE}"></span><b>100</b><code>${HUNDERT_FARBE}</code></li>`;

  const zahlen = Array.from({ length: 101 }, (_, n) => perle({ art: 'zahl', wert: n })).join('');
  const andere: Antwort[] = [
    { art: 'buchstabe', wert: 'A' },
    { art: 'buchstabe', wert: 'ß' },
    { art: 'artikel', wert: 'der' },
    { art: 'artikel', wert: 'die' },
    { art: 'artikel', wert: 'das' },
    { art: 'wort', wert: 'Maus' },
    { art: 'wort', wert: 'Schmetterling' },
    { art: 'zeit', stunde: 12, minute: 15 },
    { art: 'geld', cent: 120 },
    { art: 'laenge', cm: 8 },
    { art: 'form', form: 'kreis', farbe: 'rot' },
    { art: 'form', form: 'quadrat', farbe: 'blau' },
    { art: 'form', form: 'dreieck', farbe: 'gelb' },
    { art: 'form', form: 'raute', farbe: 'gruen' },
    { art: 'form', form: 'stern', farbe: 'lila' },
    { art: 'form', form: 'kreis', farbe: 'orange', klein: true },
    { art: 'sammel', zeichen: 'reihe', wert: [] },
    { art: 'sammel', zeichen: 'gitter', wert: [] },
    { art: 'sammel', zeichen: 'paar', wert: [] },
    { art: 'sammel', zeichen: 'bau', wert: [] },
    { art: 'sammel', zeichen: 'ansicht', wert: [] },
    { art: 'sammel', zeichen: 'satz', wert: [] },
  ];

  app.innerHTML = `<main class="stil">
    <header class="stil-kopf">
      <h1>${t('stil.titel')}</h1>
      <nav class="sprachen" aria-label="${t('stil.sprache')}">
        <a href="#/stil?sprache=de" aria-current="${sp !== 'uk'}">Deutsch</a>
        <a href="#/stil?sprache=uk" aria-current="${sp === 'uk'}">Українська</a>
      </nav>
    </header>
    <p>${t('stil.einleitung')}</p>
    <p><a class="btn haupt" href="#/">${t('stil.zumSatz')}</a></p>

    <section><h2>${t('stil.farben')}</h2><p class="hinweis">${t('stil.farbenText')}</p><ul class="farb-liste">${ziffern}</ul></section>
    <section><h2>${t('stil.zahlen')}</h2><div class="perlen-raster">${zahlen}</div></section>
    <section><h2>${t('stil.andere')}</h2><div class="perlen-raster">${andere.map(perle).join('')}</div></section>
    <section><h2>${t('stil.zustaende')}</h2>
      <div class="perlen-raster beschriftet">
        <figure class="muster-perle" style="--w:1">${leerSvg()}<figcaption>${t('stil.leer')}</figcaption></figure>
      </div>
    </section>
    <section><h2>${t('stil.bilder')}</h2>
      <div class="bilder-raster">
        ${(['raupe-ruhig', 'raupe-denkt', 'raupe-freude', 'raupe-staunt', 'zwilling'] as FigurName[]).map((n) => `<figure><span class="figur-probe vorne-probe">${figur(n)}</span><figcaption>${t(`stil.figur.${n === 'zwilling' ? 'zwilling' : n.slice(6)}` as Key)}</figcaption></figure>`).join('')}
        ${(['blatt', 'blatt-gold'] as FigurName[]).map((n) => `<figure><span class="figur-probe blatt-probe">${figur(n)}</span><figcaption>${t(n === 'blatt' ? 'stil.blatt.normal' : 'stil.blatt.gold')}</figcaption></figure>`).join('')}
        <figure>${korbHtml(0)}<figcaption>${t('stil.korb.leer')}</figcaption></figure>
        <figure>${korbHtml(12, true)}<figcaption>${t('stil.korb.voll')}</figcaption></figure>
      </div>
    </section>
    <section><h2>${t('stil.satz')}</h2>
      ${zustaende().map(([titel, html]) => `<figure class="zustand"><figcaption>${titel}</figcaption><div class="ast-zone">${html}</div></figure>`).join('')}
    </section>
    <section><h2>${t('stil.formate')}</h2><p class="hinweis">${t('stil.formateText')}</p>${formate()}</section>
    <section><h2>${t('stil.knoepfe')}</h2>
      <p class="hinweis">${t('stil.knoepfeText')}</p>
      <div class="knopf-reihe"><button class="btn haupt" type="button">${KIND.vergleichen}</button><button class="btn haupt" type="button" disabled>${KIND.vergleichen}</button><button class="btn leise" type="button">${KIND.weiter}</button><button class="leise-knopf" type="button">${KIND.soGehts}</button><button class="hilfe-knopf" type="button">${laterneSvg()}<span class="sr">${KIND.hilfe}</span></button></div>
      <div class="knopf-reihe"><div class="plaetze"><span class="platz"><span class="platz-zeichen">Z</span><span class="nest leer"></span></span><span class="platz"><span class="platz-zeichen">E</span><span class="nest">${perleSvg(perlenBild({ art: 'zahl', wert: 4 }))}</span></span></div></div>
    </section>
    <section><h2>${t('stil.schrift')}</h2><p class="hinweis">${t('stil.schriftText')}</p>
      <p class="schriftprobe">Il1 a ä ß — Wie geht es weiter? 0123456789</p>
    </section>
  </main>`;
}
