import '../styles/satz.css';
import { FORMATE } from '../aufgaben';
import { aufgabeAus, lernbeispiel, lernPruefen, type Aufgabe, type HilfeStufe } from '../aufgaben/format';
import { KIND } from '../i18n/kind';
import { gleich, type Antwort } from '../perlen/antwort';
import { perlenBild } from '../perlen/perle';
import { formPfad, perleSvg } from '../perlen/maler';
import { FORM_FARBEN, ZIFFER_KANTEN } from '../design/farbe';
import { GLAS, KACHEL_RAND } from '../design/glas';
import { neuerSamen } from '../core/zufall';
import { ladeGeschuetzt, schreibenMehrere } from '../core/speicher';
import { buchstabeTon, goldTon, knopfTon, korbTon, perleTon, rascheln, setzenTon, tonAn } from '../app/ton';
import { zurueckMarkeSvg } from '../bilder/figuren';
import {
  abschliessen,
  ladeProfil,
  ladeSitzung,
  lernbeispielVorher,
  naechsteSitzung,
  neuesProfil,
  stimmtFuer,
  type GestenZustand,
  type LernZustand,
  type Profil,
  type Sitzung,
} from '../satz/sitzung';
import { HISTORIE_SCHLUESSEL, historieLesen, type Historie } from '../satz/historie';
import { hilfeOeffnen, hilfePulst, hoechsteHilfe, pulsNachfuehren } from '../satz/hilfe';
import { tippe, zahlfeld, type Zahlfeld } from '../satz/zahleingabe';
import { aenderbar, blaetter, fertig, kannVergleichen, setzeAntwort, vergleiche, zuruecklegen } from '../satz/vergleich';
import { fingerZiel, GESTE, gesteBild, gestePruefen } from '../satz/geste';
import raupeBild from '../bilder/k1/raupe.webp';
import zwillingBild from '../bilder/k1/zwilling.webp';
import raupeLiegtBild from '../bilder/k1/raupe-liegt.webp';
import blattBild from '../bilder/k1/blatt.webp';
import blattGoldBild from '../bilder/k1/blatt-gold.webp';
import laterneBild from '../bilder/k1/laterne.webp';
import korbVollBild from '../bilder/k1/korb-voll.webp';
import wieseHoch from '../bilder/welten/wiese-hoch.webp';
import teichHoch from '../bilder/welten/teich-hoch.webp';
import herbstHoch from '../bilder/welten/herbst-hoch.webp';
import lavendelHoch from '../bilder/welten/lavendel-hoch.webp';
import gluehHoch from '../bilder/welten/gluehwuermchen-hoch.webp';
import gluehQuer from '../bilder/welten/gluehwuermchen-quer.webp';
import wieseQuer from '../bilder/welten/wiese-quer.webp';
import teichQuer from '../bilder/welten/teich-quer.webp';
import herbstQuer from '../bilder/welten/herbst-quer.webp';
import lavendelQuer from '../bilder/welten/lavendel-quer.webp';

/**
 * Satzbildschirm (A10): Облик «стекло» (docs/STIL.md, «Облик экрана набора: стекло», Probe 7c) mit allem, was der
 * Satz braucht – Speichern nach jeder Änderung, Historie, Lernbeispiel, Hilfeleiter, Puls des Hilfeknopfs,
 * zurückgelegte Aufgaben, allgemeines Beispiel der Geste und Finger.
 *
 * Regeln (docs/STIL.md, „Управление набором — одна стеклянная бусина“):
 * - nur die Perle auf dem Blatt unten schickt die Antwort; Ziffern, Wahl und Bild sind matt und bauen nur den Entwurf;
 * - Fenster der Aufgabe und Lade haben in allen Aufgaben dieselbe Größe, das Blatt liegt immer an derselben Stelle;
 * - 0,3 s nach jedem Wechsel nimmt der Tisch keine Tipps und die Perle keine Abgabe an;
 * - beim Lösen nur die Raupe des Kindes; der Zwilling kriecht erst bei „Vergleichen“ auf seinen Ast;
 * - unter einem liegenden Blatt liegt immer ein leeres Nest – nie die Lösung (auch nicht im DOM);
 * - Prüfung nur am Ende, ohne Häkchen und ohne „3 von 6“.
 *
 * Modell zuerst: jede Handlung ändert Sitzung/Profil, wird gespeichert, dann gezeigt. Flüchtig (nicht gespeichert)
 * sind nur Bewegung, Phase „Vergleich läuft“, ob das Kind selbst zu einer Aufgabe zurückgekehrt ist, und der Finger.
 */

type Phase = 'loesen' | 'bereit' | 'vergleich' | 'fertig';
type Modus = 'satz' | 'lern' | 'geste';
type Art = 'zahl' | 'wahl' | 'bild';

/** Welten in fester Reihenfolge, je Satz die nächste: hochkant und quer je ein eigenes Bild */
const WELTEN: { hoch: string; quer: string }[] = [
  { hoch: wieseHoch, quer: wieseQuer }, { hoch: teichHoch, quer: teichQuer }, { hoch: herbstHoch, quer: herbstQuer },
  { hoch: lavendelHoch, quer: lavendelQuer }, { hoch: gluehHoch, quer: gluehQuer },
];
/** Dauer eines Pulses des Hilfeknopfs (wie `--puls` in tokens.css) */
const PULS_MS = 1700;
/** Glätten nach jedem Wechsel (docs/STIL.md: 0,3 s) */
const SPERRE_MS = 300;
/** Finger bei Wahl und Bild: nach so langer Ruhe, solange das Kind diese Art noch nicht zweimal selbst abgeschickt hat */
const FINGER_RUHE_MS = 15000;
const FINGER_BIS = 2;
const bewegung = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;
const warte = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

// ── kleine Bilder ──
const PFEIL = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M29 11 L16 24 L29 37" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const MENUE = '<svg viewBox="0 0 48 48" aria-hidden="true"><g fill="currentColor"><rect x="9" y="12" width="30" height="6" rx="3"/><rect x="9" y="21" width="30" height="6" rx="3"/><rect x="9" y="30" width="30" height="6" rx="3"/></g></svg>';
const LOESCHEN = `<svg viewBox="0 0 60 44" aria-hidden="true"><path d="M20 6 H50 a6 6 0 0 1 6 6 V32 a6 6 0 0 1 -6 6 H20 L5 22 Z" fill="#fff" stroke="${GLAS.loeschen}" stroke-width="3.5" stroke-linejoin="round"/><path d="M30 15 L42 29 M42 15 L30 29" stroke="${GLAS.loeschen}" stroke-width="5" stroke-linecap="round"/></svg>`;
/** Pfeil nach oben im hellen Kreis: „im Bild oben tippen“ */
const TIPP = `<svg viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="27" fill="${GLAS.dienstHell}" stroke="${GLAS.dienst}" stroke-width="4"/><path d="M30 44 V18 M19 28 L30 17 L41 28" fill="none" stroke="${GLAS.dienstZeichen}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const LEER = '<svg class="nz-perle" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="38" fill="rgba(255,255,255,.4)" stroke="#fff" stroke-width="5" stroke-dasharray="8.92 6"/></svg>';
const BAUMHAUS = `<svg viewBox="0 0 120 110" aria-hidden="true"><rect x="52" y="58" width="16" height="46" rx="5" fill="${GLAS.stamm}"/><ellipse cx="60" cy="104" rx="40" ry="6" fill="${GLAS.laubHell}"/><circle cx="60" cy="40" r="34" fill="${GLAS.laub}"/><circle cx="34" cy="50" r="22" fill="${GLAS.laubHell}"/><circle cx="86" cy="50" r="22" fill="${GLAS.laubHell}"/><circle cx="60" cy="30" r="22" fill="${GLAS.laubLicht}"/><rect x="44" y="44" width="32" height="26" rx="5" fill="${GLAS.haus}"/><path d="M40 46 L60 30 L80 46 Z" fill="${GLAS.dach}"/><rect x="55" y="54" width="10" height="16" rx="4" fill="${GLAS.tuer}"/></svg>`;
const TON_AN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
const TON_AUS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 9l5 6M21.5 9l-5 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
/**
 * Finger (docs/STIL.md, „Палец-подсказка“): Hand mit ausgestrecktem Zeigefinger, Spitze oben in der Mitte (60, 4).
 * Bis die Zeichnung aus „Круг 2“ (docs/BILDER.md) da ist, zeichnet sie der Code.
 */
const FINGER = `<svg viewBox="0 0 120 170" aria-hidden="true"><path d="M48 92 V22 a12 12 0 0 1 24 0 V78 l4-2 a11 11 0 0 1 14 6 l2 6 a11 11 0 0 1 14 7 l1 5 a11 11 0 0 1 13 9 v22 c0 22-16 40-40 40 h-10 c-16 0-26-8-34-20 l-22-32 a10 10 0 0 1 15-13 z" fill="${GLAS.haut}" stroke="${GLAS.hautKante}" stroke-width="5" stroke-linejoin="round"/><path d="M76 78 v16 M92 88 v12 M107 99 v8" stroke="${GLAS.hautFalte}" stroke-width="4" stroke-linecap="round"/><ellipse cx="60" cy="14" rx="6" ry="4" fill="#fff" opacity=".7"/></svg>`;

function perle(a: Antwort | null): string {
  return a ? perleSvg(perlenBild(a), 'nz-perle') : LEER;
}
function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
/** Kachel in der Farbe der Ziffer: Rand und Kante; das Gesicht bleibt weiß */
function farbStil(d: number): string {
  const rand = KACHEL_RAND[d];
  return ` style="--rand:${rand};--kante:${ZIFFER_KANTEN[d]};--schatten:${rgba(ZIFFER_KANTEN[d], 0.42)}"`;
}
/** Inhalt einer Wahlkachel: Zahl als Ziffer, Form als Form mit dunklem Umriss wie im Bild der Aufgabe (Gelb auf Weiß), sonst die Perle */
function wahlInhalt(a: Antwort): string {
  if (a.art === 'zahl') return `<span class="nz-wahlzahl">${a.wert}</span>`;
  if (a.art === 'form') {
    const c = FORM_FARBEN[a.farbe] ?? '#888';
    return `<svg viewBox="0 0 60 60" aria-hidden="true">${formPfad(a.form, 30, 31, a.klein ? 14 : 22, c)}</svg>`;
  }
  return perle(a);
}

/** was gerade auf dem Tisch liegt: Aufgabe des Satzes, Schritt des Lernbeispiels oder der Geste */
interface Platz {
  modus: Modus;
  auftrag: string;
  art: Art;
  wahl: Antwort[] | null;
  feld: Zahlfeld;
  entwurf: Antwort | null;
  /** Schlüssel für Finger und gezählte Dinge: wechselt mit der Aufgabe oder dem Schritt */
  ort: string;
}

export async function renderSatz(app: HTMLElement): Promise<void> {
  const hash = location.hash;
  // Unbekanntes (neuere Version, kaputt) bleibt unter „…-unbekannt“, bevor hier etwas überschrieben wird
  let profil: Profil = (await ladeGeschuetzt('profil', ladeProfil)) ?? neuesProfil();
  // ohne gespeicherten Satz: ein neuer, mit einer zurückgelegten Aufgabe aus dem Profil, falls eine wartet
  let sitzung: Sitzung = pulsNachfuehren((await ladeGeschuetzt('sitzung', ladeSitzung)) ?? naechsteSitzung(neuerSamen(), profil));
  let historie: Historie = await historieLesen();
  if (location.hash !== hash) return; // inzwischen eine andere Seite
  tonAn(profil.ton);

  // ── flüchtiger Zustand ──
  let phase: Phase = 'loesen';
  /** das Kind ist selbst zu dieser Aufgabe zurückgekehrt: nach der Abgabe bleibt der Bildschirm auf ihr */
  let manuell = false;
  /** beim Zurückkehren zu einer beantworteten Zahl: die erste Ziffer ersetzt sie */
  let markiert = false;
  /** Bewegung läuft (Perle fliegt, Vergleich, Rückmeldung im Beispiel): keine Tipps */
  let fliegt = false;
  let sperre = 0;
  /** letzte Änderung des Entwurfs: 0,3 s danach nimmt die Perle keine Abgabe an */
  let geaendertUm = 0;
  /** Perle, die gerade im Nest gelandet ist (kleiner Sprung) */
  let neuSlot = -1;
  /** nach dem Vergleichen neu abgeschickt (für „nächste offene Aufgabe“) */
  let geaendert: boolean[] = sitzung.aufgaben.map(() => false);
  let neuerBuchstabe: number | null = null;
  let endeFrisch = false;
  let korbAnzeige: number | null = null;
  /** Lernbeispiel oder Geste: Perle im einzelnen Nest und Zustand des Blatts */
  let lernPerle: Antwort | null = null;
  let lernBlatt: '' | 'hebt' | 'wackelt' = '';
  let meldung = '';
  let zuletzt: string | null = null;
  let gezeigt = '';
  /** gezählte Dinge (Werkzeug der Engine Bild), je Ort; nur auf dem Bildschirm */
  let gezaehlt: { wo: string; nr: Set<number> } | null = null;
  // Finger
  let letzteBeruehrung = Date.now();
  let leerTipps = 0;
  const fingerSchon = new Set<string>();

  app.innerHTML = `<div class="nz" id="nz"><div class="nz-welt" aria-hidden="true"></div>
    <div class="nz-oben">
      <button type="button" class="nz-knopf" data-zurueck="1" aria-label="${KIND.zurueck}"><span class="nz-rund">${PFEIL}</span></button>
      <div class="nz-rechts"><div class="nz-korb" id="nz-korb"></div>
      <button type="button" class="nz-knopf nz-menueknopf" data-menue="1" aria-label="${KIND.menue}" aria-expanded="false"><span class="nz-rund">${MENUE}</span></button></div>
    </div>
    <section class="nz-ast" aria-label="${KIND.deineRaupe}"><div class="nz-reihe" id="nz-reihe"></div>
      <div class="nz-reihe nz-zwilling" id="nz-zwilling" aria-label="${KIND.deinZwilling}" hidden></div></section>
    <section class="nz-tisch" id="nz-tisch" aria-live="polite"></section>
    <div class="nz-menue" id="nz-menue" hidden></div>
    <div class="nz-finger" id="nz-finger" hidden>${FINGER}</div>
  </div>`;
  const root = app.querySelector<HTMLElement>('#nz')!;
  const tisch = root.querySelector<HTMLElement>('#nz-tisch')!;
  const zwilling = root.querySelector<HTMLElement>('#nz-zwilling')!;
  const finger = root.querySelector<HTMLElement>('#nz-finger')!;

  // ── Modell ──
  const satz = () => sitzung.satz;
  const ende = () => fertig(satz());
  const aktuell = () => sitzung.aktuell;
  const aufgabe = () => sitzung.aufgaben[aktuell()];
  const format = (i = aktuell()) => FORMATE[sitzung.aufgaben[i].format];
  const artVon = (i: number): Art => format(i).eingabe(sitzung.aufgaben[i].bedingung).art as Art;
  const entwuerfe = (): (Antwort | null)[] => sitzung.entwurf ?? sitzung.aufgaben.map(() => null);
  /** Blätter im Korb: alle bisherigen und die dieses Satzes, solange er noch nicht gezählt ist */
  const korbZahl = () => profil.blaetter + (sitzung.gezaehlt ? 0 : blaetter(satz()).wert);
  /** `mitHistorie`: nur beim Abschluss – die Historie wächst und wird nicht bei jedem Tippen neu geschrieben */
  const speichern = (mitHistorie = false) => {
    void schreibenMehrere(mitHistorie ? { [HISTORIE_SCHLUESSEL]: historie, sitzung, profil } : { sitzung, profil });
  };

  const lernNoetig = () => lernbeispielVorher(profil, aufgabe().format);
  function modus(): Modus {
    if (phase !== 'loesen' || ende()) return 'satz';
    if (!profil.geste) return 'geste';
    if (lernNoetig() || sitzung.lernbeispiel?.format === aufgabe().format) return 'lern';
    return 'satz';
  }
  const lernStart = (): LernZustand => ({ format: aufgabe().format, schritt: 0, antwort: null, versucht: false });
  function lernSchritt() {
    const schritte = lernbeispiel(format());
    const lb = sitzung.lernbeispiel;
    const st = lb && lb.format === aufgabe().format ? lb : lernStart();
    const k = Math.min(Math.max(0, st.schritt), schritte.length - 1);
    return { schritte, k, a: schritte[k], st: { ...st, schritt: k } };
  }
  function lernSetzen(st: LernZustand | undefined): void {
    const { lernbeispiel: _alt, ...rest } = sitzung;
    sitzung = st ? { ...rest, lernbeispiel: st } : rest;
  }
  const gesteZustand = (): GestenZustand => {
    const g = sitzung.geste ?? { schritt: 0, antwort: null, versucht: false };
    return { ...g, schritt: Math.min(Math.max(0, g.schritt), GESTE.length - 1) };
  };
  function gesteSetzen(g: GestenZustand | undefined): void {
    const { geste: _alt, ...rest } = sitzung;
    sitzung = g ? { ...rest, geste: g } : rest;
  }

  function platz(): Platz {
    const m = modus();
    if (m === 'geste') {
      const g = gesteZustand();
      const s = GESTE[g.schritt];
      return { modus: m, auftrag: s.auftrag, art: s.art, wahl: s.wahl, feld: 99, entwurf: g.antwort, ort: `geste:${g.schritt}` };
    }
    if (m === 'lern') {
      const { a, st, k } = lernSchritt();
      const e = format().eingabe(a.bedingung);
      return { modus: m, auftrag: KIND.auftrag[format().auftrag], art: e.art as Art, wahl: a.wahl, feld: e.art === 'zahl' ? zahlfeld(e, a.zahlenraum) : 99, entwurf: st.antwort, ort: `lern:${a.format}:${k}` };
    }
    const a = aufgabe();
    const e = format().eingabe(a.bedingung);
    return { modus: m, auftrag: KIND.auftrag[format().auftrag], art: e.art as Art, wahl: a.wahl, feld: e.art === 'zahl' ? zahlfeld(e, a.zahlenraum) : 99, entwurf: entwuerfe()[aktuell()], ort: `${sitzung.samen}:${aktuell()}` };
  }
  function entwurfSetzen(w: Antwort | null): void {
    const m = modus();
    if (m === 'geste') gesteSetzen({ ...gesteZustand(), antwort: w });
    else if (m === 'lern') lernSetzen({ ...lernSchritt().st, antwort: w });
    else sitzung = { ...sitzung, entwurf: entwuerfe().map((x, j) => (j === aktuell() ? w : x)) };
  }

  /** ähnliche Aufgabe für Hilfe 3/4: gleiches Format, gleiche Stufe, anderer Samen */
  const aehnlich = (a: Aufgabe) => aufgabeAus(FORMATE[a.format], (a.samen + 1_000_003) >>> 0, a.stufe, { zahlenraum: a.zahlenraum });

  function welt(): void {
    const w = WELTEN[(((profil.saetze - (sitzung.gezaehlt ? 1 : 0)) % WELTEN.length) + WELTEN.length) % WELTEN.length];
    root.style.setProperty('--welt-hoch', `url(${w.hoch})`);
    root.style.setProperty('--welt-quer', `url(${w.quer})`);
  }

  // ── Ast ──
  function astHtml(): string {
    const m = modus();
    let h = `<img class="nz-kopf${neuSlot >= 0 ? ' freut' : ''}" src="${raupeBild}" alt="">`;
    if (m !== 'satz') {
      // Beispiel: ein Nest und ein Blatt, ohne Zwilling, Korb und Reihe (docs/STIL.md, „Учебный пример“)
      return h + `<span class="nz-slot nz-lernslot${neuSlot >= 0 ? ' neu' : ''}" data-lernslot="1"><span class="nz-nest"></span>${lernPerle ? perle(lernPerle) : ''}</span>
        <img class="nz-lernblatt${lernBlatt ? ' ' + lernBlatt : ''}" src="${blattBild}" alt="">`;
    }
    satz().perlen.forEach((p, i) => {
      const cls = ['nz-slot'];
      if (phase === 'loesen' && !ende() && i === aktuell()) cls.push('aktuell');
      if (i === neuSlot) cls.push('neu');
      if (satz().runden > 0 && p.blatt === 'zu' && !p.zurueck && !geaendert[i] && phase !== 'fertig') cls.push('zu-mark');
      const name = KIND.perleName(i + 1, p.antwort ? perlenBild(p.antwort).name : null);
      h += `<button type="button" class="${cls.join(' ')}" data-slot="${i}" aria-label="${name}"${i === aktuell() && phase === 'loesen' ? ' aria-current="step"' : ''}><i class="nz-treffer"></i><span class="nz-nest"></span>${p.antwort ? perle(p.antwort) : ''}${p.zurueck ? zurueckMarkeSvg() : ''}</button>`;
    });
    return h;
  }
  /** Zwilling: unter einem liegenden Blatt nur ein leeres Nest; `sichtbar`: gehobene Blätter, deren Perle zu sehen ist */
  function zwillingHtml(sichtbar: Set<number>): string {
    let h = `<img class="nz-kopf" src="${zwillingBild}" alt="" style="--i:0">`;
    satz().perlen.forEach((p, i) => {
      const auf = sichtbar.has(i) && p.blatt !== 'zu' && p.antwort;
      h += `<span class="nz-slot" data-gslot="${i}" style="--i:${i + 1}"><span class="nz-nest"></span><span class="nz-unter">${auf ? perle(p.antwort) : ''}</span><img class="nz-blatt${auf ? ' weg' : ''}" src="${p.blatt === 'gold' && auf ? blattGoldBild : blattBild}" alt=""></span>`;
    });
    return h;
  }
  function korbZeichnen(): void {
    const k = root.querySelector<HTMLElement>('#nz-korb')!;
    const zahl = korbAnzeige ?? korbZahl();
    const war = k.dataset.zahl ?? '0';
    // im Beispiel kein Korb
    const zeigen = zahl > 0 && modus() === 'satz';
    k.innerHTML = zeigen ? `<img src="${korbVollBild}" alt=""><span class="nz-zahl" aria-label="${KIND.korb(zahl)}">${zahl}</span>` : '';
    k.classList.toggle('kommt', war === '0' && zeigen);
    k.dataset.zahl = zeigen ? String(zahl) : '0';
  }

  // ── Lade ──
  function tasten(): string {
    let h = `<div class="nz-tasten" role="group" aria-label="${KIND.zahlEingeben}">`;
    for (let d = 0; d <= 9; d++) h += `<button class="nz-taste" type="button" data-ziffer="${d}" aria-label="${d}"${farbStil(d)}>${d}</button>`;
    return h + `<button class="nz-taste nz-loeschen" type="button" data-loeschen="1" aria-label="${KIND.loeschen}">${LOESCHEN}</button></div>`;
  }
  function ladeHtml(pl: Platz): string {
    let werkzeug = '';
    if (pl.art === 'zahl') werkzeug = tasten();
    else if (pl.art === 'wahl' && pl.wahl) {
      werkzeug = `<div class="nz-wahl">${pl.wahl.map((w, k) => {
        const z = w.art === 'zahl' && w.wert < 10 ? farbStil(w.wert) : '';
        const an = gleich(w, pl.entwurf);
        return `<button type="button" class="nz-taste nz-option${an ? ' gewaehlt' : ''}" data-k="${k}" aria-pressed="${an}" aria-label="${perlenBild(w).name}"${z}>${wahlInhalt(w)}</button>`;
      }).join('')}</div>`;
    } else if (pl.art === 'bild') werkzeug = `<div class="nz-tipp">${TIPP}<span>${KIND.tippOben}</span></div>`;
    const w = pl.entwurf;
    const key = w ? `${pl.ort}|${JSON.stringify(w)}` : null;
    let wechsel = '';
    if (key && key !== zuletzt) wechsel = zuletzt === null || !zuletzt.startsWith(pl.ort + '|') ? ' faellt' : ' wechselt';
    zuletzt = key;
    return `<div class="nz-lade"><div class="nz-werkzeug">${werkzeug}</div>
      <div class="nz-ablage"><span class="nz-schale${wechsel === ' faellt' ? ' wippt' : ''}" style="background-image:url(${blattBild})">
      <button type="button" class="nz-abgabe${w ? '' : ' leer'}${wechsel}${markiert && w ? ' markiert' : ''}" data-abgabe="1" aria-label="${w ? KIND.abgeben : KIND.nochLeer}">${perle(w)}</button></span></div></div>`;
  }

  // ── Brett ──
  /** Hilfe auf dem eigenen Bild: Stufe 2; Stufe 3, wenn der Schritt nichts verrät (sonst an der ähnlichen Aufgabe) */
  function bildHilfe(offen: HilfeStufe): HilfeStufe {
    const a = aufgabe();
    const verraet = !!format().schrittVerraet?.(a.bedingung);
    if (offen === 2 || (offen >= 3 && !verraet)) return Math.min(offen, 3) as HilfeStufe;
    return offen >= 3 ? 2 : 0;
  }
  function brettHtml(pl: Platz): string {
    const m = pl.modus;
    let bild: string;
    let links = '';
    let rechts = '';
    let zweites = '';
    if (m === 'geste') {
      bild = gesteBild(gesteZustand().schritt);
      links = `<span class="nz-marke">${KIND.soGehts}</span>`;
    } else if (m === 'lern') {
      const { a, st } = lernSchritt();
      bild = format().zeichne(a.bedingung, { hilfe: st.versucht && lernBlatt !== 'hebt' ? 2 : 0, gewaehlt: st.antwort });
      // von selbst gezeigt: erst nach dem letzten Schritt geht es zur Aufgabe; auf Wunsch jederzeit zurück
      links = lernNoetig() ? `<span class="nz-marke">${KIND.soGehts}</span>` : `<button type="button" class="nz-los" data-los="1">${KIND.losGehts}</button>`;
    } else {
      const i = aktuell();
      const a = aufgabe();
      const p = satz().perlen[i];
      const offen = sitzung.hilfeOffen[i];
      const f = format();
      bild = f.zeichne(a.bedingung, { hilfe: bildHilfe(offen), gewaehlt: pl.entwurf });
      if (offen >= 2) links = `<button type="button" class="nz-sogehts" data-sogehts="1">${KIND.soGehts}</button>`;
      const max = offen >= hoechsteHilfe(satz());
      const pulst = hilfePulst(sitzung, i);
      const puls = pulst ? ` data-puls="ja" style="--puls-phase:-${Math.round(performance.now() % PULS_MS)}ms"` : '';
      rechts = `<button class="nz-laterne" type="button" data-hilfe="1" aria-pressed="${offen >= 2}" aria-label="${offen ? KIND.mehrHilfe : KIND.hilfe}"${max ? ' disabled' : ''}${puls}><span class="nz-rund"><img src="${laterneBild}" alt=""></span><span class="nz-name" aria-hidden="true">${KIND.hilfe}</span></button>`;
      // Stufe 3, wenn der Schritt verraten würde, und Stufe 4: ähnliche Aufgabe auf eigenem Teil des Bretts
      const verraet = !!f.schrittVerraet?.(a.bedingung);
      if (offen === 4 || (offen === 3 && verraet)) {
        const ae = aehnlich(a);
        const aeBild = offen === 4 ? f.zeichne(ae.bedingung, { hilfe: 0, gewaehlt: null, vorrechnen: true }) : f.zeichne(ae.bedingung, { hilfe: 3, gewaehlt: null, aehnlich: true });
        const spaeter = offen === 4 && !p.zurueck ? `<button type="button" class="nz-spaeter" data-spaeter="1">${KIND.spaeterKnopf}</button>` : '';
        zweites = `<div class="nz-teil nz-aehnlich"><div class="nz-aehnlich-kopf"><p class="nz-aehnlich-titel">${KIND.aehnlich}</p>${spaeter}</div><div class="nz-teil-bild">${aeBild}</div></div>`;
      }
      if (p.zurueck) meldung = meldung || KIND.wartet;
    }
    const frisch = gezeigt !== pl.ort;
    gezeigt = pl.ort;
    const alleDa = m === 'satz' && satz().perlen.every((p) => p.blatt !== 'zu' || p.zurueck || p.antwort !== null) && kannVergleichen(satz());
    // alle Perlen da, das Kind ändert noch etwas: „Vergleichen“ als Honigschild mit dem Zwilling unten auf dem Brett
    // neben der ähnlichen Aufgabe nur das Schild, ohne Zwilling: das Brett braucht den Platz für zwei Bilder
    const ueberblick = alleDa ? `<button type="button" class="nz-ueberblick${zweites ? ' klein' : ''}" data-ueberblick="1">${zweites ? '' : `<img src="${zwillingBild}" alt="">`}<span>${KIND.vergleichen}</span></button>` : '';
    const bildTeil = zweites
      ? `<div class="nz-bild zwei" id="nz-bild"><div class="nz-teil nz-eigen"><div class="nz-teil-bild">${bild}</div></div>${zweites}</div>`
      : `<div class="nz-bild" id="nz-bild">${bild}</div>`;
    return `<div class="nz-brett${frisch ? ' frisch' : ''}${m !== 'satz' ? ' beispiel' : ''}"><div class="nz-frage-zeile"><span class="nz-links">${links}</span><h1 class="nz-frage">${pl.auftrag}</h1>${rechts}</div>
      ${meldung ? `<p class="nz-meldung">${meldung}</p>` : ''}${bildTeil}${ueberblick}</div>`;
  }

  // ── Zeichnen ──
  function zeichnenAst(): void {
    root.setAttribute('data-phase', phase);
    root.setAttribute('data-modus', modus());
    root.querySelector('#nz-reihe')!.innerHTML = astHtml();
  }
  function zeichnen(): void {
    zeichnenAst();
    korbZeichnen();
    neuSlot = -1;
    if (phase === 'loesen' || phase === 'bereit') {
      zwilling.hidden = true;
      zwilling.innerHTML = '';
      zwilling.className = 'nz-reihe nz-zwilling';
    }
    if (phase === 'bereit') {
      gezeigt = '';
      tisch.innerHTML = `<div class="nz-karte"><p class="nz-karte-text">${KIND.allePerlen}</p><button class="nz-vergleichen" type="button" data-vergleichen="1">${KIND.vergleichen}</button></div>`;
      return fingerAus();
    }
    if (phase === 'fertig') {
      if (!zwilling.innerHTML) {
        zwilling.innerHTML = zwillingHtml(new Set(satz().perlen.map((_, i) => i)));
        zwilling.hidden = false;
      }
      gezeigt = '';
      const g = profil.geheim;
      const zurueck = satz().perlen.some((p) => p.zurueck);
      const geheim = `<div class="nz-geheim" role="img" aria-label="${KIND.geheimwort}">${[...g.wort].map((c, i) => `<span class="${g.offen.includes(i) ? 'auf' : ''}${i === neuerBuchstabe ? ' neu' : ''}">${g.offen.includes(i) ? c : ''}</span>`).join('')}</div>`;
      const innen = `<p class="nz-jubel">${KIND.fertigTitel}</p>${geheim}
        ${neuerBuchstabe !== null ? `<p class="nz-hinweis">${KIND.neuerBuchstabe}</p>` : ''}${zurueck ? `<p class="nz-hinweis">${KIND.spaeter}</p>` : ''}
        <div class="nz-ende">
            <button type="button" class="nz-kachel" data-gehe="welt">${BAUMHAUS}<span>${KIND.welt}</span></button>
            <button type="button" class="nz-kachel haupt" data-noch="1"><img src="${raupeBild}" alt=""><span>${KIND.neuerSatz}</span></button>
            <button type="button" class="nz-kachel" data-gehe="pause"><img src="${raupeLiegtBild}" alt=""><span>${KIND.pause}</span></button></div>`;
      // Blätterregen außerhalb der Glaskarte: backdrop-filter würde ihn sonst in der Karte einsperren
      tisch.innerHTML = `<div class="nz-karte ende">${innen}</div>${endeFrisch && bewegung() ? regen() : ''}`;
      if (endeFrisch && neuerBuchstabe !== null) setTimeout(buchstabeTon, 600);
      endeFrisch = false;
      return fingerAus();
    }
    const pl = platz();
    tisch.innerHTML = brettHtml(pl) + ladeHtml(pl);
    meldung = '';
    zaehlMarken(pl);
    fingerNachfuehren(pl);
  }
  function regen(): string {
    let h = '<div class="nz-regen" aria-hidden="true">';
    for (let k = 0; k < 9; k++) h += `<img src="${k % 4 === 0 ? blattGoldBild : blattBild}" style="--x:${6 + k * 11}%;--v:${k * 0.35}s;--d:${2.6 + (k % 3) * 0.5}s" alt="">`;
    return h + '</div>';
  }
  /** gezählte Dinge wieder markieren (nach jedem Zeichnen; gehört die Marke zu einer anderen Aufgabe, ist sie weg) */
  function zaehlMarken(pl: Platz): void {
    if (gezaehlt && gezaehlt.wo !== pl.ort) gezaehlt = null;
    for (const e of tisch.querySelectorAll('#nz-bild > svg [data-zaehl], .nz-eigen [data-zaehl]')) e.classList.toggle('gezaehlt', !!gezaehlt?.nr.has(Number(e.getAttribute('data-zaehl'))));
  }

  // ── Finger (docs/STIL.md, „Палец-подсказка“) ──
  function fingerAus(): void {
    finger.hidden = true;
  }
  /** Spitze an den unteren Rand des Ziels, Hand Richtung Bildschirmrand; ist unten kein Platz, von der Seite */
  function fingerAuf(ziel: Element | null): void {
    if (!ziel) return fingerAus();
    const r = ziel.getBoundingClientRect();
    if (!r.width) return fingerAus();
    const b = Math.max(48, Math.min(96, r.height * 1.1));
    const h = b * (170 / 120);
    finger.style.width = `${b}px`;
    finger.style.height = `${h}px`;
    const untenPlatz = innerHeight - r.bottom;
    let x: number, y: number, dreh: number;
    if (untenPlatz >= h * 0.6) {
      x = r.left + r.width / 2 - b / 2;
      y = r.bottom - r.height * 0.18;
      dreh = 0;
    } else {
      // von rechts (oder links, wenn rechts kein Platz ist): Spitze an den Rand des Ziels, Hand zum Rand
      const rechts = innerWidth - r.right >= h * 0.6;
      dreh = rechts ? -90 : 90;
      // Drehpunkt ist die Spitze (oben Mitte)
      x = (rechts ? r.right - r.width * 0.12 : r.left + r.width * 0.12) - b / 2;
      y = r.top + r.height / 2;
    }
    finger.style.left = `${Math.round(x)}px`;
    finger.style.top = `${Math.round(y)}px`;
    finger.style.rotate = `${dreh}deg`;
    finger.hidden = false;
  }
  function fingerNachfuehren(pl: Platz): void {
    if (pl.modus !== 'geste' || fliegt) {
      if (pl.modus !== 'satz') fingerAus();
      return;
    }
    const z = fingerZiel(gesteZustand().schritt, pl.entwurf);
    const sel = z.art === 'wahl' ? `[data-k="${z.k}"]` : z.art === 'ziffer' ? `[data-ziffer="${z.d}"]` : z.art === 'loeschen' ? '[data-loeschen]' : '[data-abgabe]';
    // erst nach dem Zeichnen messen
    requestAnimationFrame(() => {
      if (modus() === 'geste' && !fliegt) fingerAuf(tisch.querySelector(sel));
    });
  }
  /** Finger auf der Perle bei Wahl und Bild: einmal je Aufgabe, nach 15 s Ruhe, bis zwei eigene Abgaben dieser Art */
  const fingerUhr = setInterval(() => {
    if (location.hash !== hash) return clearInterval(fingerUhr);
    if (phase !== 'loesen' || fliegt || modus() !== 'satz' || !finger.hidden) return;
    const pl = platz();
    if (pl.art === 'zahl' || !pl.entwurf || profil.abgaben[pl.art] >= FINGER_BIS) return;
    if (Date.now() - letzteBeruehrung < FINGER_RUHE_MS || fingerSchon.has(pl.ort + ':abgabe')) return;
    fingerSchon.add(pl.ort + ':abgabe');
    fingerAuf(tisch.querySelector('[data-abgabe]'));
  }, 1000);

  // ── Ablauf ──
  /** eine Aufgabe öffnen; `vonHand`: das Kind hat ihre Perle angetippt */
  function oeffne(i: number, vonHand: boolean): void {
    sitzung = { ...sitzung, aktuell: i };
    const alt = satz().perlen[i].antwort;
    const art = artVon(i);
    // ein Entwurf ohne abgeschickte Antwort bleibt; sonst steht die abgeschickte Antwort darin
    if (alt) sitzung = { ...sitzung, entwurf: entwuerfe().map((x, j) => (j === i ? alt : x)) };
    manuell = vonHand && alt !== null;
    markiert = art === 'zahl' && alt !== null;
    sperre = Date.now() + SPERRE_MS;
    leerTipps = 0;
    zuletzt = null;
    phase = 'loesen';
    // ein Lernbeispiel auf Wunsch schließt sich; eins, das von selbst kommt, wartet beim selben Schritt
    const lb = sitzung.lernbeispiel;
    if (lb && !lernbeispielVorher(profil, lb.format)) lernSetzen(undefined);
    lernPerle = null;
    lernBlatt = '';
    speichern();
    zeichnen();
  }
  function naechstes(von: number): number {
    const n = satz().perlen.length;
    for (let d = 1; d <= n; d++) {
      const i = (von + d) % n;
      const p = satz().perlen[i];
      if (p.blatt !== 'zu' || p.zurueck) continue;
      if (satz().runden === 0 ? p.antwort === null : !geaendert[i]) return i;
    }
    return -1;
  }
  /** weiter nach einer Abgabe oder nach „Später“: nächste offene Aufgabe, sonst die Karte „Vergleichen“ */
  function weiter(von: number): void {
    const n = naechstes(von);
    if (n >= 0) return oeffne(n, false);
    phase = kannVergleichen(satz()) ? 'bereit' : 'loesen';
    speichern();
    zeichnen();
  }

  function abgeben(knopf: HTMLElement): void {
    const pl = platz();
    const w = pl.entwurf;
    if (!w) {
      knopf.classList.remove('atmet');
      void knopf.offsetWidth;
      knopf.classList.add('atmet');
      // zweimal hintereinander auf die leere Perle: der Finger zeigt einmal auf die Werkzeuge
      if (++leerTipps >= 2 && !fingerSchon.has(pl.ort + ':werkzeug') && pl.modus === 'satz') {
        fingerSchon.add(pl.ort + ':werkzeug');
        fingerAuf(pl.art === 'bild' ? tisch.querySelector('#nz-bild') : tisch.querySelector('.nz-werkzeug > *'));
      }
      return;
    }
    leerTipps = 0;
    if (Date.now() < sperre || Date.now() - geaendertUm < SPERRE_MS) return;
    fingerAus();
    if (pl.modus !== 'satz') return beispielAbgeben(knopf, pl, w);
    const i = aktuell();
    const ziel = root.querySelector<HTMLElement>(`[data-slot="${i}"]`);
    // das Modell nimmt die Abgabe zuerst an und speichert; der Flug zeigt sie nur noch
    sitzung = { ...sitzung, satz: setzeAntwort(satz(), i, w) };
    if (satz().runden > 0) geaendert[i] = true;
    if (pl.art !== 'zahl') profil = { ...profil, abgaben: { ...profil.abgaben, [pl.art]: profil.abgaben[pl.art] + 1 } };
    speichern();
    flug(w, knopf, ziel, () => {
      neuSlot = i;
      perleTon(w.art === 'zahl' ? w.wert : null);
      markiert = pl.art === 'zahl';
      zuletzt = null;
      if (manuell) return zeichnen();
      weiter(i);
    });
  }
  /** Lernbeispiel und Geste: sofortige Rückmeldung am einzelnen Nest – Blatt hebt sich oder wackelt */
  function beispielAbgeben(knopf: HTMLElement, pl: Platz, w: Antwort): void {
    const ziel = root.querySelector<HTMLElement>('[data-lernslot]');
    const richtig = pl.modus === 'geste' ? gestePruefen(gesteZustand().schritt, w) === 'richtig' : lernPruefen(format(), lernSchritt().a, w) === 'richtig';
    flug(w, knopf, ziel, async () => {
      fliegt = true;
      lernPerle = w;
      neuSlot = 0;
      if (richtig) {
        perleTon(w.art === 'zahl' ? w.wert : null);
        lernBlatt = 'hebt';
        meldung = KIND.genau;
        zeichnen();
        // nächster Schritt 1 s nach der Landung (docs/STIL.md, „Учебный пример“)
        await warte(1000);
        if (location.hash !== hash) return;
        fliegt = false;
        lernPerle = null;
        lernBlatt = '';
        beispielWeiter(pl);
      } else {
        setzenTon();
        lernBlatt = 'wackelt';
        meldung = KIND.nochmalSchauen;
        // die Antwort kehrt zurück: Entwurf leer, Hilfe Stufe 2 auf dem Bild
        if (pl.modus === 'geste') gesteSetzen({ ...gesteZustand(), antwort: null, versucht: true });
        else lernSetzen({ ...lernSchritt().st, antwort: null, versucht: true });
        speichern();
        zeichnen();
        await warte(bewegung() ? 600 : 0);
        if (location.hash !== hash) return;
        fliegt = false;
        lernPerle = null;
        lernBlatt = '';
        meldung = KIND.nochmalSchauen;
        zeichnen();
      }
    });
  }
  function beispielWeiter(pl: Platz): void {
    if (pl.modus === 'geste') {
      const k = gesteZustand().schritt;
      if (k + 1 < GESTE.length) gesteSetzen({ schritt: k + 1, antwort: null, versucht: false });
      else {
        gesteSetzen(undefined);
        profil = { ...profil, geste: true };
      }
    } else {
      const { k, schritte } = lernSchritt();
      // von selbst gezeigt: nur der erste, leichteste Schritt (Autorin 20.11.2026); auf Wunsch alle Schritte
      const letzter = lernNoetig() ? 0 : schritte.length - 1;
      if (k < letzter) lernSetzen({ format: aufgabe().format, schritt: k + 1, antwort: null, versucht: false });
      else {
        // von selbst gezeigt und gelöst: ab jetzt bekannt (aus neu wie aus nochmal)
        if (lernNoetig()) profil = { ...profil, formate: { ...profil.formate, [aufgabe().format]: 'bekannt' } };
        lernSetzen(undefined);
      }
    }
    sperre = Date.now() + SPERRE_MS;
    zuletzt = null;
    speichern();
    zeichnen();
  }

  function flug(w: Antwort, von: HTMLElement, nach: HTMLElement | null, dann: () => void): void {
    if (!nach || !bewegung()) return dann();
    fliegt = true;
    const a = von.getBoundingClientRect(), b = nach.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'nz-flug';
    el.style.cssText = `width:${a.width}px;height:${a.height}px`;
    el.innerHTML = perle(w);
    document.body.appendChild(el);
    von.style.visibility = 'hidden';
    const s1 = b.width / a.width, mx = (a.left + b.left) / 2, my = Math.min(a.top, b.top) - 40;
    el.animate([
      { transform: `translate(${a.left}px,${a.top}px) scale(1)` },
      { transform: `translate(${mx}px,${my}px) scale(${(1 + s1) / 2 + 0.08})`, offset: 0.55 },
      { transform: `translate(${b.left}px,${b.top}px) scale(${s1})` },
    ], { duration: 520, easing: 'cubic-bezier(.4,.1,.3,1)', fill: 'forwards' }).onfinish = () => {
      el.remove();
      fliegt = false;
      funken(b.left + b.width / 2, b.top + b.height / 2);
      setTimeout(dann, 150);
    };
  }
  function funken(x: number, y: number): void {
    if (!bewegung()) return;
    const box = document.createElement('div');
    box.className = 'nz-funken';
    box.style.left = x + 'px';
    box.style.top = y + 'px';
    for (let k = 0; k < 8; k++) {
      const f = document.createElement('i');
      f.style.setProperty('--w', k * 45 + 'deg');
      box.appendChild(f);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 700);
  }

  /** Satz abschließen: Profil, Historie und Satz zusammen speichern (einmal je Satz) */
  function abschluss(): void {
    const r = abschliessen(sitzung, profil, historie);
    sitzung = r.sitzung;
    profil = r.profil;
    historie = r.historie;
    neuerBuchstabe = r.neuerBuchstabe;
    endeFrisch = true;
    speichern(true);
  }

  // ── Vergleichen: der Zwilling kriecht auf seinen Ast, Blätter heben sich der Reihe nach ──
  async function vergleichen(): Promise<void> {
    if (fliegt || !kannVergleichen(satz())) return;
    knopfTon();
    fingerAus();
    const korbVorher = korbZahl();
    const vorher = new Set(satz().perlen.map((p, i) => (p.blatt !== 'zu' ? i : -1)).filter((i) => i >= 0));
    const r = vergleiche(satz(), stimmtFuer(sitzung));
    // das Modell nimmt das Vergleichen einmal an; gespeichert wird sofort
    sitzung = pulsNachfuehren({ ...sitzung, satz: r.satz });
    const fertigJetzt = fertig(r.satz);
    const bleibenOffen = r.bleiben.filter((i) => !r.satz.perlen[i].zurueck);
    if (fertigJetzt) abschluss();
    else {
      if (bleibenOffen.length) sitzung = { ...sitzung, aktuell: bleibenOffen[0] };
      speichern();
    }
    geaendert = geaendert.map(() => false);

    // die Bewegung zeigt nur noch, was schon gespeichert ist
    fliegt = true;
    phase = 'vergleich';
    korbAnzeige = korbVorher;
    zeichnenAst();
    korbZeichnen();
    zwilling.innerHTML = zwillingHtml(vorher);
    zwilling.className = 'nz-reihe nz-zwilling kriecht';
    zwilling.hidden = false;
    tisch.innerHTML = `<p class="nz-vtext">${KIND.zwillingKommt}</p>`;
    const zeile = tisch.querySelector<HTMLElement>('.nz-vtext')!;
    const mit = bewegung();
    await warte(mit ? 2000 : 0);
    for (const i of r.gehoben) {
      if (location.hash !== hash) return;
      const platzEl = zwilling.querySelector<HTMLElement>(`[data-gslot="${i}"]`);
      const g = platzEl?.querySelector<HTMLImageElement>('.nz-blatt');
      const p = satz().perlen[i];
      const gold = p.blatt === 'gold';
      // erst jetzt, da sich genau dieses Blatt hebt, liegt die Perle darunter
      const unter = platzEl?.querySelector('.nz-unter');
      if (unter && p.antwort) unter.innerHTML = perle(p.antwort);
      korbAnzeige = (korbAnzeige ?? 0) + (gold ? 2 : 1);
      korbZeichnen();
      if (g) {
        if (gold) g.src = blattGoldBild;
        const a = g.getBoundingClientRect();
        const k = root.querySelector('#nz-korb img')?.getBoundingClientRect() ?? root.querySelector('#nz-korb')!.getBoundingClientRect();
        g.style.setProperty('--dx', `${Math.round(k.left + k.width / 2 - (a.left + a.width / 2))}px`);
        g.style.setProperty('--dy', `${Math.round(k.top + k.height / 3 - (a.top + a.height / 2))}px`);
        g.classList.add('weg');
      }
      rascheln();
      if (gold) goldTon();
      const kb = root.querySelector<HTMLElement>('#nz-korb')!;
      kb.classList.remove('hupf');
      void kb.offsetWidth;
      kb.classList.add('hupf');
      setTimeout(korbTon, mit ? 500 : 0);
      await warte(mit ? 380 : 0);
    }
    for (const i of bleibenOffen) zwilling.querySelector(`[data-gslot="${i}"] .nz-blatt`)?.classList.add('wackelt');
    await warte(mit ? 500 : 0);
    if (location.hash !== hash) return;
    korbAnzeige = null;
    if (fertigJetzt) {
      fliegt = false;
      phase = 'fertig';
      return zeichnen();
    }
    zeile.textContent = r.wiederholung ? KIND.nichtsGeaendert : bleibenOffen.length === 1 ? KIND.einBlattZu : KIND.paarBlaetterZu;
    await warte(1500);
    if (location.hash !== hash) return;
    zwilling.classList.add('zu');
    await warte(mit ? 300 : 0);
    fliegt = false;
    oeffne(sitzung.aktuell, false);
  }

  function frage(text: string, knoepfe: string): void {
    const el = document.createElement('div');
    el.className = 'nz-dialog';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.innerHTML = `<div class="nz-dialog-karte"><img src="${raupeBild}" alt=""><p>${text}</p><div class="nz-zwei">${knoepfe}</div></div>`;
    root.appendChild(el);
    el.querySelector('button')?.focus();
  }
  function menueZeichnen(): void {
    // Ton für alle; darunter für die Autorin der Weg zur Probe-Seite (bis zur Regalseite C4)
    root.querySelector('#nz-menue')!.innerHTML = `<button type="button" class="nz-wahl-satz nz-ton" data-ton="1" aria-pressed="${profil.ton}">${profil.ton ? TON_AN : TON_AUS}<span>${KIND.ton}</span></button>
      <a class="nz-wahl-satz" href="#/alle">Probe: alle Aufgaben</a>`;
  }

  // ── Tippen ──
  root.addEventListener('pointerdown', (ev) => {
    letzteBeruehrung = Date.now();
    if (modus() !== 'geste' && !(ev.target as Element).closest('[data-abgabe]')) fingerAus();
  }, { passive: true });
  root.addEventListener('click', (ev) => {
    const t = ev.target as Element;
    // Werkzeug „gezählt markieren“: ein Ding im eigenen Bild an- oder abhaken (nie im Teil der ähnlichen Aufgabe)
    const zaehl = t.closest('[data-zaehl]');
    if (zaehl && !t.closest('.nz-aehnlich') && t.closest('#nz-bild') && phase === 'loesen' && !fliegt) {
      const wo = platz().ort;
      if (!gezaehlt || gezaehlt.wo !== wo) gezaehlt = { wo, nr: new Set() };
      const nr = Number(zaehl.getAttribute('data-zaehl'));
      if (gezaehlt.nr.has(nr)) gezaehlt.nr.delete(nr);
      else gezaehlt.nr.add(nr);
      zaehl.classList.toggle('gezaehlt', gezaehlt.nr.has(nr));
      setzenTon();
      if (!t.closest('[data-wahl]')) return;
    }
    // das Bild der ähnlichen Aufgabe ist nur zum Ansehen: Tippen darin wählt nichts
    if (t.closest('.nz-aehnlich') && !t.closest('[data-spaeter]')) return;
    const el = t.closest<HTMLElement>('button, [data-wahl], a');
    if (!el || (el as HTMLButtonElement).disabled) return;
    const d = el.dataset;
    if (d.menue) {
      const m = root.querySelector<HTMLElement>('#nz-menue')!;
      m.hidden = !m.hidden;
      if (!m.hidden) menueZeichnen();
      el.setAttribute('aria-expanded', String(!m.hidden));
      return knopfTon();
    }
    if (d.ton) {
      profil = { ...profil, ton: !profil.ton };
      tonAn(profil.ton);
      knopfTon();
      speichern();
      return menueZeichnen();
    }
    if (d.zurueck) return frage(KIND.wirklichAufhoeren, `<button type="button" class="haupt" data-schliessen="1">${KIND.weiterspielen}</button><button type="button" data-aufhoeren="1">${KIND.aufhoeren}</button>`);
    if (d.schliessen) return void el.closest('.nz-dialog')?.remove();
    if (d.aufhoeren) return void (location.hash = '#/pause');
    if (d.gehe) return void (knopfTon(), (location.hash = `#/${d.gehe}`));
    if (d.noch) {
      knopfTon();
      // eine zurückgelegte Aufgabe kommt zurück, wie sie war – auf dem Bildschirm ohne eigenes Zeichen
      sitzung = naechsteSitzung(neuerSamen(), profil);
      neuerBuchstabe = null;
      geaendert = sitzung.aufgaben.map(() => false);
      zwilling.innerHTML = '';
      welt();
      return oeffne(0, false);
    }
    if (fliegt || phase === 'vergleich') return;
    // der Zwilling-Knopf vergleicht sofort – das Kind hat schon einmal „Vergleichen“ gesehen, keine zweite Frage
    if (d.ueberblick || d.vergleichen) return void vergleichen();
    if (d.slot !== undefined) {
      const i = Number(d.slot);
      if (aenderbar(satz(), i)) {
        setzenTon();
        oeffne(i, true);
      }
      return;
    }
    if (phase !== 'loesen') return;
    if (d.abgabe) return abgeben(el);
    if (Date.now() < sperre) return;
    const pl = platz();
    if (d.hilfe) {
      knopfTon();
      // nächste Stufe; ein pulsierender Knopf hört auf und zählt ab hier neu
      sitzung = hilfeOeffnen(sitzung);
      // Stufe 1 = Lernbeispiel
      if (sitzung.hilfeOffen[aktuell()] === 1) lernSetzen(lernStart());
      speichern();
      return zeichnen();
    }
    if (d.sogehts) {
      knopfTon();
      // Zeichen „So geht's“ (ab Hilfe Stufe 2): öffnet das Lernbeispiel, die Hilfestufe bleibt
      lernSetzen(lernStart());
      speichern();
      return zeichnen();
    }
    if (d.los) {
      knopfTon();
      lernSetzen(undefined);
      sperre = Date.now() + SPERRE_MS;
      speichern();
      return zeichnen();
    }
    if (d.spaeter) {
      knopfTon();
      const i = aktuell();
      sitzung = { ...sitzung, satz: zuruecklegen(satz(), i) };
      if (ende()) {
        abschluss();
        phase = 'fertig';
        speichern(true);
        return zeichnen();
      }
      return weiter(i);
    }
    if (d.ziffer !== undefined || d.loeschen) {
      if (pl.art !== 'zahl') return;
      const alt = pl.entwurf?.art === 'zahl' ? pl.entwurf.wert : null;
      const wert = tippe(markiert ? null : alt, d.loeschen ? { art: 'loeschen' } : { art: 'ziffer', ziffer: Number(d.ziffer) }, pl.feld);
      markiert = false;
      entwurfSetzen(wert === null ? null : { art: 'zahl', wert });
      geaendertUm = Date.now();
      setzenTon();
      speichern();
      return zeichnen();
    }
    const k = d.k ?? d.wahl;
    if (k !== undefined && pl.wahl && (pl.art === 'wahl' || pl.art === 'bild')) {
      const w = pl.wahl[Number(k)];
      // ein anderer Vorschlag ersetzt, derselbe noch einmal nimmt ihn weg
      entwurfSetzen(gleich(w, pl.entwurf) ? null : w);
      geaendertUm = Date.now();
      setzenTon();
      speichern();
      return zeichnen();
    }
  });
  root.addEventListener('keydown', (ev) => {
    const el = (ev.target as Element).closest<HTMLElement>('[data-wahl]');
    if (el && (ev.key === 'Enter' || ev.key === ' ')) {
      ev.preventDefault();
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
  });

  // ── Größen: ein Rechenweg für alle Bildschirme; CSS liest nur die Variablen ──
  function groesse(): void {
    const W = root.clientWidth - 24, H = root.clientHeight;
    const quer = W >= H * 1.05 && W >= 560, niedrig = H < 520;
    root.setAttribute('data-lage', quer ? 'quer' : 'hoch');
    root.toggleAttribute('data-niedrig', niedrig);
    const px = (n: string, v: number) => root.style.setProperty(n, Math.round(v) + 'px');
    const knopf = Math.max(56, Math.min(68, W * 0.055, H * 0.075));
    // Ast: im Querformat zwischen den Knöpfen oben, hochkant über die ganze Breite (die Knöpfe sind unten)
    const astW = (quer ? W - 2 * knopf - knopf * 1.9 - 40 : W) - 16; // 16: Glasrand des Vergleichs (Innenabstand + Rand)
    const n = sitzung.aufgaben.length;
    const kopf = quer || niedrig ? 1.4 : 1.7;
    // Reihe = Kopf (kopf·p − 0,1·p) + n Nester (p + 8 % Lücke, das erste ohne); der Ast endet an der letzten Perle
    const glieder = kopf - 0.1 + n * 1.08 - 0.08;
    const breit = (astW - 18) / glieder;
    const p = Math.max(28, Math.min(84, breit, H * (niedrig ? 0.13 : quer ? 0.085 : 0.06)));
    root.style.setProperty('--kopf', String(kopf));
    const ladeB = quer ? Math.min(480, Math.max(300, W * 0.34)) : Math.min(W, 640, Math.max(470, W * 0.62));
    // Lade passt immer in ihr Glas: zwei Reihen = 6,72·t Kacheln + 0,44·t Innenabstand + 6 px Rand;
    // Tablet quer: eine Reihe 0–9 (13,22·t + 6 px) + Abstand 0,3·t + Blatt (≈ 2,44·t) in der Breite des Tischs (max. 1240 px)
    const breitQuer = (Math.min(W, 1240) - 14) / 16;
    const taste = Math.max(48, Math.min(84, quer && !niedrig ? breitQuer : (ladeB - 6) / 7.16, H * (niedrig ? 0.125 : quer ? 0.1 : 0.065)));
    px('--g', Math.max(8, Math.min(16, H * 0.014)));
    px('--knopf', knopf);
    px('--p', p);
    px('--luecke', p * 0.08);
    px('--treffer', Math.max(0, (48 - p) / 2));
    // Telefon quer: Kacheln sind nie kleiner als 48 px – dann wird die Lade so breit, dass zwei Reihen hineinpassen
    px('--lade-b', quer && !niedrig ? ladeB : Math.max(ladeB, taste * 7.16 + 6));
    px('--taste', taste);
    px('--ab', Math.max(56, Math.min(96, taste * 1.25)));
    if (!finger.hidden) fingerNachfuehren(platz());
  }
  addEventListener('resize', groesse);
  addEventListener('hashchange', () => removeEventListener('resize', groesse), { once: true });

  // ── Start: Phase aus dem gespeicherten Satz ──
  welt();
  groesse();
  if (ende()) {
    phase = 'fertig';
    zeichnen();
  } else if (satz().runden === 0 && satz().perlen.every((p) => p.antwort !== null || p.zurueck)) {
    phase = 'bereit';
    speichern();
    zeichnen();
  } else oeffne(aktuell(), false);
}
