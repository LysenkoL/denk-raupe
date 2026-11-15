import { KIND } from '../i18n/kind';
import { gleich } from '../perlen/antwort';
import { perlenBild } from '../perlen/perle';
import { blattImg, perleSvg } from '../perlen/maler';
import { KORB } from '../bilder/bilder';
import { szeneHtml } from '../satz/szene';
import { DEMO, demoStimmt, type DemoAufgabe } from '../satz/demo';
import {
  aenderbar,
  blaetter,
  fertig,
  kannVergleichen,
  neuerSatz,
  setzeAntwort,
  vergleiche,
  type Satz,
} from '../satz/vergleich';

/**
 * Satz-Bildschirm: Raupe und Zwilling, die aktuelle Aufgabe, „Vergleichen“.
 * Etappe 2: die Aufgaben sind Platzhalter (src/satz/demo.ts).
 */
export function renderSatz(app: HTMLElement, params: URLSearchParams): void {
  const anzahl = Math.min(6, Math.max(3, Number(params.get('n')) || 6));
  const aufgaben: DemoAufgabe[] = DEMO.slice(0, anzahl);
  const stimmt = demoStimmt(aufgaben);

  let satz: Satz = neuerSatz(anzahl);
  let aktuell = 0;
  let wackeln: number[] = [];
  let hebt: number | null = null;
  let hupf: number | null = null;
  let meldung = '';
  let busy = false;

  app.innerHTML = `<main class="satz">
    <section class="buehne-wrap" aria-label="${KIND.deineRaupe}"></section>
    <section class="aufgabe" aria-live="polite"></section>
    <div class="unten"><button class="btn haupt vergleichen" type="button">${KIND.vergleichen}</button></div>
  </main>`;
  const buehne = app.querySelector<HTMLElement>('.buehne-wrap')!;
  const aufgabe = app.querySelector<HTMLElement>('.aufgabe')!;
  const knopf = app.querySelector<HTMLButtonElement>('.vergleichen')!;

  const ende = () => fertig(satz) && !busy;

  function zeichneBuehne(): void {
    buehne.innerHTML = szeneHtml(satz, { aktuell: ende() ? null : aktuell, wackeln, hebt, hupf, ringe: !busy && !wackeln.length });
    hupf = null;
  }

  function zeichneAufgabe(): void {
    if (ende()) {
      const b = blaetter(satz);
      const zurueck = satz.perlen.some((p) => p.zurueck);
      // Platzhalter: Korb und ein Buchstabe des Geheimworts – Etappe 3 macht daraus das kleine Ereignis
      aufgabe.innerHTML = `<div class="ende">
        <h2>${KIND.fertigTitel}</h2>
        <img class="korb-bild" src="${KORB.voll}" alt="" draggable="false">
        <div class="korb" aria-hidden="true">${Array.from({ length: b.gold }, () => blattImg('gold')).join('')}${Array.from({ length: b.normal }, () => blattImg('normal')).join('')}</div>
        <p>${KIND.fertigKorb}</p>
        ${zurueck ? `<p class="hinweis">${KIND.spaeter}</p>` : ''}
        <div class="geheim" aria-label="${KIND.geheimwort}"><span></span><span></span><span class="auf">U</span><span></span><span></span></div>
      </div>`;
      return;
    }
    const a = aufgaben[aktuell];
    const p = satz.perlen[aktuell];
    const gesperrt = !aenderbar(satz, aktuell) || busy;
    aufgabe.innerHTML = `
      <h1 class="auftrag">${a.auftrag}</h1>
      <div class="aufgabe-bild">${a.bild}</div>
      <div class="wahl" role="group" aria-label="${a.auftrag}">
        ${a.wahl
          .map((w, k) => {
            const bild = perlenBild(w);
            return `<button type="button" data-k="${k}" aria-pressed="${gleich(p.antwort, w)}" aria-label="${bild.name}"${gesperrt ? ' disabled' : ''}>${perleSvg(bild)}</button>`;
          })
          .join('')}
      </div>
      <p class="meldung">${meldung}</p>
      ${anzahl > 1 ? `<button class="btn leise weiter" type="button">${KIND.weiter} →</button>` : ''}`;
  }

  function zeichneKnopf(): void {
    knopf.disabled = busy || !kannVergleichen(satz);
    knopf.hidden = ende();
  }

  function alles(): void {
    zeichneBuehne();
    zeichneAufgabe();
    zeichneKnopf();
  }

  buehne.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('.perle[data-i]');
    if (!b || busy || ende()) return;
    aktuell = Number(b.dataset.i);
    alles();
  });

  aufgabe.addEventListener('click', (e) => {
    const t = e.target as Element;
    const wahl = t.closest<HTMLButtonElement>('.wahl button');
    if (wahl && !wahl.disabled) {
      const w = aufgaben[aktuell].wahl[Number(wahl.dataset.k)];
      satz = setzeAntwort(satz, aktuell, w);
      hupf = aktuell;
      meldung = '';
      alles();
      return;
    }
    if (t.closest('.weiter')) {
      // nächste offene Aufgabe, sonst einfach die nächste
      const n = satz.perlen.length;
      for (let d = 1; d <= n; d++) {
        const j = (aktuell + d) % n;
        if (aenderbar(satz, j) && satz.perlen[j].antwort === null) {
          aktuell = j;
          return alles();
        }
      }
      for (let d = 1; d <= n; d++) {
        const j = (aktuell + d) % n;
        if (aenderbar(satz, j)) {
          aktuell = j;
          return alles();
        }
      }
    }
  });

  const pause = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 40 : 380);

  knopf.addEventListener('click', async () => {
    if (busy || !kannVergleichen(satz)) return;
    const vorher = satz;
    const r = vergleiche(satz, stimmt);
    busy = true;
    wackeln = [];
    meldung = '';
    // Blätter heben sich nacheinander; der Zustand wird Schritt für Schritt übernommen
    let zwischen = { ...vorher, runden: r.satz.runden };
    for (const i of r.gehoben) {
      zwischen = { ...zwischen, perlen: zwischen.perlen.map((p, j) => (j === i ? r.satz.perlen[i] : p)) };
      satz = zwischen;
      hebt = i;
      alles();
      await new Promise((ok) => setTimeout(ok, pause()));
    }
    hebt = null;
    satz = r.satz;
    busy = false;
    wackeln = r.bleiben;
    if (!fertig(satz)) {
      aktuell = r.bleiben.find((i) => !satz.perlen[i].zurueck) ?? aktuell;
      meldung = r.wiederholung ? KIND.nichtsGeaendert : KIND.blattBleibt;
    }
    alles();
    // nach dem Wackeln: Ringe über den liegen gebliebenen Blättern
    if (wackeln.length) {
      setTimeout(() => {
        wackeln = [];
        zeichneBuehne();
      }, 3 * pause() + 200);
    }
  });

  alles();
}
