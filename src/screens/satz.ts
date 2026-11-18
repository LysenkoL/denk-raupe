import { KIND } from '../i18n/kind';
import { gleich, type Antwort } from '../perlen/antwort';
import { perlenBild } from '../perlen/perle';
import { perleSvg } from '../perlen/maler';
import { blattFigur } from '../bilder/bilder';
import { kachelBildSvg, laterneSvg } from '../bilder/figuren';
import { korbHtml, szeneHtml } from '../satz/szene';
import { FORMATE } from '../aufgaben';
import { aufgabeAus, lernbeispiel, lernPruefen, type Aufgabe, type HilfeStufe } from '../aufgaben/format';
import { neuerSamen } from '../core/zufall';
import { ladeGeschuetzt, schreibenMehrere } from '../core/speicher';
import { buchstabeTon, goldTon, knopfTon, korbTon, perleTon, rascheln, setzenTon, tonAn } from '../app/ton';
import {
  abschliessen,
  ladeProfil,
  ladeSitzung,
  lernbeispielVorher,
  naechsteSitzung,
  neuesProfil,
  stimmtFuer,
  type LernZustand,
  type Profil,
  type Sitzung,
} from '../satz/sitzung';
import { HISTORIE_SCHLUESSEL, historieLesen, type Historie } from '../satz/historie';
import { hilfeOeffnen, hilfePulst, hoechsteHilfe, pulsNachfuehren } from '../satz/hilfe';
import { ausWert, schritt, stellenwerte, wertVon, zahlfeld, type Handlung, type Plaetze, type Zahlfeld } from '../satz/zahleingabe';
import { aenderbar, blaetter, fertig, kannVergleichen, setzeAntwort, vergleiche, zuruecklegen, type Ergebnis } from '../satz/vergleich';

/**
 * Satz-Bildschirm (docs/STIL.md, Abschnitt 8): vier Zonen in fester Reihenfolge –
 * 1. Ast mit Raupe, Zwilling und Nestern, rechts Hilfe (Laterne) und „Später“;
 * 2. Frage auf einem Brettchen; 3. Arbeitsfeld auf Papier; 4. Eingabe-Tablett.
 * Telefon: untereinander; Tablet: Feld links, Tablett rechts (app.css).
 *
 * Bewegung (Abschnitt 9): das Modell nimmt jede Handlung einmal an und speichert sie; die Bewegung zeigt
 * danach nur noch das gespeicherte Ergebnis. Bei „weniger Bewegung“ steht sofort derselbe Endzustand da.
 */

const TON_AN = `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>`;
const TON_AUS = `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 9l5 6M21.5 9l-5 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>`;
const LOESCHEN = `<svg viewBox="0 0 32 24" width="34" height="26" aria-hidden="true"><path d="M10 3h17a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H10l-8-9z" fill="currentColor" opacity=".18"/><path d="M10 3h17a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H10l-8-9z" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M15 8.5l7 7M22 8.5l-7 7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>`;

const PFEIL = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6.5l5.5 5.5-5.5 5.5" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/** Dauer eines Pulses des Hilfeknopfs (wie `--puls` in tokens.css) */
const PULS_MS = 1700;
const warte = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
const bewegung = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Zeit-Token aus tokens.css in ms */
const token = (name: string) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0;

export async function renderSatz(app: HTMLElement): Promise<void> {
  // Unbekanntes (neuere Version, kaputt) bleibt unter „…-unbekannt“, bevor hier etwas überschrieben wird
  let profil: Profil = (await ladeGeschuetzt('profil', ladeProfil)) ?? neuesProfil();
  // ein Satz von vor A6 kann schon so weit sein, dass der Hilfeknopf pulsiert: gleich für die Historie festhalten
  // ohne gespeicherten Satz: ein neuer, mit einer zurückgelegten Aufgabe aus dem Profil, falls eine wartet
  let sitzung: Sitzung = pulsNachfuehren((await ladeGeschuetzt('sitzung', ladeSitzung)) ?? naechsteSitzung(neuerSamen(), profil));
  let historie: Historie = await historieLesen();
  tonAn(profil.ton);

  // flüchtiger Zustand (wird nicht gespeichert): nur für die Bewegung
  let meldung = '';
  let busy = false;
  let neuerBuchstabe: number | null = null;
  /** Ende frisch erreicht: Blätter rieseln in den Korb, der Buchstabe fliegt ein, dann die Kacheln */
  let endeFrisch = false;
  /** Perle, die gerade zur Antwort geworden ist (Einflug und Welle) */
  let frisch: number | null = null;
  /** was gerade in ein Nest gesetzt wurde: `platz:k` (Zahl) oder `bild` (Lücke, Stein, Fische) */
  let gesetzt: string | null = null;
  /** falsche Antwort im Lernbeispiel, die gerade zum Tablett zurückkehrt (nur mit Bewegung) */
  let geist: Antwort | null = null;
  /** Vergleichen läuft: diese Blätter liegen noch, bis sie an der Reihe sind; Zahl im Korb bis dahin */
  let verdeckt: number[] = [];
  let korbAnzeige: number | null = null;
  let wackeln: number[] = [];
  /**
   * Plätze der Zahleingabe zur offenen Aufgabe (oder zum Schritt des Lernbeispiels). Nicht gespeichert:
   * nach Neuladen, anderer Perle oder geänderter Antwort entstehen sie aus der gespeicherten Zahl neu.
   * Nur so bleibt eine halbe Zahl (Z belegt, E leer) stehen, solange das Kind an dieser Aufgabe ist.
   */
  let plaetze: { wo: string; p: Plaetze } | null = null;

  app.innerHTML = `<main class="satz">
    <section class="ast-zone" aria-label="${KIND.deineRaupe}"><div class="buehne-platz"></div><div class="werkzeug"></div></section>
    <section class="aufgabe" aria-live="polite"></section>
    <div class="unten"><button class="btn haupt vergleichen" type="button">${KIND.vergleichen}</button></div>
  </main>`;
  const astZone = app.querySelector<HTMLElement>('.ast-zone')!;
  const buehne = app.querySelector<HTMLElement>('.buehne-platz')!;
  const werkzeug = app.querySelector<HTMLElement>('.werkzeug')!;
  const panel = app.querySelector<HTMLElement>('.aufgabe')!;
  const unten = app.querySelector<HTMLElement>('.unten')!;
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
  /** Blätter im Korb: alle bisherigen und die dieses Satzes, solange er noch nicht gezählt ist */
  const korbZahl = () => profil.blaetter + (sitzung.gezaehlt ? 0 : blaetter(satz()).wert);

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
    // Blinzeln und Fühler laufen mit der Uhr weiter, auch wenn der Ast neu gezeichnet wird
    astZone.style.setProperty('--phase', `-${Math.round(performance.now() % token('--blinzeln') || 0)}ms`);
    buehne.innerHTML = szeneHtml(satz(), {
      aktuell: ende() || busy ? null : aktuell(),
      wackeln,
      verdeckt,
      frisch: bewegung() ? frisch : null,
      korb: korbAnzeige ?? korbZahl(),
    });
    frisch = null;
  }

  /** Ton, Hilfe und „Später“ rechts am Ast */
  function zeichneWerkzeug(): void {
    const tonKnopf = `<button class="leise-knopf ton-knopf" type="button" aria-label="${KIND.ton}" aria-pressed="${profil.ton}">${profil.ton ? TON_AN : TON_AUS}</button>`;
    let hilfe = '';
    if (!ende() && !lernOffen() && !busy) {
      const p = satz().perlen[aktuell()];
      const gesperrt = !aenderbar(satz(), aktuell());
      if (!gesperrt) {
        const offen = sitzung.hilfeOffen[aktuell()];
        // Hilfeknopf gegen Durchprobieren: pulsiert nur nach der Zahl der Fehlprüfungen (src/satz/hilfe.ts).
        // Die Phase läuft mit der Uhr weiter, damit Neuzeichnen beim Tippen den Puls nicht von vorn beginnt.
        const pulst = hilfePulst(sitzung, aktuell());
        const puls = pulst ? ` data-puls="ja" style="--puls-phase: -${Math.round(performance.now() % PULS_MS)}ms"` : '';
        if (offen >= 4 && !p.zurueck) hilfe += `<button class="btn leise spaeter" type="button">${KIND.spaeterKnopf}</button>`;
        hilfe += `<button class="hilfe-knopf" type="button"${puls}${offen >= hoechsteHilfe(satz()) ? ' disabled' : ''}>${laterneSvg()}<span class="sr">${offen ? KIND.mehrHilfe : KIND.hilfe}</span></button>`;
      }
    }
    werkzeug.innerHTML = hilfe + tonKnopf;
  }

  function eingabeHtml(a: Aufgabe, antwort: Antwort | null, gesperrt: boolean, geistWert: Antwort | null = null): string {
    const f = FORMATE[a.format];
    const dis = gesperrt ? ' disabled' : '';
    const e = f.eingabe(a.bedingung);
    const art = e.art;
    if (e.art === 'zahl') {
      // Plätze über den Ziffern: Zehner links, Einer rechts; ihr Aussehen hängt nie davon ab, ob die Zahl stimmt
      // Feld aus Format und Zahlenraum, nie aus der Aufgabe (harte Regel 7)
      const feld = zahlfeld(e, a.zahlenraum);
      const p = plaetzeZu(antwort, feld);
      // falsche Zahl im Lernbeispiel: ihre Ziffern kehren aus den Nestern zum Tablett zurück
      const g = geistWert?.art === 'zahl' ? ausWert(geistWert.wert, feld) : null;
      const plaetzeHtml = stellenwerte(feld)
        .map((sw, k) => {
          const d = p.stellen[k];
          const st = KIND.stelle[sw];
          const gd = g?.stellen[k] ?? null;
          const setzt = gesetzt === `platz:${k}` ? ' setzt' : '';
          return `<button type="button" class="platz" data-platz="${k}" aria-label="${st.name}" aria-describedby="platz-${k}" aria-pressed="${p.gewaehlt === k}"${dis}>
            <span class="platz-zeichen" aria-hidden="true">${st.zeichen}</span>
            <span class="nest${d === null ? ' leer' : ''}${setzt}">${d === null ? '' : perleSvg(perlenBild({ art: 'zahl', wert: d }))}${d === null && gd !== null ? `<span class="geist" aria-hidden="true">${perleSvg(perlenBild({ art: 'zahl', wert: gd }))}</span>` : ''}</span>
            <span id="platz-${k}" hidden>${d === null ? KIND.platzLeer : d}</span></button>`;
        })
        .join('');
      const ziffern = Array.from({ length: 10 }, (_, d) => `<button type="button" class="ziffer" data-ziffer="${d}" aria-label="${d}"${dis}>${perleSvg(perlenBild({ art: 'zahl', wert: d }))}</button>`).join('');
      const nichtsDa = p.stellen.every((d) => d === null);
      return `<div class="zahl-eingabe" role="group" aria-label="${KIND.zahlEingeben}">
        <div class="plaetze" data-plaetze="${p.stellen.length}">${plaetzeHtml}</div>
        <div class="ziffern">${ziffern}<button type="button" class="loeschen" data-ziffer="x" aria-label="${KIND.loeschen}"${dis || (nichtsDa ? ' disabled' : '')}>${LOESCHEN}</button></div></div>`;
    }
    if (art === 'wahl')
      return `<div class="wahl" role="group">${a.wahl!.map((w, k) => `<button type="button" data-k="${k}" aria-pressed="${gleich(antwort, w)}" aria-label="${perlenBild(w).name}"${dis}><span class="mulde" aria-hidden="true"></span>${perleSvg(perlenBild(w))}</button>`).join('')}</div>`;
    return ''; // 'bild': im Bild tippen
  }

  /** Hilfe 3 (wenn der Schritt verraten würde) und 4: ähnliche Aufgabe auf einem eigenen Brettchen neben dem Feld */
  function hilfeHtml(a: Aufgabe, stufe: HilfeStufe): string {
    const f = FORMATE[a.format];
    if (stufe === 3 && f.schrittVerraet?.(a.bedingung)) {
      const ae = aehnlich(a);
      // der Schritt an der ähnlichen Aufgabe darf zeigen, was er an der eigenen verraten würde
      return `<div class="hilfe-box"><p class="hilfe-titel">${KIND.aehnlich}</p><div class="aufgabe-bild">${f.zeichne(ae.bedingung, { hilfe: 3, gewaehlt: null, aehnlich: true })}</div></div>`;
    }
    if (stufe === 4) {
      const ae = aehnlich(a);
      return `<div class="hilfe-box"><p class="hilfe-titel">${KIND.aehnlich}</p><div class="aufgabe-bild">${f.zeichne(ae.bedingung, { hilfe: 0, gewaehlt: null, vorrechnen: true })}</div></div>`;
    }
    // Stufe 1 ist das Lernbeispiel im eigenen Fenster; danach bleibt nichts davon stehen
    return '';
  }

  function zeichneEnde(): void {
    const b = blaetter(satz());
    const zurueck = satz().perlen.some((p) => p.zurueck);
    const g = profil.geheim;
    const blaetterHtml = [...Array.from({ length: b.gold }, () => 'gold' as const), ...Array.from({ length: b.normal }, () => 'normal' as const)]
      .map((art, k) => `<span class="blatt-img" data-blatt="${art}" style="--k:${k}">${blattFigur(art)}</span>`)
      .join('');
    const kachel = (cls: string, bild: 'welt' | 'satz' | 'pause', text: string, k: number) =>
      `<button class="kachel ${cls}" type="button" style="--k:${k}"><span class="kachel-bild">${kachelBildSvg(bild)}</span><span class="kachel-text">${text}</span></button>`;
    panel.innerHTML = `<div class="ende${endeFrisch && bewegung() ? ' frisch' : ''}">
      <h2>${KIND.fertigTitel}</h2>
      <div class="korb-buehne" style="--n:${b.gold + b.normal}">
        <div class="korb" aria-hidden="true">${blaetterHtml}</div>
        ${korbHtml(profil.blaetter, true, 'gross')}
      </div>
      <p>${KIND.fertigKorb}</p>
      ${zurueck ? `<p class="hinweis">${KIND.spaeter}</p>` : ''}
      <div class="geheim" role="img" aria-label="${KIND.geheimwort}">${[...g.wort].map((c, i) => `<span class="${g.offen.includes(i) ? 'auf' : ''}${i === neuerBuchstabe ? ' neu' : ''}">${g.offen.includes(i) ? c : ''}</span>`).join('')}</div>
      ${neuerBuchstabe !== null ? `<p class="hinweis">${KIND.neuerBuchstabe}</p>` : ''}
      <div class="kacheln">${kachel('welt', 'welt', KIND.welt, 0)}${kachel('neuer-satz', 'satz', KIND.neuerSatz, 1)}${kachel('pause', 'pause', KIND.pause, 2)}</div>
    </div>`;
    if (endeFrisch && bewegung() && neuerBuchstabe !== null) setTimeout(buchstabeTon, token('--korb-flug') * 2);
    endeFrisch = false;
  }

  /** Brettchen mit der Frage (Zone 2); `zeichen`: „So geht's“ als Lesezeichen daneben */
  const frageHtml = (text: string, zeichen: string, weiter = '') => `<div class="frage-brett"><h1 class="auftrag">${text}</h1>${zeichen}${weiter}</div>`;

  /** Arbeitsfeld auf Papier (Zone 3) */
  function feldHtml(bild: string, o: { tippbar: boolean; mitGeist: boolean }): string {
    const k = ['aufgabe-bild'];
    if (o.tippbar) k.push('tippbar');
    if (gesetzt === 'bild') k.push('setzt');
    if (o.mitGeist) k.push('geist');
    return `<div class="${k.join(' ')}">${bild}</div>`;
  }

  /**
   * Lernbeispiel (docs/TZ.md, „Самопроверка“, Nr. 8): 2–3 Schritte mit sofortiger Rückmeldung, ohne Perlen,
   * Blätter und Historie. Richtig → „Genau so!“ und weiter; falsch → die Antwort kehrt (sanft) zurück,
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
    const g = geist;
    const bild = f.zeichne(a.bedingung, { hilfe: st.versucht && !richtig ? 2 : 0, gewaehlt: g ?? st.antwort });
    panel.innerHTML = `<div class="tisch lern" data-schritt="${k}">
      ${frageHtml(KIND.auftrag[f.auftrag], `<p class="lern-titel">${KIND.soGehts}</p>`)}
      <div class="feld">${feldHtml(bild, { tippbar: f.eingabe(a.bedingung).art === 'bild' && !richtig, mitGeist: !!g })}</div>
      <div class="lotte">
        ${eingabeHtml(a, st.antwort, richtig, g)}
        <p class="meldung">${richtig ? KIND.genau : st.versucht ? KIND.nochmalSchauen : ''}</p>
        ${richtig && !letzter ? `<button class="btn haupt lern-weiter" type="button">${KIND.weiter}</button>` : ''}
        ${los ? `<button class="btn ${los} los" type="button">${KIND.losGehts}</button>` : ''}
      </div>
    </div>`;
  }

  function zeichneAufgabe(): void {
    zeichneWerkzeug();
    if (ende()) return zeichneEnde();
    if (lernOffen()) {
      zeichneLernbeispiel();
      gesetzt = null;
      return;
    }
    const a = aufgabe();
    const f = format();
    const p = satz().perlen[aktuell()];
    const gesperrt = !aenderbar(satz(), aktuell()) || busy;
    const offen = sitzung.hilfeOffen[aktuell()];
    const bildHilfe: HilfeStufe = offen === 2 || (offen >= 3 && !f.schrittVerraet?.(a.bedingung)) ? (Math.min(offen, 3) as HilfeStufe) : offen >= 3 ? 2 : 0;
    const soGehts = !gesperrt && offen >= 2 ? `<button class="leise-knopf so-gehts" type="button">${KIND.soGehts}</button>` : '';
    const eingabe = gesperrt ? '' : eingabeHtml(a, p.antwort, gesperrt);
    panel.innerHTML = `<div class="tisch${eingabe ? '' : ' ohne-eingabe'}">
      ${frageHtml(KIND.auftrag[f.auftrag], soGehts, sitzung.aufgaben.length > 1 ? `<button class="leise-knopf weiter" type="button" aria-label="${KIND.weiter}"><span class="weiter-text">${KIND.weiter}</span>${PFEIL}</button>` : '')}
      <div class="feld">
        ${feldHtml(f.zeichne(a.bedingung, { hilfe: gesperrt ? 0 : bildHilfe, gewaehlt: p.antwort }), { tippbar: f.eingabe(a.bedingung).art === 'bild' && !gesperrt, mitGeist: false })}
        ${gesperrt ? '' : hilfeHtml(a, offen)}
      </div>
      <div class="lotte">
        ${eingabe}
        ${p.zurueck ? `<p class="hinweis">${KIND.wartet}</p>` : ''}
        <p class="meldung">${meldung}</p>
      </div>
    </div>`;
    gesetzt = null;
  }

  function zeichneKnopf(): void {
    knopf.disabled = busy || lernOffen() || !kannVergleichen(satz());
    unten.hidden = ende();
    app.querySelector('.satz')!.classList.toggle('am-ende', ende());
  }

  function alles(): void {
    zeichneBuehne();
    zeichneAufgabe();
    zeichneKnopf();
  }

  /** Antwort ins Modell, speichern, dann zeigen: Perle fliegt ein, Welle über die Raupe */
  function antworten(antwort: Antwort | null): void {
    const vorher = satz().perlen[aktuell()].antwort;
    sitzung = { ...sitzung, satz: setzeAntwort(satz(), aktuell(), antwort) };
    frisch = antwort && !gleich(antwort, vorher) ? aktuell() : null;
    meldung = '';
    if (antwort) perleTon(antwort.art === 'zahl' ? antwort.wert : null);
    speichern();
    alles();
  }

  /** Eingabe: Lernbeispiel (sofortige Rückmeldung, nichts davon kommt in den Satz) oder echte Aufgabe */
  function eingabe(antwort: Antwort | null): void {
    if (lernOffen()) {
      const { a, st } = lernSchritt();
      const ergebnis = lernPruefen(format(), a, antwort);
      // falsch: die Antwort kehrt sofort zurück (gespeichert), mit Bewegung gleitet sie sichtbar zum Tablett
      lernSetzen(ergebnis === 'falsch' ? { ...st, antwort: null, versucht: true } : { ...st, antwort });
      speichern();
      if (ergebnis === 'falsch' && antwort && bewegung()) {
        geist = antwort;
        setTimeout(() => {
          geist = null;
          if (lernOffen()) zeichneAufgabe();
        }, token('--zurueck'));
      }
      if (antwort) (ergebnis === 'richtig' ? perleTon(antwort.art === 'zahl' ? antwort.wert : null) : setzenTon());
      return zeichneAufgabe();
    }
    antworten(antwort);
  }

  function aktuelleAntwort(): Antwort | null {
    return lernOffen() ? lernSchritt().st.antwort : satz().perlen[aktuell()].antwort;
  }

  /** Perle des Kindes oder liegen gebliebenes Blatt: zu dieser Aufgabe */
  buehne.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-i]');
    if (!b || busy || ende()) return;
    sitzung = { ...sitzung, aktuell: Number(b.dataset.i) };
    // ein Lernbeispiel auf Wunsch schließt sich; eins, das von selbst kommt, wartet beim selben Schritt
    const lb = sitzung.lernbeispiel;
    if (lb && !lernbeispielVorher(profil, lb.format)) lernSetzen(undefined);
    meldung = '';
    setzenTon();
    speichern();
    alles();
  });

  /** Zonen 1 bis 4: Knöpfe der Hilfe, des Tabletts und des Endes */
  function tippen(e: Event): void {
    const t = e.target as Element;
    if (t.closest('.ton-knopf')) {
      profil = { ...profil, ton: !profil.ton };
      tonAn(profil.ton);
      knopfTon();
      speichern();
      return zeichneWerkzeug();
    }
    if (busy) return;
    if (t.closest('.kachel.welt')) return void (knopfTon(), (location.hash = '#/welt'));
    if (t.closest('.kachel.pause')) return void (knopfTon(), (location.hash = '#/pause'));
    if (t.closest('.neuer-satz')) {
      knopfTon();
      // eine zurückgelegte Aufgabe kommt zurück, wie sie war – auf dem Bildschirm ohne eigenes Zeichen
      sitzung = naechsteSitzung(neuerSamen(), profil);
      neuerBuchstabe = null;
      wackeln = [];
      meldung = '';
      speichern();
      return alles();
    }
    if (ende()) return;
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
      const vorher = plaetzeZu(alt, feld);
      const p = schritt(vorher, h, feld);
      plaetze = { wo: eingabeOrt(), p };
      // die Ziffer, die gerade in ein Nest kam, setzt sich hinein (Bewegung „Teil ins Nest“)
      const k = p.stellen.findIndex((d, j) => d !== null && d !== vorher.stellen[j]);
      gesetzt = k >= 0 ? `platz:${k}` : null;
      const wert = wertVon(p);
      const neu: Antwort | null = wert === null ? null : { art: 'zahl', wert };
      // nur Wahl oder halbe Zahl geändert: neu zeichnen, an der Antwort ändert sich nichts
      if (gleich(neu, alt)) {
        if (h.art !== 'platz') setzenTon();
        if (wert !== null) gesetzt = 'bild';
        return zeichneAufgabe();
      }
      if (neu) gesetzt = gesetzt ?? 'bild';
      return eingabe(neu);
    }
    const w = t.closest<HTMLButtonElement>('.wahl button');
    if (w && !w.disabled && wahlListe) {
      gesetzt = 'bild';
      return eingabe(wahlListe[Number(w.dataset.k)]);
    }
    const bild = t.closest<SVGElement>('[data-wahl]');
    if (bild && wahlListe && t.closest('.tippbar')) {
      gesetzt = 'bild';
      return eingabe(wahlListe[Number(bild.getAttribute('data-wahl'))]);
    }

    if (lern && t.closest('.lern-weiter')) {
      knopfTon();
      lernSetzen({ format: f.id, schritt: lernSchritt().k + 1, antwort: null, versucht: false });
      speichern();
      return zeichneAufgabe();
    }
    if (lern && t.closest('.los')) {
      knopfTon();
      // von selbst gezeigt und bis zum Ende gelöst: ab jetzt bekannt (aus neu wie aus nochmal)
      if (lernbeispielNoetig()) profil = { ...profil, formate: { ...profil.formate, [f.id]: 'bekannt' } };
      lernSetzen(undefined);
      speichern();
      return alles();
    }
    if (!lern && t.closest('.hilfe-knopf')) {
      knopfTon();
      // nächste Stufe; ein pulsierender Knopf hört auf und zählt ab hier neu
      sitzung = hilfeOeffnen(sitzung);
      // Stufe 1 = Lernbeispiel, im eigenen Fenster
      if (sitzung.hilfeOffen[aktuell()] === 1) lernSetzen(lernStart());
      speichern();
      return alles();
    }
    if (!lern && t.closest('.so-gehts')) {
      knopfTon();
      // Zeichen „So geht's“ (ab Hilfe Stufe 2): öffnet das Lernbeispiel, die Hilfestufe bleibt
      lernSetzen(lernStart());
      speichern();
      return alles();
    }
    if (t.closest('.spaeter')) {
      knopfTon();
      sitzung = { ...sitzung, satz: zuruecklegen(satz(), aktuell()) };
      speichern();
      if (fertig(satz())) {
        abschluss();
        endeFrisch = true;
      }
      return alles();
    }
    if (t.closest('.weiter')) {
      const n = satz().perlen.length;
      const offen = (j: number) => aenderbar(satz(), j) && satz().perlen[j].antwort === null;
      const reihe = [...Array(n).keys()].map((d) => (aktuell() + 1 + d) % n);
      const ziel = reihe.find((j) => offen(j)) ?? reihe.find((j) => aenderbar(satz(), j));
      if (ziel !== undefined) {
        knopfTon();
        sitzung = { ...sitzung, aktuell: ziel };
        meldung = '';
        speichern();
        alles();
      }
    }
  }
  panel.addEventListener('click', tippen);
  werkzeug.addEventListener('click', tippen);

  // Tastatur im Bild (Wer ist es?)
  panel.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && (e.target as Element).closest('[data-wahl]')) {
      e.preventDefault();
      (e.target as Element).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
  });

  /** Die Raupe schaut, wo das Kind tippt: Pupillen 2–3 px zum Ort der Handlung (Abschnitt 9, „Гусеница следит“) */
  app.addEventListener(
    'pointerdown',
    (e) => {
      if (!bewegung()) return;
      const kopf = buehne.querySelector('.raupe-zeile.kind .vorne');
      if (!kopf) return;
      const r = kopf.getBoundingClientRect();
      if (!r.width) return;
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height * 0.33);
      const d = Math.hypot(dx, dy) || 1;
      // Weg in Bildschirm-Pixeln, umgerechnet in Einheiten des Vorderteils (120 breit)
      const weg = token('--blick-weg') * (120 / r.width);
      astZone.style.setProperty('--blick-x', ((dx / d) * weg).toFixed(2));
      astZone.style.setProperty('--blick-y', ((dy / d) * weg).toFixed(2));
    },
    { passive: true },
  );

  /** Satz abschließen: Profil, Historie und Satz zusammen speichern (einmal je Satz) */
  function abschluss(): void {
    const r = abschliessen(sitzung, profil, historie);
    sitzung = r.sitzung;
    profil = r.profil;
    historie = r.historie;
    neuerBuchstabe = r.neuerBuchstabe;
    speichern(true);
  }

  /**
   * Blätter heben sich in einer Welle von links nach rechts, jedes fliegt im Bogen in den Korb.
   * Unter einem Blatt, das liegen bleibt, liegt in jedem Bild das leere Nest (es wird nie angefasst).
   */
  async function blaetterHeben(r: Ergebnis, korbVorher: number): Promise<void> {
    const flug: Promise<unknown>[] = [];
    const abstand = token('--blatt-abstand');
    const heben = token('--blatt-heben');
    const flugZeit = token('--korb-flug');
    korbAnzeige = korbVorher;
    verdeckt = [...r.gehoben];
    alles();
    for (const [n, i] of r.gehoben.entries()) {
      await warte(n === 0 ? 120 : abstand);
      const platz = buehne.querySelector<HTMLElement>(`.zwilling [data-zi="${i}"]`);
      const blatt = platz?.querySelector<HTMLElement>('.blatt');
      const korb = buehne.querySelector<HTMLElement>('.korb-figur');
      const p = satz().perlen[i];
      if (!platz || !blatt || !korb || !p.antwort) continue;
      const gold = p.blatt === 'gold';
      // erst jetzt, da sich genau dieses Blatt hebt, liegt die Perle darunter
      platz.querySelector('.unter')!.innerHTML = perleSvg(perlenBild(p.antwort));
      if (gold) blatt.innerHTML = blattFigur('gold');
      blatt.classList.add('fliegt');
      rascheln();
      if (gold) goldTon();
      const von = blatt.getBoundingClientRect();
      const nach = korb.getBoundingClientRect();
      const dx = nach.left + nach.width / 2 - (von.left + von.width / 2);
      const dy = nach.top + nach.height * 0.35 - (von.top + von.height / 2);
      const hoch = -Math.max(40, von.height);
      const gesamt = heben + flugZeit;
      const a = heben / gesamt;
      const anim = blatt.animate(
        [
          { translate: '0 0', rotate: '0deg', scale: '1', offset: 0 },
          { translate: `0 ${hoch * 0.6}px`, rotate: '-10deg', scale: '1.04', offset: a },
          { translate: `${dx * 0.5}px ${Math.min(hoch, dy) - 30}px`, rotate: '12deg', scale: '0.75', offset: a + (1 - a) * 0.5 },
          { translate: `${dx}px ${dy}px`, rotate: '24deg', scale: '0.4', offset: 1 },
        ],
        { duration: gesamt, easing: 'ease-in-out', fill: 'forwards' },
      );
      flug.push(
        anim.finished.then(() => {
          blatt.style.visibility = 'hidden';
          korbAnzeige = (korbAnzeige ?? 0) + (gold ? 2 : 1);
          const schild = korb.querySelector('.korb-schild');
          if (schild) schild.textContent = String(korbAnzeige);
          korb.classList.remove('hupft');
          void korb.offsetWidth;
          korb.classList.add('hupft');
          korbTon();
        }, () => null),
      );
    }
    await Promise.all(flug);
  }

  knopf.addEventListener('click', async () => {
    if (busy || lernOffen() || !kannVergleichen(satz())) return;
    knopfTon();
    const korbVorher = korbZahl();
    const r = vergleiche(satz(), stimmtFuer(sitzung));
    // das Modell nimmt das Vergleichen einmal an; gespeichert wird sofort
    sitzung = pulsNachfuehren({ ...sitzung, satz: r.satz });
    wackeln = [];
    meldung = '';
    const fertigJetzt = fertig(r.satz);
    if (!fertigJetzt) {
      const ziel = r.bleiben.find((i) => !r.satz.perlen[i].zurueck);
      if (ziel !== undefined) sitzung = { ...sitzung, aktuell: ziel };
      meldung = r.wiederholung ? KIND.nichtsGeaendert : KIND.blattBleibt;
      speichern();
    } else abschluss();
    // die Bewegung zeigt nur noch, was schon gespeichert ist
    if (bewegung() && r.gehoben.length) {
      busy = true;
      await blaetterHeben(r, korbVorher);
      busy = false;
    }
    verdeckt = [];
    korbAnzeige = null;
    wackeln = bewegung() ? r.bleiben : [];
    endeFrisch = fertigJetzt;
    alles();
    // nur einmal wackeln: beim nächsten Zeichnen liegen die Blätter still, die Marke bleibt
    wackeln = [];
  });

  speichern();
  alles();
}
