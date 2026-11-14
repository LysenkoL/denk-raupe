import { setSprache, t, type Sprache } from '../app/i18n';
import { HUNDERT_FARBE, ZIFFER_FARBEN } from '../design/farbe';
import { KIND } from '../i18n/kind';
import type { Antwort } from '../perlen/antwort';
import { blattSvg, leerSvg, perleSvg } from '../perlen/maler';
import { perlenBild } from '../perlen/perle';
import { DEMO, demoStimmt } from '../satz/demo';
import { szeneHtml } from '../satz/szene';
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
  const stimmt = demoStimmt(DEMO);
  const loesung = DEMO.map((d) => d.loesung);
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
    [t('stil.z.geprueft'), szeneHtml(geprueft, { ...o, aktuell: 1, ringe: true })],
    [t('stil.z.zurueck'), szeneHtml(zurueck, { ...o, ringe: true })],
    [t('stil.z.fertig'), szeneHtml(fertig, o)],
    [t('stil.z.lang'), szeneHtml(lang, o)],
  ];
}

export function renderStil(app: HTMLElement, params: URLSearchParams): void {
  const sp = params.get('sprache');
  if (sp === 'de' || sp === 'uk') setSprache(sp as Sprache);

  const ziffern = ZIFFER_FARBEN.map(
    (c, n) => `<li><span class="farbfeld" style="background:${c}"></span><b>${n}</b><code>${c}</code></li>`,
  ).join('') + `<li><span class="farbfeld" style="background:${HUNDERT_FARBE}"></span><b>100</b><code>${HUNDERT_FARBE}</code></li>`;

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

    <section><h2>${t('stil.farben')}</h2><p class="hinweis">${t('stil.farbenText')}</p><ul class="ziffern">${ziffern}</ul></section>
    <section><h2>${t('stil.zahlen')}</h2><div class="perlen-raster">${zahlen}</div></section>
    <section><h2>${t('stil.andere')}</h2><div class="perlen-raster">${andere.map(perle).join('')}</div></section>
    <section><h2>${t('stil.zustaende')}</h2>
      <div class="perlen-raster beschriftet">
        <figure class="muster-perle" style="--w:1">${leerSvg()}<figcaption>${t('stil.leer')}</figcaption></figure>
        <figure class="muster-perle" style="--w:1">${blattSvg(false)}<figcaption>${t('stil.blatt')}</figcaption></figure>
        <figure class="muster-perle" style="--w:1">${blattSvg(true)}<figcaption>${t('stil.gold')}</figcaption></figure>
      </div>
    </section>
    <section><h2>${t('stil.satz')}</h2>
      ${zustaende().map(([titel, html]) => `<figure class="zustand"><figcaption>${titel}</figcaption><div class="buehne-wrap">${html}</div></figure>`).join('')}
    </section>
    <section><h2>${t('stil.knoepfe')}</h2>
      <div class="knopf-reihe"><button class="btn haupt" type="button">${KIND.vergleichen}</button><button class="btn haupt" type="button" disabled>${KIND.vergleichen}</button><button class="btn leise" type="button">${KIND.weiter} →</button></div>
    </section>
    <section><h2>${t('stil.schrift')}</h2><p class="hinweis">${t('stil.schriftText')}</p>
      <p class="schriftprobe">Il1 a ä ß — Wie geht es weiter? 0123456789</p>
    </section>
  </main>`;
}
