import '../styles/neu.css';
import de from '../i18n/de.json';
import { FORMATE } from '../aufgaben';
import { aufgabeAus, stimmt, STANDARD_EINSTELLUNG, type Aufgabe, type FormatId } from '../aufgaben/format';
import { KIND } from '../i18n/kind';
import { gleich, type Antwort } from '../perlen/antwort';
import { perlenBild } from '../perlen/perle';
import { formPfad, perleSvg } from '../perlen/maler';
import { FORM_FARBEN, ZIFFER_KANTEN } from '../design/farbe';
import { neuerSamen, zufall } from '../core/zufall';
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

/**
 * Neuer Satzbildschirm nach Probe 7c (#/neu) – Vorschau für die Autorin, bis A10 den alten Bildschirm ersetzt.
 * Aufgaben kommen aus den echten Formaten (Generator + Löser, genau eine Lösung). Der Zustand lebt nur im
 * Speicher: nichts wird gespeichert, keine Historie, kein Lernbeispiel – hier geht es um Aussehen und Bedienung.
 *
 * Regeln aus docs/STIL.md, „Управление набором — одна стеклянная бусина“ und „Проба 7c“:
 * - nur die Perle auf dem Blatt schickt die Antwort; Kacheln sind matt;
 * - Fenster der Aufgabe und Lade haben in allen Aufgaben dieselbe Größe, das Blatt liegt immer an derselben Stelle;
 * - beim Lösen nur die Raupe des Kindes; der Zwilling kriecht erst bei „Vergleichen“ auf seinen Ast;
 * - Prüfung nur am Ende, ohne Häkchen und ohne „3 von 6“.
 *
 * Облик по решению автора 20.11.2026 (docs/STIL.md, «Облик экрана набора: стекло»):
 * - фон — картинка мира, мир меняется с каждым набором; доска, лоток, карточка «Vergleichen» и сравнение — светлое стекло;
 * - ряд гусеницы стоит на одном месте во всех фазах; при сравнении вокруг него появляется стекло, близнец выползает под ним;
 * - вертикально «Zurück» и «Menü» внизу по бокам от листа, без подписей; подпись остаётся только у «Hilfe».
 */

type Phase = 'loesen' | 'bereit' | 'vergleich' | 'fertig';
type BlattZustand = 'zu' | 'auf' | 'gold';

interface Zustand {
  aufgaben: Aufgabe[];
  antwort: (Antwort | null)[];
  /** Entwurf der Zahl als Text (eine Stelle nach der anderen), sonst die gewählte Antwort */
  text: string[];
  wahl: (Antwort | null)[];
  blatt: BlattZustand[];
  geaendert: boolean[];
  runden: number;
  aktuell: number;
  phase: Phase;
  korb: number;
  hilfe: boolean;
  /** beim Zurückkehren zu einer beantworteten Zahl: die alte Zahl ist „markiert“, die erste Ziffer ersetzt sie */
  markiert: boolean;
  manuell: boolean;
  fliegt: boolean;
  sperre: number;
  neu: number;
}

const SATZ = 6;
/** Welten in fester Reihenfolge; ein querer Ausschnitt nur, wo er schon gemalt ist (sonst wird der hohe beschnitten) */
const WELTEN: { hoch: string; quer?: string }[] = [
  { hoch: wieseHoch }, { hoch: teichHoch }, { hoch: herbstHoch }, { hoch: lavendelHoch }, { hoch: gluehHoch, quer: gluehQuer },
];
const WELT_SCHLUESSEL = 'denk-raupe.welt';
/** nächste Welt; gemerkt nur auf dem Gerät, ohne Speicher geht es bei der ersten weiter */
function naechsteWelt(): number {
  let i = -1;
  try { i = Number(localStorage.getItem(WELT_SCHLUESSEL) ?? -1); } catch { /* kein Speicher */ }
  const n = ((Number.isFinite(i) ? i : -1) + 1) % WELTEN.length;
  try { localStorage.setItem(WELT_SCHLUESSEL, String(n)); } catch { /* kein Speicher */ }
  return n;
}
const REIHENFOLGE = (Object.keys(FORMATE) as FormatId[]).sort((a, b) => FORMATE[a].nr - FORMATE[b].nr);
const formatName = (id: FormatId) => (de as Record<string, string>)[`format.${id}.name`] ?? id;
const bewegung = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Plan: gemischt (6 verschiedene Formate, Stufe 1–2) oder ein Format (Stufen 1 … höchste) */
function neuerPlan(nur: FormatId | null, samen: number): Aufgabe[] {
  const z = zufall(samen);
  let ids: FormatId[];
  if (nur) ids = Array.from({ length: SATZ }, () => nur);
  else {
    ids = z.mischen(REIHENFOLGE).slice(0, SATZ);
  }
  return ids.map((id, k) => {
    const f = FORMATE[id];
    const stufe = nur ? 1 + Math.floor((k * f.stufen) / SATZ) : 1 + (k % 2);
    return aufgabeAus(f, (samen + k * 104729) >>> 0, stufe, STANDARD_EINSTELLUNG);
  });
}

// ── kleine Bilder ──
const PFEIL = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M29 11 L16 24 L29 37" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const MENUE = '<svg viewBox="0 0 48 48" aria-hidden="true"><g fill="currentColor"><rect x="9" y="12" width="30" height="6" rx="3"/><rect x="9" y="21" width="30" height="6" rx="3"/><rect x="9" y="30" width="30" height="6" rx="3"/></g></svg>';
const LOESCHEN = '<svg viewBox="0 0 60 44" aria-hidden="true"><path d="M20 6 H50 a6 6 0 0 1 6 6 V32 a6 6 0 0 1 -6 6 H20 L5 22 Z" fill="#fff" stroke="#E0457B" stroke-width="3.5" stroke-linejoin="round"/><path d="M30 15 L42 29 M42 15 L30 29" stroke="#E0457B" stroke-width="5" stroke-linecap="round"/></svg>';
/** Pfeil nach oben im hellen Kreis: „im Bild oben tippen“ */
const TIPP = '<svg viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="27" fill="#EAF2FF" stroke="#7F93B5" stroke-width="4"/><path d="M30 44 V18 M19 28 L30 17 L41 28" fill="none" stroke="#3B4A6B" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
/** unsichtbarer Platz in Breite des Zwilling-Knopfs: beide Reihen bleiben gleich breit und stehen still */
const PLATZ = '<span class="nz-ueberblick platz" aria-hidden="true"></span>';
const LEER = '<svg class="nz-perle" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="38" fill="rgba(255,255,255,.4)" stroke="#fff" stroke-width="5" stroke-dasharray="8.92 6"/></svg>';
const BAUMHAUS = '<svg viewBox="0 0 120 110" aria-hidden="true"><rect x="52" y="58" width="16" height="46" rx="5" fill="#9A6A3F"/><ellipse cx="60" cy="104" rx="40" ry="6" fill="#7FCB45"/><circle cx="60" cy="40" r="34" fill="#57B533"/><circle cx="34" cy="50" r="22" fill="#7FCB45"/><circle cx="86" cy="50" r="22" fill="#7FCB45"/><circle cx="60" cy="30" r="22" fill="#8ED24F"/><rect x="44" y="44" width="32" height="26" rx="5" fill="#FFC21F"/><path d="M40 46 L60 30 L80 46 Z" fill="#FF7A59"/><rect x="55" y="54" width="10" height="16" rx="4" fill="#8B5CF6"/></svg>';


function perle(a: Antwort | null): string {
  return a ? perleSvg(perlenBild(a), 'nz-perle') : LEER;
}
function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
/** Kachel in der Farbe der Ziffer: Rand und Kante; das Gesicht bleibt weiß */
function farbStil(d: number): string {
  const rand = ['#B9C5D3', '#EC003F', '#FE8100', '#F2DC00', '#5CCB3E', '#068846', '#2BB6F5', '#2B289F', '#F27DB6', '#7A3004'][d];
  return ` style="--rand:${rand};--kante:${ZIFFER_KANTEN[d]};--schatten:${rgba(ZIFFER_KANTEN[d], 0.42)}"`;
}
/** Inhalt einer Wahlkachel: Zahl als Ziffer, Form als Form, sonst die Perle */
function wahlInhalt(a: Antwort): string {
  if (a.art === 'zahl') return `<span class="nz-wahlzahl">${a.wert}</span>`;
  if (a.art === 'form') {
    const c = FORM_FARBEN[a.farbe as keyof typeof FORM_FARBEN] ?? '#888';
    return `<svg viewBox="0 0 60 60" aria-hidden="true">${formPfad(a.form, 30, 31, a.klein ? 12 : 19, c, c, 2)}</svg>`;
  }
  return perle(a);
}

export function renderNeu(app: HTMLElement): void {
  let s: Zustand;
  let zuletzt: string | null = null;
  /** zuletzt gezeigte Aufgabe: nur eine neue Aufgabe blendet weich ein, nicht jeder Tipp */
  let gezeigt = -1;
  let nur: FormatId | null = null;
  app.innerHTML = `<div class="nz" id="nz"><div class="nz-welt" aria-hidden="true"></div>
    <div class="nz-oben">
      <button type="button" class="nz-knopf" data-zurueck="1" aria-label="${KIND.zurueck}"><span class="nz-rund">${PFEIL}</span></button>
      <div class="nz-rechts"><div class="nz-korb" id="nz-korb"></div>
      <button type="button" class="nz-knopf nz-menueknopf" data-menue="1" aria-label="${KIND.menue}" aria-expanded="false"><span class="nz-rund">${MENUE}</span></button></div>
    </div>
    <section class="nz-ast" aria-label="${KIND.deineRaupe}"><div class="nz-reihe" id="nz-reihe"></div>
      <div class="nz-reihe nz-zwilling" id="nz-zwilling" aria-label="${KIND.deinZwilling}" hidden></div></section>
    <section class="nz-tisch" id="nz-tisch"></section>
    <div class="nz-menue" id="nz-menue" hidden>
      <strong>Probe: Satz wählen</strong>
      <button type="button" class="nz-wahl-satz haupt" data-plan="">Gemischter Satz (6 Formate)</button>
      ${REIHENFOLGE.map((id) => `<button type="button" class="nz-wahl-satz" data-plan="${id}"><b>${FORMATE[id].nr}</b> ${formatName(id)}</button>`).join('')}
    </div>
  </div>`;
  const root = app.querySelector<HTMLElement>('#nz')!;
  const tisch = root.querySelector<HTMLElement>('#nz-tisch')!;
  const zwilling = root.querySelector<HTMLElement>('#nz-zwilling')!;

  function start(): void {
    const aufgaben = neuerPlan(nur, neuerSamen());
    const n = aufgaben.length;
    s = { aufgaben, antwort: Array(n).fill(null), text: Array(n).fill(''), wahl: Array(n).fill(null), blatt: Array(n).fill('zu'), geaendert: Array(n).fill(false),
      runden: 0, aktuell: 0, phase: 'loesen', korb: 0, hilfe: false, markiert: false, manuell: false, fliegt: false, sperre: 0, neu: -1 };
    zuletzt = null; gezeigt = -1;
    const welt = WELTEN[naechsteWelt()];
    root.style.setProperty('--welt-hoch', `url(${welt.hoch})`);
    root.style.setProperty('--welt-quer', `url(${welt.quer ?? welt.hoch})`);
    zeichnen();
  }

  const offen = (i: number) => s.blatt[i] === 'zu';
  const format = (i: number) => FORMATE[s.aufgaben[i].format];
  /** Antwort des Entwurfs: Zahl aus dem Text, sonst die Wahl */
  function entwurf(i: number): Antwort | null {
    if (format(i).eingabe(s.aufgaben[i].bedingung).art === 'zahl') return s.text[i] === '' ? null : { art: 'zahl', wert: Number(s.text[i]) };
    return s.wahl[i];
  }
  function maxStellen(i: number): number { return s.aufgaben[i].zahlenraum === 100 ? 3 : 2; }

  // ── Ast: nur die Raupe des Kindes ──
  function astHtml(): string {
    let h = `<img class="nz-kopf${s.neu >= 0 ? ' freut' : ''}" src="${raupeBild}" alt="">`;
    s.aufgaben.forEach((_, i) => {
      const cls = ['nz-slot'];
      if (s.phase === 'loesen' && i === s.aktuell) cls.push('aktuell');
      if (i === s.neu) cls.push('neu');
      if (s.runden > 0 && offen(i) && !s.geaendert[i]) cls.push('zu-mark');
      h += `<button type="button" class="${cls.join(' ')}" data-slot="${i}" aria-label="${KIND.perleName(i + 1, null)}"><i class="nz-treffer"></i><span class="nz-nest"></span>${s.antwort[i] ? perle(s.antwort[i]) : ''}</button>`;
    });
    const alleDa = s.antwort.every((a, k) => a !== null || !offen(k));
    if (alleDa && s.phase === 'loesen') h += `<button type="button" class="nz-ueberblick" data-ueberblick="1" aria-label="${KIND.vergleichen}"><img src="${zwillingBild}" alt=""></button>`;
    else h += PLATZ;
    return h;
  }
  function korbZeichnen(): void {
    const k = root.querySelector<HTMLElement>('#nz-korb')!;
    const war = k.dataset.zahl ?? '0';
    k.innerHTML = s.korb ? `<img src="${korbVollBild}" alt=""><span class="nz-zahl" aria-label="${KIND.korb(s.korb)}">${s.korb}</span>` : '';
    k.classList.toggle('kommt', war === '0' && s.korb > 0);
    k.dataset.zahl = String(s.korb);
  }

  // ── Lade: Kacheln oben, darunter das Blatt mit der Perle ──
  function tasten(): string {
    let h = `<div class="nz-tasten" role="group" aria-label="${KIND.zahlEingeben}">`;
    for (let d = 0; d <= 9; d++) h += `<button class="nz-taste" type="button" data-ziffer="${d}" aria-label="${d}"${farbStil(d)}>${d}</button>`;
    return h + `<button class="nz-taste nz-loeschen" type="button" data-loeschen="1" aria-label="${KIND.loeschen}">${LOESCHEN}</button></div>`;
  }
  function ladeHtml(i: number): string {
    const a = s.aufgaben[i], f = format(i), art = f.eingabe(a.bedingung).art;
    let werkzeug = '';
    if (art === 'zahl') werkzeug = tasten();
    else if (art === 'wahl' && a.wahl) {
      werkzeug = `<div class="nz-wahl">${a.wahl.map((w, k) => {
        const z = w.art === 'zahl' && w.wert < 10 ? farbStil(w.wert) : '';
        return `<button type="button" class="nz-taste nz-option${gleich(w, s.wahl[i]) ? ' gewaehlt' : ''}" data-k="${k}" aria-pressed="${gleich(w, s.wahl[i])}" aria-label="Antwort ${k + 1}"${z}>${wahlInhalt(w)}</button>`;
      }).join('')}</div>`;
    }
    else if (art === 'bild') werkzeug = `<div class="nz-tipp">${TIPP}<span>${KIND.tippOben}</span></div>`;
    const w = entwurf(i);
    const key = w ? JSON.stringify(w) : null;
    let wechsel = '';
    if (key && key !== zuletzt) wechsel = zuletzt === null ? ' faellt' : ' wechselt';
    zuletzt = key;
    return `<div class="nz-lade"><div class="nz-werkzeug">${werkzeug}</div>
      <div class="nz-ablage"><span class="nz-schale${wechsel === ' faellt' ? ' wippt' : ''}" style="background-image:url(${blattBild})">
      <button type="button" class="nz-abgabe${w ? '' : ' leer'}${wechsel}${s.markiert && w ? ' markiert' : ''}" data-abgabe="1" aria-label="${w ? 'Antwort der Raupe geben' : 'Noch keine Antwort'}">${perle(w)}</button></span></div></div>`;
  }

  // ── Zeichnen ──
  function zeichnen(): void {
    root.setAttribute('data-phase', s.phase);
    root.querySelector('#nz-reihe')!.innerHTML = astHtml();
    korbZeichnen();
    s.neu = -1;
    if (s.phase !== 'vergleich' && s.phase !== 'fertig') { zwilling.hidden = true; zwilling.innerHTML = ''; zwilling.className = 'nz-reihe nz-zwilling'; }
    if (s.phase === 'bereit') {
      gezeigt = -1;
      tisch.innerHTML = `<div class="nz-karte"><p class="nz-karte-text">${KIND.allePerlen}</p><button class="nz-vergleichen" type="button" data-vergleichen="1">${KIND.vergleichen}</button></div>`;
      return;
    }
    if (s.phase === 'fertig') {
      const innen = `<p class="nz-jubel">${KIND.fertigTitel}</p><div class="nz-ende">
            <button type="button" class="nz-kachel" data-gehe="welt">${BAUMHAUS}<span>${KIND.welt}</span></button>
            <button type="button" class="nz-kachel haupt" data-noch="1"><img src="${raupeBild}" alt=""><span>${KIND.neuerSatz}</span></button>
            <button type="button" class="nz-kachel" data-gehe="pause"><img src="${raupeLiegtBild}" alt=""><span>Pause</span></button></div>${regen()}`;
      gezeigt = -1;
      tisch.innerHTML = `<div class="nz-brett voll"><div class="nz-bereit">${innen}</div></div>`;
      return;
    }
    const i = s.aktuell, a = s.aufgaben[i], f = format(i);
    const notiz = s.runden > 0 && offen(i) && !s.geaendert[i] ? 'Hier ist noch ein Blatt. Schau noch einmal.' : '';
    const bild = f.zeichne(a.bedingung, { hilfe: s.hilfe ? 2 : 0, gewaehlt: entwurf(i) });
    const frisch = gezeigt !== i; gezeigt = i;
    tisch.innerHTML = `<div class="nz-brett${frisch ? ' frisch' : ''}"><div class="nz-frage-zeile"><h1 class="nz-frage">${KIND.auftrag[f.auftrag]}</h1>
      <button class="nz-laterne" type="button" data-hilfe="1" aria-pressed="${s.hilfe}"><span class="nz-rund"><img src="${laterneBild}" alt=""></span><span class="nz-name">${KIND.hilfe}</span></button></div>
      <div class="nz-bild" id="nz-bild">${bild}</div>${notiz ? `<p class="nz-hinweis">${notiz}</p>` : ''}</div>${ladeHtml(i)}`;
  }
  function regen(): string {
    let h = '<div class="nz-regen" aria-hidden="true">';
    for (let k = 0; k < 9; k++) h += `<img src="${k % 4 === 0 ? blattGoldBild : blattBild}" style="--x:${6 + k * 11}%;--v:${k * 0.35}s;--d:${2.6 + (k % 3) * 0.5}s" alt="">`;
    return h + '</div>';
  }

  // ── Ablauf ──
  function oeffne(i: number, vonHand: boolean): void {
    s.aktuell = i; s.manuell = vonHand && s.antwort[i] !== null; s.hilfe = false; s.sperre = Date.now() + 300;
    const a = s.aufgaben[i];
    const istZahl = format(i).eingabe(a.bedingung).art === 'zahl';
    const alt = s.antwort[i];
    if (istZahl) s.text[i] = alt && alt.art === 'zahl' ? String(alt.wert) : '';
    else s.wahl[i] = alt;
    s.markiert = istZahl && alt !== null;
    zuletzt = null;
    s.phase = 'loesen'; zeichnen();
  }
  function naechstes(von: number): number {
    for (let d = 1; d <= s.aufgaben.length; d++) {
      const i = (von + d) % s.aufgaben.length;
      if (!offen(i)) continue;
      if (s.runden === 0 ? s.antwort[i] === null : !s.geaendert[i]) return i;
    }
    return -1;
  }
  function abgeben(knopf: HTMLElement): void {
    const i = s.aktuell, w = entwurf(i);
    if (!w) { knopf.classList.remove('atmet'); void knopf.offsetWidth; knopf.classList.add('atmet'); return; }
    const ziel = root.querySelector<HTMLElement>(`[data-slot="${i}"]`);
    flug(w, knopf, ziel, () => {
      s.antwort[i] = w; s.neu = i; if (s.runden > 0) s.geaendert[i] = true;
      s.markiert = false; zuletzt = null;
      if (s.manuell) { zeichnen(); return; }
      const n = naechstes(i);
      if (n === -1) { s.phase = 'bereit'; zeichnen(); } else oeffne(n, false);
    });
  }
  function flug(w: Antwort, von: HTMLElement, nach: HTMLElement | null, dann: () => void): void {
    if (!nach || !bewegung()) { dann(); return; }
    s.fliegt = true;
    const a = von.getBoundingClientRect(), b = nach.getBoundingClientRect();
    const el = document.createElement('div'); el.className = 'nz-flug';
    el.style.cssText = `width:${a.width}px;height:${a.height}px`;
    el.innerHTML = perle(w); document.body.appendChild(el); von.style.visibility = 'hidden';
    const s1 = b.width / a.width, mx = (a.left + b.left) / 2, my = Math.min(a.top, b.top) - 40;
    el.animate([
      { transform: `translate(${a.left}px,${a.top}px) scale(1)` },
      { transform: `translate(${mx}px,${my}px) scale(${(1 + s1) / 2 + 0.08})`, offset: 0.55 },
      { transform: `translate(${b.left}px,${b.top}px) scale(${s1})` },
    ], { duration: 520, easing: 'cubic-bezier(.4,.1,.3,1)', fill: 'forwards' }).onfinish = () => {
      el.remove(); s.fliegt = false; funken(b.left + b.width / 2, b.top + b.height / 2); setTimeout(dann, 150);
    };
  }
  function funken(x: number, y: number): void {
    if (!bewegung()) return;
    const box = document.createElement('div'); box.className = 'nz-funken'; box.style.left = x + 'px'; box.style.top = y + 'px';
    for (let k = 0; k < 8; k++) { const f = document.createElement('i'); f.style.setProperty('--w', k * 45 + 'deg'); box.appendChild(f); }
    document.body.appendChild(box); setTimeout(() => box.remove(), 700);
  }

  // ── Vergleichen: der Zwilling kriecht auf seinen Ast, Blätter heben sich der Reihe nach ──
  function vergleichen(): void {
    const erste = s.runden === 0; s.runden++;
    s.phase = 'vergleich'; zeichnenAst();
    let h = `<img class="nz-kopf" src="${zwillingBild}" alt="" style="--i:0">`;
    s.aufgaben.forEach((a, i) => {
      const l = FORMATE[a.format].loesungen(a.bedingung)[0];
      const zu = s.blatt[i] === 'zu';
      h += `<span class="nz-slot" data-gslot="${i}" style="--i:${i + 1}"><span class="nz-nest"></span>${perle(l)}<img class="nz-blatt${zu ? '' : ' weg'}" src="${s.blatt[i] === 'gold' ? blattGoldBild : blattBild}" alt=""></span>`;
    });
    zwilling.innerHTML = h + PLATZ;
    zwilling.className = 'nz-reihe nz-zwilling kriecht'; zwilling.hidden = false;
    tisch.innerHTML = `<p class="nz-vtext" aria-live="polite">${KIND.zwillingKommt}</p>`;
    const zeile = tisch.querySelector<HTMLElement>('.nz-vtext')!;
    const offene = s.aufgaben.map((_, i) => i).filter(offen);
    const bleiben: number[] = [];
    const takt = bewegung() ? 380 : 0, kriechen = bewegung() ? 1700 : 0;
    offene.forEach((i, k) => setTimeout(() => {
      const g = zwilling.querySelector(`[data-gslot="${i}"] .nz-blatt`);
      if (stimmt(format(i), s.aufgaben[i], s.antwort[i]!)) {
        s.blatt[i] = erste ? 'gold' : 'auf'; s.korb += erste ? 2 : 1;
        g?.classList.add('weg'); korbZeichnen();
        const kb = root.querySelector('#nz-korb')!; kb.classList.remove('hupf'); void (kb as HTMLElement).offsetWidth; kb.classList.add('hupf');
      } else { bleiben.push(i); g?.classList.add('wackelt'); }
    }, kriechen + 300 + takt * k));
    setTimeout(() => {
      s.geaendert = s.geaendert.map(() => false);
      if (!bleiben.length) { s.phase = 'fertig'; zeichnen(); return; }
      zeile.textContent = bleiben.length === 1 ? KIND.einBlattZu : KIND.paarBlaetterZu;
      setTimeout(() => {
        zwilling.classList.add('zu');
        setTimeout(() => oeffne(bleiben[0], false), bewegung() ? 300 : 0);
      }, 1500);
    }, kriechen + 300 + takt * offene.length + 200);
  }
  function zeichnenAst(): void {
    root.setAttribute('data-phase', s.phase);
    root.querySelector('#nz-reihe')!.innerHTML = astHtml();
  }

  function frage(text: string, knoepfe: string): HTMLElement {
    const el = document.createElement('div');
    el.className = 'nz-dialog'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = `<div class="nz-dialog-karte"><img src="${raupeBild}" alt=""><p>${text}</p><div class="nz-zwei">${knoepfe}</div></div>`;
    root.appendChild(el); el.querySelector('button')?.focus();
    return el;
  }

  // ── Tippen ──
  root.addEventListener('click', (ev) => {
    const el = (ev.target as Element).closest<HTMLElement>('button, [data-wahl]');
    if (!el) return;
    const d = el.dataset;
    if (d.menue) { const m = root.querySelector<HTMLElement>('#nz-menue')!; m.hidden = !m.hidden; el.setAttribute('aria-expanded', String(!m.hidden)); return; }
    if (d.plan !== undefined) { nur = (d.plan || null) as FormatId | null; root.querySelector<HTMLElement>('#nz-menue')!.hidden = true; start(); return; }
    if (d.zurueck) { frage('Wirklich aufhören?', `<button type="button" class="haupt" data-schliessen="1">Weiterspielen</button><button type="button" data-aufhoeren="1">Aufhören</button>`); return; }
    if (d.schliessen) { el.closest('.nz-dialog')?.remove(); return; }
    if (d.aufhoeren) { location.hash = '#/alle'; return; }
    if (d.gehe) { location.hash = `#/${d.gehe}`; return; }
    if (d.noch) { start(); return; }
    if (s.fliegt || s.phase === 'vergleich') return;
    if (d.ueberblick) { s.phase = 'bereit'; zeichnen(); return; }
    if (d.slot !== undefined) { const i = Number(d.slot); if (offen(i)) oeffne(i, true); return; }
    if (d.vergleichen) { vergleichen(); return; }
    if (s.phase !== 'loesen') return;
    const i = s.aktuell;
    if (d.abgabe) { abgeben(el); return; }
    if (Date.now() < s.sperre) return;
    if (d.hilfe) { s.hilfe = !s.hilfe; zeichnen(); return; }
    if (d.ziffer !== undefined) {
      let t = s.markiert ? '' : s.text[i];
      s.markiert = false;
      t = t.length >= maxStellen(i) ? d.ziffer : t === '0' ? d.ziffer : t + d.ziffer;
      s.text[i] = t; zeichnen(); return;
    }
    if (d.loeschen) { s.text[i] = s.markiert ? '' : s.text[i].slice(0, -1); s.markiert = false; zeichnen(); return; }
    const a = s.aufgaben[i];
    if (d.k !== undefined && a.wahl) { const w = a.wahl[Number(d.k)]; s.wahl[i] = gleich(w, s.wahl[i]) ? null : w; zeichnen(); return; }
    if (d.wahl !== undefined && a.wahl) { const w = a.wahl[Number(d.wahl)]; s.wahl[i] = gleich(w, s.wahl[i]) ? null : w; zeichnen(); return; }
  });
  root.addEventListener('keydown', (ev) => {
    const el = (ev.target as Element).closest<HTMLElement>('[data-wahl]');
    if (el && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); el.click(); }
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
    const n = s ? s.aufgaben.length : SATZ;
    const kopf = quer || niedrig ? 1.4 : 1.65;
    // Reihe = Kopf (kopf·p − 0,1·p) + n Nester (p + 8 % Lücke, das erste ohne) + 10 px rechts + Zwilling-Knopf (max(44 px, 0,9·p) + 10 px)
    const glieder = kopf - 0.1 + n * 1.08 - 0.08;
    const breit = Math.min((astW - 20 - 44) / glieder, (astW - 20) / (glieder + 0.9));
    const p = Math.max(28, Math.min(84, breit, H * (niedrig ? 0.13 : quer ? 0.085 : 0.075)));
    root.style.setProperty('--kopf', String(kopf));
    const ladeB = quer ? Math.min(480, Math.max(300, W * 0.34)) : Math.min(W, 640, Math.max(470, W * 0.62));
    const taste = Math.max(44, Math.min(84, (ladeB - 54) / 5.95, H * (niedrig ? 0.125 : quer ? 0.1 : 0.062)));
    px('--g', Math.max(8, Math.min(16, H * 0.014))); px('--knopf', knopf); px('--p', p); px('--luecke', p * 0.08);
    px('--treffer', Math.max(0, (48 - p) / 2)); px('--lade-b', ladeB); px('--taste', taste); px('--ab', Math.max(56, Math.min(96, taste * 1.25)));
  }
  addEventListener('resize', groesse);
  addEventListener('hashchange', () => removeEventListener('resize', groesse), { once: true });
  groesse();
  start();
}
