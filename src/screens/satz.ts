import { KIND } from '../i18n/kind';
import { gleich, type Antwort } from '../perlen/antwort';
import { perlenBild } from '../perlen/perle';
import { blattImg, perleSvg } from '../perlen/maler';
import { KORB } from '../bilder/bilder';
import { szeneHtml } from '../satz/szene';
import { FORMATE } from '../aufgaben';
import { aufgabeAus, lernbeispiel, lernPruefen, type Aufgabe, type HilfeStufe } from '../aufgaben/format';
import { neuerSamen } from '../core/zufall';
import { ladeGeschuetzt, schreibenMehrere } from '../core/speicher';
import { fertigTon, heben, klick, rascheln, tonAn } from '../app/ton';
import {
  abschliessen,
  ladeProfil,
  ladeSitzung,
  lernbeispielVorher,
  neueSitzung,
  neuesProfil,
  stimmtFuer,
  type LernZustand,
  type Profil,
  type Sitzung,
} from '../satz/sitzung';
import { HISTORIE_SCHLUESSEL, historieLesen, type Historie } from '../satz/historie';
import { ausWert, schritt, stellenwerte, wertVon, zahlfeld, type Handlung, type Plaetze, type Zahlfeld } from '../satz/zahleingabe';
import { aenderbar, blaetter, fertig, kannVergleichen, setzeAntwort, vergleiche, zuruecklegen } from '../satz/vergleich';

/**
 * Satz-Bildschirm: Raupe und Zwilling, die aktuelle Aufgabe mit Eingabe, Hilfeleiter und Lernbeispiel,
 * „Vergleichen“, am Ende Korb und Geheimwort. Alles wird nach jeder Änderung auf dem Gerät gespeichert.
 */

const TON_AN = `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
const TON_AUS = `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
const LAMPE = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z" style="fill:var(--laterne)" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9.5 19h5M10.5 21.5h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;

const pause = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 40 : 380);
const warte = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

export async function renderSatz(app: HTMLElement): Promise<void> {
  // Unbekanntes (neuere Version, kaputt) bleibt unter „…-unbekannt“, bevor hier etwas überschrieben wird
  let profil: Profil = (await ladeGeschuetzt('profil', ladeProfil)) ?? neuesProfil();
  let sitzung: Sitzung = (await ladeGeschuetzt('sitzung', ladeSitzung)) ?? neueSitzung(neuerSamen());
  let historie: Historie = await historieLesen();
  tonAn(profil.ton);

  // flüchtiger Zustand (wird nicht gespeichert)
  let wackeln: number[] = [];
  let hebt: number | null = null;
  let hupf: number | null = null;
  let meldung = '';
  let busy = false;
  let neuerBuchstabe: number | null = null;
  /**
   * Plätze der Zahleingabe zur offenen Aufgabe (oder zum Schritt des Lernbeispiels). Nicht gespeichert:
   * nach Neuladen, anderer Perle oder geänderter Antwort entstehen sie aus der gespeicherten Zahl neu.
   * Nur so bleibt eine halbe Zahl (Z belegt, E leer) stehen, solange das Kind an dieser Aufgabe ist.
   */
  let plaetze: { wo: string; p: Plaetze } | null = null;

  app.innerHTML = `<main class="satz">
    <section class="buehne-wrap" aria-label="${KIND.deineRaupe}"><div class="buehne-platz"></div>
      <button class="iconbtn ton-knopf" type="button" aria-label="${KIND.ton}"></button></section>
    <section class="aufgabe" aria-live="polite"></section>
    <div class="unten"><button class="btn haupt vergleichen" type="button">${KIND.vergleichen}</button></div>
  </main>`;
  const buehne = app.querySelector<HTMLElement>('.buehne-platz')!;
  const tonKnopf = app.querySelector<HTMLButtonElement>('.ton-knopf')!;
  const panel = app.querySelector<HTMLElement>('.aufgabe')!;
  const knopf = app.querySelector<HTMLButtonElement>('.vergleichen')!;

  /** `mitHistorie`: nur beim Abschluss – die Historie wächst und wird nicht bei jedem Tippen neu geschrieben */
  const speichern = (mitHistorie = false) => {
    void schreibenMehrere(mitHistorie ? { [HISTORIE_SCHLUESSEL]: historie, sitzung, profil } : { sitzung, profil });
  };
  const satz = () => sitzung.satz;
  const ende = () => fertig(satz()) && !busy;
  const aktuell = () => sitzung.aktuell;
  const aufgabe = () => sitzung.aufgaben[aktuell()];
  const format = () => FORMATE[aufgabe().format];

  /** Lernbeispiel kommt von selbst vor der Aufgabe (Format neu oder nochmal) */
  const lernbeispielNoetig = () => !ende() && lernbeispielVorher(profil, aufgabe().format);
  /** Lernbeispiel auf dem Bildschirm: von selbst oder auf Wunsch (Hilfe Stufe 1, Zeichen „So geht's“) */
  const lernOffen = () => !ende() && (lernbeispielNoetig() || sitzung.lernbeispiel?.format === aufgabe().format);
  const lernStart = (): LernZustand => ({ format: aufgabe().format, schritt: 0, antwort: null, versucht: false });
  /** Schritte des Lernbeispiels zum aktuellen Format, der gerade offene und sein Zustand */
  function lernSchritt() {
    const schritte = lernbeispiel(format());
    const lb = sitzung.lernbeispiel;
    const st = lb && lb.format === aufgabe().format ? lb : lernStart();
    const k = Math.min(Math.max(0, st.schritt), schritte.length - 1);
    return { schritte, k, a: schritte[k], st: { ...st, schritt: k } };
  }
  /** Lernbeispiel setzen oder schließen (undefined) – wird mit der Sitzung gespeichert */
  function lernSetzen(st: LernZustand | undefined): void {
    const { lernbeispiel: _alt, ...rest } = sitzung;
    sitzung = st ? { ...rest, lernbeispiel: st } : rest;
  }

  /** wo die Zahl gerade eingegeben wird: Aufgabe im Satz oder Schritt im Lernbeispiel */
  const eingabeOrt = () => (lernOffen() ? `${sitzung.samen}:lern:${aufgabe().format}:${lernSchritt().k}` : `${sitzung.samen}:${aktuell()}`);
  /** Plätze zur gerade gezeigten Antwort; passen die gemerkten nicht mehr dazu, aus der Zahl neu */
  function plaetzeZu(antwort: Antwort | null, feld: Zahlfeld): Plaetze {
    const wert = antwort?.art === 'zahl' ? antwort.wert : null;
    if (plaetze && plaetze.wo === eingabeOrt() && wertVon(plaetze.p) === wert && plaetze.p.stellen.length === stellenwerte(feld).length) return plaetze.p;
    return ausWert(wert, feld);
  }

  /** ähnliche Aufgabe für Hilfe 3/4: gleiches Format, gleiche Stufe, anderer Samen */
  const aehnlich = (a: Aufgabe) => aufgabeAus(FORMATE[a.format], (a.samen + 1_000_003) >>> 0, a.stufe, { zahlenraum: a.zahlenraum });

  function zeichneBuehne(): void {
    buehne.innerHTML = szeneHtml(satz(), { aktuell: ende() ? null : aktuell(), wackeln, hebt, hupf, ringe: !busy && !wackeln.length });
    hupf = null;
    tonKnopf.innerHTML = profil.ton ? TON_AN : TON_AUS;
    tonKnopf.setAttribute('aria-pressed', String(profil.ton));
  }

  function eingabeHtml(a: Aufgabe, antwort: Antwort | null, gesperrt: boolean): string {
    const f = FORMATE[a.format];
    const dis = gesperrt ? ' disabled' : '';
    const e = f.eingabe(a.bedingung);
    const art = e.art;
    if (e.art === 'zahl') {
      // Plätze über den Ziffern: Zehner links, Einer rechts; ihr Aussehen hängt nie davon ab, ob die Zahl stimmt
      // Feld aus Format und Zahlenraum, nie aus der Aufgabe (harte Regel 7)
      const feld = zahlfeld(e, a.zahlenraum);
      const p = plaetzeZu(antwort, feld);
      const plaetzeHtml = stellenwerte(feld)
        .map((sw, k) => {
          const d = p.stellen[k];
          const st = KIND.stelle[sw];
          return `<button type="button" class="platz" data-platz="${k}" aria-label="${st.name}" aria-describedby="platz-${k}" aria-pressed="${p.gewaehlt === k}"${dis}>
            <span class="platz-zeichen" aria-hidden="true">${st.zeichen}</span>
            <span class="nest${d === null ? ' leer' : ''}">${d === null ? '' : perleSvg(perlenBild({ art: 'zahl', wert: d }))}</span>
            <span id="platz-${k}" hidden>${d === null ? KIND.platzLeer : d}</span></button>`;
        })
        .join('');
      const ziffern = Array.from({ length: 10 }, (_, d) => `<button type="button" data-ziffer="${d}" aria-label="${d}"${dis}>${perleSvg(perlenBild({ art: 'zahl', wert: d }))}</button>`).join('');
      const nichtsDa = p.stellen.every((d) => d === null);
      return `<div class="zahl-eingabe" role="group" aria-label="${KIND.zahlEingeben}">
        <div class="plaetze" data-plaetze="${p.stellen.length}">${plaetzeHtml}</div>
        <div class="ziffern">${ziffern}<button type="button" class="loeschen" data-ziffer="x" aria-label="${KIND.loeschen}"${dis || (nichtsDa ? ' disabled' : '')}>⌫</button></div></div>`;
    }
    if (art === 'wahl')
      return `<div class="wahl" role="group">${a.wahl!.map((w, k) => `<button type="button" data-k="${k}" aria-pressed="${gleich(antwort, w)}" aria-label="${perlenBild(w).name}"${dis}>${perleSvg(perlenBild(w))}</button>`).join('')}</div>`;
    return ''; // 'bild': im Bild tippen
  }

  function hilfeHtml(a: Aufgabe, stufe: HilfeStufe): string {
    const f = FORMATE[a.format];
    if (stufe === 1) {
      // nach dem Lernbeispiel bleibt sein letzter Schritt vorgerechnet stehen
      const b = lernbeispiel(f).at(-1)!.bedingung;
      return `<div class="hilfe-box"><b>${KIND.soGehts}</b>${f.zeichne(b, { hilfe: 0, gewaehlt: null, vorrechnen: true })}</div>`;
    }
    if (stufe === 3 && f.schrittVerraet?.(a.bedingung)) {
      const ae = aehnlich(a);
      return `<div class="hilfe-box"><b>${KIND.aehnlich}</b>${f.zeichne(ae.bedingung, { hilfe: 3, gewaehlt: null })}</div>`;
    }
    if (stufe === 4) {
      const ae = aehnlich(a);
      const p = satz().perlen[aktuell()];
      return `<div class="hilfe-box"><b>${KIND.aehnlich}</b>${f.zeichne(ae.bedingung, { hilfe: 0, gewaehlt: null, vorrechnen: true })}
        ${!p.zurueck && aenderbar(satz(), aktuell()) ? `<button class="btn leise spaeter" type="button">${KIND.spaeterKnopf}</button>` : ''}</div>`;
    }
    return '';
  }

  function zeichneEnde(): void {
    const b = blaetter(satz());
    const zurueck = satz().perlen.some((p) => p.zurueck);
    const g = profil.geheim;
    panel.innerHTML = `<div class="ende">
      <h2>${KIND.fertigTitel}</h2>
      <img class="korb-bild" src="${KORB.voll}" alt="" draggable="false">
      <div class="korb" aria-hidden="true">${Array.from({ length: b.gold }, () => blattImg('gold')).join('')}${Array.from({ length: b.normal }, () => blattImg('normal')).join('')}</div>
      <p>${KIND.fertigKorb}</p>
      ${zurueck ? `<p class="hinweis">${KIND.spaeter}</p>` : ''}
      <div class="geheim" aria-label="${KIND.geheimwort}">${[...g.wort].map((c, i) => `<span class="${g.offen.includes(i) ? 'auf' : ''}${i === neuerBuchstabe ? ' neu' : ''}">${g.offen.includes(i) ? c : ''}</span>`).join('')}</div>
      ${neuerBuchstabe !== null ? `<p class="hinweis">${KIND.neuerBuchstabe}</p>` : ''}
      <button class="btn haupt neuer-satz" type="button">${KIND.neuerSatz}</button>
    </div>`;
  }

  /**
   * Lernbeispiel (docs/TZ.md, „Самопроверка“, Nr. 8): 2–3 Schritte mit sofortiger Rückmeldung, ohne Perlen,
   * Blätter und Historie. Richtig → „Genau so!“ und weiter; falsch → die Antwort kehrt zurück,
   * „Schau noch einmal.“ und Hilfe Stufe 2 auf dem Bild. Von selbst gezeigt geht es erst nach dem letzten
   * Schritt zur Aufgabe; auf Wunsch geöffnet führt „Los geht's“ jederzeit zurück.
   */
  function zeichneLernbeispiel(): void {
    const f = format();
    const { schritte, k, a, st } = lernSchritt();
    const richtig = lernPruefen(f, a, st.antwort) === 'richtig';
    const letzter = k === schritte.length - 1;
    const vonSelbst = lernbeispielNoetig();
    const los = richtig && letzter ? 'haupt' : vonSelbst ? '' : 'leise';
    panel.innerHTML = `<div class="lern" data-schritt="${k}">
      <p class="lern-titel">${KIND.soGehts}</p>
      <h1 class="auftrag">${KIND.auftrag[f.auftrag]}</h1>
      <div class="aufgabe-bild${f.eingabe(a.bedingung).art === 'bild' && !richtig ? ' tippbar' : ''}">${f.zeichne(a.bedingung, { hilfe: st.versucht && !richtig ? 2 : 0, gewaehlt: st.antwort })}</div>
      ${eingabeHtml(a, st.antwort, richtig)}
      <p class="meldung">${richtig ? KIND.genau : st.versucht ? KIND.nochmalSchauen : ''}</p>
      ${richtig && !letzter ? `<button class="btn haupt lern-weiter" type="button">${KIND.weiter} →</button>` : ''}
      ${los ? `<button class="btn ${los} los" type="button">${KIND.losGehts}</button>` : ''}
    </div>`;
  }

  function zeichneAufgabe(): void {
    if (ende()) return zeichneEnde();
    if (lernOffen()) return zeichneLernbeispiel();
    const a = aufgabe();
    const f = format();
    const p = satz().perlen[aktuell()];
    const gesperrt = !aenderbar(satz(), aktuell()) || busy;
    const offen = sitzung.hilfeOffen[aktuell()];
    const maxHilfe: HilfeStufe = satz().runden > 0 ? 4 : 2;
    const bildHilfe: HilfeStufe = offen === 2 || (offen >= 3 && !f.schrittVerraet?.(a.bedingung)) ? (Math.min(offen, 3) as HilfeStufe) : offen >= 3 ? 2 : 0;
    panel.innerHTML = `
      <div class="aufgabe-kopf"><div class="frage"><h1 class="auftrag">${KIND.auftrag[f.auftrag]}</h1>
        ${!gesperrt && offen >= 2 ? `<button class="btn leise so-gehts" type="button">${KIND.soGehts}</button>` : ''}</div>
        ${gesperrt ? '' : `<button class="btn leise hilfe-knopf" type="button"${offen >= maxHilfe ? ' disabled' : ''}>${LAMPE}${offen ? KIND.mehrHilfe : KIND.hilfe}</button>`}</div>
      <div class="aufgabe-bild${f.eingabe(a.bedingung).art === 'bild' && !gesperrt ? ' tippbar' : ''}">${f.zeichne(a.bedingung, { hilfe: gesperrt ? 0 : bildHilfe, gewaehlt: p.antwort })}</div>
      ${gesperrt ? '' : eingabeHtml(a, p.antwort, gesperrt)}
      ${gesperrt ? '' : hilfeHtml(a, offen)}
      ${p.zurueck ? `<p class="hinweis">${KIND.wartet}</p>` : ''}
      <p class="meldung">${meldung}</p>
      ${sitzung.aufgaben.length > 1 ? `<button class="btn leise weiter" type="button">${KIND.weiter} →</button>` : ''}`;
  }

  function zeichneKnopf(): void {
    knopf.disabled = busy || lernOffen() || !kannVergleichen(satz());
    knopf.hidden = ende();
  }

  function alles(): void {
    zeichneBuehne();
    zeichneAufgabe();
    zeichneKnopf();
  }

  function antworten(antwort: Antwort | null): void {
    sitzung = { ...sitzung, satz: setzeAntwort(satz(), aktuell(), antwort) };
    hupf = antwort ? aktuell() : null;
    meldung = '';
    if (antwort) klick();
    speichern();
    alles();
  }

  /** Eingabe: Lernbeispiel (sofortige Rückmeldung, nichts davon kommt in den Satz) oder echte Aufgabe */
  function eingabe(antwort: Antwort | null): void {
    if (lernOffen()) {
      const { a, st } = lernSchritt();
      const ergebnis = lernPruefen(format(), a, antwort);
      // falsch: die Antwort kehrt sofort zurück, Hilfe Stufe 2 erscheint auf dem Bild
      lernSetzen(ergebnis === 'falsch' ? { ...st, antwort: null, versucht: true } : { ...st, antwort });
      if (ergebnis === 'richtig') klick();
      speichern();
      return zeichneAufgabe();
    }
    antworten(antwort);
  }

  function aktuelleAntwort(): Antwort | null {
    return lernOffen() ? lernSchritt().st.antwort : satz().perlen[aktuell()].antwort;
  }

  buehne.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('.perle[data-i]');
    if (!b || busy || ende()) return;
    sitzung = { ...sitzung, aktuell: Number(b.dataset.i) };
    // ein Lernbeispiel auf Wunsch schließt sich; eins, das von selbst kommt, wartet beim selben Schritt
    const lb = sitzung.lernbeispiel;
    if (lb && !lernbeispielVorher(profil, lb.format)) lernSetzen(undefined);
    meldung = '';
    speichern();
    alles();
  });

  tonKnopf.addEventListener('click', () => {
    profil = { ...profil, ton: !profil.ton };
    tonAn(profil.ton);
    speichern();
    zeichneBuehne();
  });

  panel.addEventListener('click', (e) => {
    const t = e.target as Element;
    if (busy) return;
    const lern = lernOffen();
    const f = format();
    const wahlListe = lern ? lernSchritt().a.wahl : aufgabe().wahl;

    // Zahl: Ziffer, Platz oder Löschen ändert die Plätze; die Antwort ist ihr Wert (src/satz/zahleingabe.ts)
    const ziffer = t.closest<HTMLButtonElement>('[data-ziffer]');
    const platz = t.closest<HTMLButtonElement>('[data-platz]');
    const zahlKnopf = ziffer ?? platz;
    if (zahlKnopf && !zahlKnopf.disabled) {
      const a = lern ? lernSchritt().a : aufgabe();
      const e = f.eingabe(a.bedingung);
      if (e.art !== 'zahl') return;
      const alt = aktuelleAntwort();
      const h: Handlung = platz
        ? { art: 'platz', platz: Number(platz.dataset.platz) }
        : ziffer!.dataset.ziffer === 'x'
          ? { art: 'loeschen' }
          : { art: 'ziffer', ziffer: Number(ziffer!.dataset.ziffer) };
      const feld = zahlfeld(e, a.zahlenraum);
      const p = schritt(plaetzeZu(alt, feld), h, feld);
      plaetze = { wo: eingabeOrt(), p };
      const wert = wertVon(p);
      const neu: Antwort | null = wert === null ? null : { art: 'zahl', wert };
      // nur Wahl oder halbe Zahl geändert: neu zeichnen, an der Antwort ändert sich nichts
      if (gleich(neu, alt)) return zeichneAufgabe();
      return eingabe(neu);
    }
    const w = t.closest<HTMLButtonElement>('.wahl button');
    if (w && !w.disabled && wahlListe) return eingabe(wahlListe[Number(w.dataset.k)]);
    const bild = t.closest<SVGElement>('[data-wahl]');
    if (bild && wahlListe && t.closest('.tippbar')) return eingabe(wahlListe[Number(bild.getAttribute('data-wahl'))]);

    if (lern && t.closest('.lern-weiter')) {
      lernSetzen({ format: f.id, schritt: lernSchritt().k + 1, antwort: null, versucht: false });
      speichern();
      return zeichneAufgabe();
    }
    if (lern && t.closest('.los')) {
      // von selbst gezeigt und bis zum Ende gelöst: ab jetzt bekannt (aus neu wie aus nochmal)
      if (lernbeispielNoetig()) profil = { ...profil, formate: { ...profil.formate, [f.id]: 'bekannt' } };
      lernSetzen(undefined);
      speichern();
      return alles();
    }
    if (!lern && t.closest('.hilfe-knopf')) {
      const max: HilfeStufe = satz().runden > 0 ? 4 : 2;
      const neu = Math.min(max, sitzung.hilfeOffen[aktuell()] + 1) as HilfeStufe;
      const hilfeOffen = sitzung.hilfeOffen.map((h, i) => (i === aktuell() ? neu : h));
      const aufgaben = sitzung.aufgaben.map((x, i) => (i === aktuell() ? { ...x, hilfe: Math.max(x.hilfe, neu) as HilfeStufe } : x));
      sitzung = { ...sitzung, hilfeOffen, aufgaben };
      // Stufe 1 = Lernbeispiel, im eigenen Fenster
      if (neu === 1) lernSetzen(lernStart());
      speichern();
      return alles();
    }
    if (!lern && t.closest('.so-gehts')) {
      // Zeichen „So geht's“ (ab Hilfe Stufe 2): öffnet das Lernbeispiel, die Hilfestufe bleibt
      lernSetzen(lernStart());
      speichern();
      return alles();
    }
    if (t.closest('.spaeter')) {
      sitzung = { ...sitzung, satz: zuruecklegen(satz(), aktuell()) };
      speichern();
      if (fertig(satz())) return beenden();
      return alles();
    }
    if (t.closest('.neuer-satz')) {
      sitzung = neueSitzung(neuerSamen());
      neuerBuchstabe = null;
      wackeln = [];
      meldung = '';
      speichern();
      return alles();
    }
    if (t.closest('.weiter')) {
      const n = satz().perlen.length;
      const offen = (j: number) => aenderbar(satz(), j) && satz().perlen[j].antwort === null;
      const ziel = [...Array(n).keys()].map((d) => (aktuell() + 1 + d) % n).find((j) => offen(j)) ?? [...Array(n).keys()].map((d) => (aktuell() + 1 + d) % n).find((j) => aenderbar(satz(), j));
      if (ziel !== undefined) {
        sitzung = { ...sitzung, aktuell: ziel };
        meldung = '';
        speichern();
        alles();
      }
    }
  });

  // Tastatur im Bild (Wer ist es?)
  panel.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && (e.target as Element).closest('[data-wahl]')) {
      e.preventDefault();
      (e.target as Element).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
  });

  function beenden(): void {
    const r = abschliessen(sitzung, profil, historie);
    sitzung = r.sitzung;
    profil = r.profil;
    historie = r.historie;
    neuerBuchstabe = r.neuerBuchstabe;
    if (r.neuerBuchstabe !== null) fertigTon();
    speichern(true);
    alles();
  }

  knopf.addEventListener('click', async () => {
    if (busy || lernOffen() || !kannVergleichen(satz())) return;
    const vorher = satz();
    const r = vergleiche(vorher, stimmtFuer(sitzung));
    busy = true;
    wackeln = [];
    meldung = '';
    rascheln();
    let zwischen = { ...vorher, runden: r.satz.runden };
    for (const i of r.gehoben) {
      zwischen = { ...zwischen, perlen: zwischen.perlen.map((p, j) => (j === i ? r.satz.perlen[i] : p)) };
      sitzung = { ...sitzung, satz: zwischen };
      hebt = i;
      heben(r.satz.perlen[i].blatt === 'gold');
      alles();
      await warte(pause());
    }
    hebt = null;
    sitzung = { ...sitzung, satz: r.satz };
    busy = false;
    wackeln = r.bleiben;
    if (!fertig(r.satz)) {
      const ziel = r.bleiben.find((i) => !r.satz.perlen[i].zurueck);
      if (ziel !== undefined) sitzung = { ...sitzung, aktuell: ziel };
      meldung = r.wiederholung ? KIND.nichtsGeaendert : KIND.blattBleibt;
      speichern();
      alles();
    } else beenden();
    if (wackeln.length) {
      setTimeout(() => {
        wackeln = [];
        zeichneBuehne();
      }, 3 * pause() + 200);
    }
  });

  speichern();
  alles();
}
