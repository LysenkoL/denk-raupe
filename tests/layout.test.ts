import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';
import { createServer, type ViteDevServer } from 'vite';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { FORMATE } from '../src/aufgaben';
import { aufgabeAus, lernbeispiel, stimmt, type Aufgabe, type FormatId, type HilfeStufe, type Zahlenraum } from '../src/aufgaben/format';
import { hilfePunkte, type Mauer } from '../src/aufgaben/zahlenmauer';
import { setzeAntwort, vergleiche } from '../src/satz/vergleich';
import { neueSitzung, neuesProfil, PROBE_FORMATE, type Profil, type Sitzung } from '../src/satz/sitzung';
import { gleich, type Antwort } from '../src/perlen/antwort';
import { KIND } from '../src/i18n/kind';

/**
 * Satz im echten Browser: Telefon 360 px hoch und quer, Tablet hoch und quer; dazu der ganze Ablauf –
 * Lernbeispiel, Zahl mit Perlen, Hilfe, Vergleichen, Korrigieren, Zurücklegen, Wiederherstellen.
 */
const GERAETE: [string, number, number][] = [
  ['Telefon hoch', 360, 640],
  ['Telefon quer', 640, 360],
  ['Tablet hoch', 800, 1280],
  ['Tablet quer', 1280, 800],
];

let server: ViteDevServer;
let browser: Browser;
let url: string;

beforeAll(async () => {
  server = await createServer({ root: resolve(__dirname, '..'), logLevel: 'silent', server: { port: 0, host: '127.0.0.1' } });
  await server.listen();
  url = server.resolvedUrls!.local[0];
  browser = await chromium.launch();
});
afterAll(async () => {
  await browser?.close();
  await server?.close();
});

const SAMEN = 20261115;

/**
 * Seite mit festem Satz; `formate` = Kenntnis im Profil (Standard: alle bekannt); `gespeichert` = so liegt es schon im Speicher;
 * `bewegung` = ohne „weniger Bewegung“ (Standard: mit, damit nichts wartet)
 */
async function oeffnen(
  w: number,
  h: number,
  o: { formate?: Profil['formate']; samen?: number; gespeichert?: { sitzung: Sitzung; profil: unknown }; weitere?: Record<string, unknown>; bewegung?: boolean } = {},
): Promise<{ page: Page; sitzung: Sitzung }> {
  const page = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: o.bewegung ? 'no-preference' : 'reduce' });
  const sitzung = o.gespeichert?.sitzung ?? neueSitzung(o.samen ?? SAMEN);
  const alleBekannt = Object.fromEntries(PROBE_FORMATE.map((id) => [id, 'bekannt']));
  const profil = o.gespeichert?.profil ?? { ...neuesProfil(), ton: false, formate: o.formate ?? alleBekannt };
  // Musterseite fasst den Speicher nicht an – sonst könnte die App beim ersten Laden einen eigenen Satz speichern
  await page.goto(url + '#/stil');
  await page.evaluate(
    ([s, p, weitere]) =>
      new Promise<void>((ok) => {
        const req = indexedDB.open('denk-raupe', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('kv');
        req.onsuccess = () => {
          const tx = req.result.transaction('kv', 'readwrite');
          tx.objectStore('kv').put(s, 'sitzung');
          tx.objectStore('kv').put(p, 'profil');
          for (const [k, w] of Object.entries(weitere)) tx.objectStore('kv').put(w, k);
          tx.oncomplete = () => (req.result.close(), ok());
        };
      }),
    [sitzung, profil, o.weitere ?? {}] as const,
  );
  await page.goto(url + '#/');
  await page.reload();
  await page.waitForSelector('.perle');
  await page.evaluate(() => document.fonts.ready);
  return { page, sitzung };
}

const bekanntesProfil = () => ({ ...neuesProfil(), ton: false, formate: Object.fromEntries(PROBE_FORMATE.map((id) => [id, 'bekannt'])) });

/** fester Satz, dessen Zahlenmauer eine andere größte Zahl hat (Stufe 2: Grenze = Zahlenraum) */
function satzMitMauer(stufe: number, zahlenraum: Zahlenraum): { sitzung: Sitzung; i: number } {
  const s = neueSitzung(SAMEN);
  const i = s.aufgaben.findIndex((a) => a.format === 'zahlenmauer');
  const aufgaben = s.aufgaben.map((a, j) => (j === i ? aufgabeAus(FORMATE.zahlenmauer, a.samen, stufe, { zahlenraum }) : a));
  return { sitzung: { ...s, aufgaben }, i };
}

/** Plätze der Zahleingabe: Name zum Vorlesen, Inhalt (Ziffer oder „leer“), gewählt */
function plaetzeLesen(page: Page, wo = '') {
  return page.$$eval(`${wo} .platz`, (els) =>
    els.map((e) => ({
      name: e.getAttribute('aria-label'),
      inhalt: document.getElementById(e.getAttribute('aria-describedby')!)!.textContent,
      gewaehlt: e.getAttribute('aria-pressed') === 'true',
    })),
  );
}
const inhalte = async (page: Page, wo = '') => (await plaetzeLesen(page, wo)).map((p) => p.inhalt);
const perleText = (page: Page, i: number) => page.getAttribute(`.perle[data-i="${i}"]`, 'aria-label');

/** Wert aus dem Speicher der Seite (IndexedDB) */
function gespeichert<T = unknown>(page: Page, schluessel: string): Promise<T> {
  return page.evaluate(
    (k) =>
      new Promise((ok) => {
        const req = indexedDB.open('denk-raupe', 1);
        req.onsuccess = () => {
          const g = req.result.transaction('kv').objectStore('kv').get(k);
          g.onsuccess = () => (req.result.close(), ok(g.result));
        };
      }),
    schluessel,
  ) as Promise<T>;
}

function loesung(s: Sitzung, i: number): Antwort {
  const a = s.aufgaben[i];
  return FORMATE[a.format].loesungen(a.bedingung)[0];
}

/** eine andere (falsche) Antwort derselben Art */
function falsch(s: Sitzung, i: number): Antwort {
  const a = s.aufgaben[i];
  const l = loesung(s, i);
  if (a.wahl) return a.wahl.find((w) => !gleich(w, l))!;
  return { art: 'zahl', wert: l.art === 'zahl' ? (l.wert + 1) % 100 : 1 };
}

/** Antwort so eingeben, wie das Kind es tut */
async function eingeben(page: Page, s: Sitzung, i: number, antwort: Antwort): Promise<void> {
  await page.click(`.perle[data-i="${i}"]`);
  const a = s.aufgaben[i];
  const art = FORMATE[a.format].eingabe(a.bedingung).art;
  if (art === 'zahl' && antwort.art === 'zahl') {
    // vorhandene Zahl löschen
    while (await page.isEnabled('[data-ziffer="x"]')) await page.click('[data-ziffer="x"]');
    for (const d of String(antwort.wert)) await page.click(`[data-ziffer="${d}"]`);
  } else if (art === 'wahl') {
    await page.click(`.wahl button[data-k="${a.wahl!.findIndex((w) => gleich(w, antwort))}"]`);
  } else {
    await page.click(`[data-wahl="${a.wahl!.findIndex((w) => gleich(w, antwort))}"]`);
  }
  await bewegungFertig(page);
}

/** endliche Animationen abwarten (abgebrochene zählen als fertig; Blinzeln und Fühler laufen immer) */
async function bewegungFertig(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.all(document.getAnimations().filter((x) => x.effect?.getTiming().iterations !== Infinity).map((x) => x.finished.catch(() => null))),
  );
}

/** Hilfe Stufe 2 auf dem Bild: der hervorgehobene Teil ist markiert (in allen drei Formaten, src/aufgaben/format.ts) */
const HILFE2 = 'data-hilfe="teil"';
const lernRichtig = (a: Aufgabe): Antwort => FORMATE[a.format].loesungen(a.bedingung)[0];
/** falsche Antwort im Lernbeispiel: andere Wahl oder eine andere einstellige Zahl */
function lernFalsch(a: Aufgabe): Antwort {
  const l = lernRichtig(a);
  if (a.wahl) return a.wahl.find((w) => !gleich(w, l))!;
  return { art: 'zahl', wert: l.art === 'zahl' ? (l.wert + 1) % 10 : 1 };
}
/** im Lernbeispiel tippen, wie das Kind es tut */
async function lernTippen(page: Page, a: Aufgabe, antwort: Antwort): Promise<void> {
  const art = FORMATE[a.format].eingabe(a.bedingung).art;
  if (art === 'zahl' && antwort.art === 'zahl') for (const d of String(antwort.wert)) await page.click(`.lern [data-ziffer="${d}"]`);
  else {
    const k = a.wahl!.findIndex((w) => gleich(w, antwort));
    await page.click(art === 'wahl' ? `.lern .wahl button[data-k="${k}"]` : `.lern [data-wahl="${k}"]`);
  }
}

async function vergleichen(page: Page): Promise<void> {
  await page.click('.vergleichen');
  // mit Bewegung fliegen die Blätter erst noch in den Korb: so lange ist der Satz „beschäftigt“
  await page.waitForFunction(() => document.querySelector('.satz')?.getAttribute('aria-busy') === 'false');
  await page.waitForFunction(() => document.querySelector('.ende') || !document.querySelector('.vergleichen')!.hasAttribute('disabled') || document.querySelector('.meldung')?.textContent);
  await bewegungFertig(page);
  await page.waitForTimeout(200);
}

for (const [name, w, h] of GERAETE) {
  describe(`Satz-Bildschirm: ${name} (${w}×${h})`, () => {
    it('kein waagerechtes Scrollen, Zwilling genau unter der Raupe, Perlen und Knöpfe groß genug', async () => {
      const { page, sitzung } = await oeffnen(w, h);
      for (let i = 0; i < sitzung.aufgaben.length; i++) await eingeben(page, sitzung, i, loesung(sitzung, i));
      const m = await page.evaluate(() => {
        const box = (el: Element) => el.getBoundingClientRect();
        const kind = [...document.querySelectorAll('.raupe-zeile.kind .perle')].map(box);
        const zw = [...document.querySelectorAll('.raupe-zeile.zwilling .zwilling-perle')].map(box);
        const koepfe = [...document.querySelectorAll('.vorne')].map(box);
        return {
          scrollW: document.documentElement.scrollWidth,
          kind: kind.map((r) => ({ x: r.x + r.width / 2, y: r.y, h: r.height })),
          zw: zw.map((r) => ({ x: r.x + r.width / 2 })),
          kopfRechts: Math.max(...koepfe.map((r) => r.right)),
          buehneRechts: box(document.querySelector('.ast-zone')!).right,
          buehneLinks: box(document.querySelector('.ast-zone')!).left,
          kopfLinks: Math.min(...koepfe.map((r) => r.left)),
          ziffern: [...document.querySelectorAll('[data-ziffer]')].map((e) => box(e).height),
          plaetze: [...document.querySelectorAll('.platz, .nest')].map((e) => ({ w: box(e).width, h: box(e).height })),
        };
      });
      expect(m.scrollW).toBeLessThanOrEqual(w);
      for (const p of m.kind) expect(Math.abs(p.y - m.kind[0].y)).toBeLessThan(1);
      m.kind.forEach((p, i) => expect(Math.abs(p.x - m.zw[i].x), `Perle ${i + 1}`).toBeLessThan(1));
      for (const p of m.kind) expect(p.h).toBeGreaterThanOrEqual(48);
      // Vorderteile von Raupe und Zwilling bleiben auf dem Ast
      expect(m.kopfRechts).toBeLessThanOrEqual(m.buehneRechts + 1);
      expect(m.kopfLinks).toBeGreaterThanOrEqual(m.buehneLinks - 1);
      for (const z of m.ziffern) expect(z).toBeGreaterThanOrEqual(48);
      // Zahlenmauer offen: zwei Plätze (Mulde und ganzer Platz) mindestens 48 px
      expect(m.plaetze).toHaveLength(4);
      for (const p of m.plaetze) expect(Math.min(p.w, p.h)).toBeGreaterThanOrEqual(48);
      const k = (await page.locator('.vergleichen').boundingBox())!;
      expect(k.height).toBeGreaterThanOrEqual(56);
      expect(k.y + k.height).toBeLessThanOrEqual(h + 1);
      await page.close();
    });
  });
}

/**
 * Satz nach dem ersten Vergleichen: im Format `id` ist Hilfe `hilfe` offen, seine Antwort wieder leer (Bild mit „?“).
 * `samen`: andere Aufgabe desselben Formats (z. B. eine Mauer mit vielen Punkten).
 */
function satzMitHilfe(id: FormatId, stufe: number, hilfe: HilfeStufe, zahlenraum: Zahlenraum = 20, samen?: number): Sitzung {
  const s = neueSitzung(SAMEN);
  const i = s.aufgaben.findIndex((a) => a.format === id);
  const aufgaben = s.aufgaben.map((a, j) => (j === i ? aufgabeAus(FORMATE[id], samen ?? a.samen, stufe, { zahlenraum }) : a));
  const daneben = (a: Aufgabe): Antwort => {
    const l = FORMATE[a.format].loesungen(a.bedingung)[0];
    return a.wahl ? a.wahl.find((w) => !gleich(w, l))! : { art: 'zahl', wert: l.art === 'zahl' ? (l.wert + 1) % 100 : 1 };
  };
  const voll = aufgaben.reduce((satz, a, j) => setzeAntwort(satz, j, daneben(a)), s.satz);
  const geprueft = vergleiche(voll, (j, antwort) => stimmt(FORMATE[aufgaben[j].format], aufgaben[j], antwort)).satz;
  return { ...s, aufgaben, satz: setzeAntwort(geprueft, i, null), aktuell: i, hilfeOffen: aufgaben.map((_, j) => (j === i ? hilfe : 0)) };
}

/** Samen einer Mauer bis 100 (Stufe 2) mit mindestens 60 Punkten in Hilfe 3: das größte Punktefeld auf dem Bildschirm */
function vollePunkte(): number {
  for (let s = 1; ; s++) if (hilfePunkte(aufgabeAus(FORMATE.zahlenmauer, s, 2, { zahlenraum: 100 }).bedingung as Mauer).length >= 60) return aufgabeAus(FORMATE.zahlenmauer, s, 2, { zahlenraum: 100 }).samen;
}

/** Hilfe auf dem Bild je Format: [Name, Format, Stufe, Hilfe, Zahlenraum, Samen] */
const HILFE_FAELLE: [string, FormatId, number, HilfeStufe, Zahlenraum, number?][] = [
  ...PROBE_FORMATE.flatMap((id) => ([2, 3] as const).map((hilfe) => [`${id}, Hilfe ${hilfe}`, id, 2, hilfe, 20] as [string, FormatId, number, HilfeStufe, Zahlenraum])),
  ['wer-ist-es Stufe 1, Hilfe 3 an der ähnlichen Aufgabe', 'wer-ist-es', 1, 3, 20],
  ['zahlenmauer bis 100, Hilfe 3 mit vielen Punkten', 'zahlenmauer', 2, 3, 100, vollePunkte()],
];

for (const [name, w, h] of GERAETE) {
  describe(`Hilfe auf dem Bild: ${name} (${w}×${h})`, () => {
    it.each(HILFE_FAELLE)('%s: alles im Bild, nichts ragt hinaus, Punkte groß genug', async (_, id, stufe, hilfe, zahlenraum, samen) => {
      const { page } = await oeffnen(w, h, { gespeichert: { sitzung: satzMitHilfe(id, stufe, hilfe, zahlenraum, samen), profil: bekanntesProfil() } });
      const m = await page.evaluate(() => {
        const box = (el: Element) => {
          const r = el.getBoundingClientRect();
          return { l: r.left, r: r.right, w: r.width, h: r.height };
        };
        const eigen = document.querySelector('.aufgabe .feld > .aufgabe-bild svg')!;
        const kasten = document.querySelector('.hilfe-box svg');
        return {
          scrollW: document.documentElement.scrollWidth,
          eigen: box(eigen),
          kasten: kasten ? box(kasten) : null,
          teil: [...eigen.querySelectorAll('[data-hilfe="teil"]')].map(box),
          schrittEigen: eigen.querySelectorAll('[data-hilfe="schritt"]').length,
          schrittKasten: kasten ? kasten.querySelectorAll('[data-hilfe="schritt"]').length : 0,
          punkte: [...eigen.querySelectorAll('[data-punkt]')].map(box),
          hilfeKnopf: box(document.querySelector('.hilfe-knopf')!),
        };
      });
      expect(m.scrollW).toBeLessThanOrEqual(w);
      expect(m.eigen.l).toBeGreaterThanOrEqual(0);
      expect(m.eigen.r).toBeLessThanOrEqual(w);
      // Stufe 2 (auch in Stufe 3 enthalten): der hervorgehobene Teil liegt sichtbar im Bild
      expect(m.teil.length).toBeGreaterThan(0);
      for (const t of m.teil) {
        expect(t.w).toBeGreaterThan(10);
        expect(t.l).toBeGreaterThanOrEqual(m.eigen.l - 1);
        expect(t.r).toBeLessThanOrEqual(m.eigen.r + 1);
      }
      if (hilfe === 3 && id === 'wer-ist-es' && stufe === 1) {
        // der Schritt verriete die eigene Lösung: an der eigenen Aufgabe nichts, im Kasten an der ähnlichen
        expect(m.schrittEigen).toBe(0);
        expect(m.kasten).not.toBeNull();
        expect(m.schrittKasten).toBeGreaterThan(0);
        expect(m.kasten!.r).toBeLessThanOrEqual(w);
      } else if (hilfe === 3) {
        expect(m.schrittEigen).toBeGreaterThan(0);
        expect(m.kasten).toBeNull();
      } else expect(m.schrittEigen).toBe(0);
      // Punkte der Zahlenmauer: zu sehen und zu zählen. Bis 20 (zwei Reihen) mindestens 7 px; bis 100 (bis zu zehn
      // Reihen) auf dem quer gehaltenen Telefon kleiner, weil das Bild dort nur 42 % der Höhe bekommt (Bildschirm: A9)
      for (const p of m.punkte) expect(Math.min(p.w, p.h)).toBeGreaterThanOrEqual(zahlenraum === 100 ? 5 : 7);
      if (id === 'zahlenmauer' && hilfe === 3) expect(m.punkte.length).toBeGreaterThan(0);
      expect(m.hilfeKnopf.h).toBeGreaterThanOrEqual(48);
      await page.close();
    });
  });
}

describe('Ablauf eines Satzes', () => {
  it('Zahl mit Ziffernperlen: 1 dann 4 ergibt 14 (Z und E), Löschen nimmt die letzte Ziffer und lässt die 1 in Z', async () => {
    const { sitzung, i } = satzMitMauer(2, 20);
    const { page } = await oeffnen(390, 800, { gespeichert: { sitzung, profil: bekanntesProfil() } });
    await page.click(`.perle[data-i="${i}"]`);
    expect((await plaetzeLesen(page)).map((p) => p.name)).toEqual(['Zehner', 'Einer']);
    expect(await page.$$eval('.platz-zeichen', (e) => e.map((x) => x.textContent))).toEqual(['Z', 'E']);
    await page.click('[data-ziffer="1"]');
    expect(await inhalte(page)).toEqual(['leer', '1']);
    expect(await perleText(page, i)).toContain(': 1');
    await page.click('[data-ziffer="4"]');
    expect(await inhalte(page)).toEqual(['1', '4']);
    expect(await perleText(page, i)).toContain(': 14');
    // Löschen ohne Wahl: die 4 geht, die 1 bleibt Zehner; ohne Einer gibt es noch keine Zahl
    await page.click('[data-ziffer="x"]');
    expect(await inhalte(page)).toEqual(['1', 'leer']);
    expect(await perleText(page, i)).toContain('noch leer');
    await page.click('[data-ziffer="5"]');
    expect(await perleText(page, i)).toContain(': 15');
    // gespeichert wird nur die Zahl
    await page.waitForTimeout(150);
    expect((await gespeichert<Sitzung>(page, 'sitzung')).satz.perlen[i].antwort).toEqual({ art: 'zahl', wert: 15 });
    await page.close();
  });

  it('Vergleichen: Blatt bleibt nur über der anderen Antwort; korrigiert → fertig, Blätter im Korb', async () => {
    const { page, sitzung } = await oeffnen(390, 800);
    expect(await page.isDisabled('.vergleichen')).toBe(true);
    for (let i = 0; i < 3; i++) await eingeben(page, sitzung, i, i === 1 ? falsch(sitzung, i) : loesung(sitzung, i));
    await vergleichen(page);
    const zu = await page.$$eval('.zwilling-perle', (els) => els.map((e) => !!e.querySelector('.blatt')));
    expect(zu).toEqual([false, true, false]);
    // die richtige Lösung steht nirgends auf dem Bildschirm
    expect(await page.textContent('.meldung')).toContain('Blatt');
    await eingeben(page, sitzung, 1, loesung(sitzung, 1));
    await vergleichen(page);
    await page.waitForSelector('.ende');
    expect(await page.$$eval('.korb .blatt-img', (e) => e.length)).toBe(3);
    expect(await page.$$eval('.geheim span.auf', (e) => e.length)).toBe(1);
    await page.close();
  });

  it('nach Neuladen ist alles wieder da (Antworten, aktuelle Aufgabe)', async () => {
    const { page, sitzung } = await oeffnen(390, 800);
    await eingeben(page, sitzung, 0, loesung(sitzung, 0));
    await eingeben(page, sitzung, 2, falsch(sitzung, 2));
    await page.waitForTimeout(150);
    await page.reload();
    await page.waitForSelector('.perle');
    const labels = await page.$$eval('.raupe-zeile.kind .perle', (els) => els.map((e) => e.getAttribute('aria-label')));
    expect(labels[0]).not.toContain('noch leer');
    expect(labels[1]).toContain('noch leer');
    expect(labels[2]).not.toContain('noch leer');
    expect(await page.getAttribute('.perle[data-i="2"]', 'aria-current')).toBe('step');
    await page.close();
  });

  it('Satz aus Version 1 öffnet sich nach dem Update mit denselben Aufgaben und Antworten', async () => {
    const v1 = JSON.parse(readFileSync(resolve(__dirname, 'fixtures/speicher-v1.json'), 'utf8'));
    const { page } = await oeffnen(390, 800, { gespeichert: v1 });
    const labels = await page.$$eval('.raupe-zeile.kind .perle', (els) => els.map((e) => e.getAttribute('aria-label')));
    expect(labels).toEqual(['Aufgabe 1: Quadrat', 'Aufgabe 2: 3', 'Aufgabe 3: 2']);
    // aktuelle Aufgabe: die Zahlenmauer aus Version 1, Hilfe 3 offen, gleiche Steine
    expect(await page.getAttribute('.perle[data-i="1"]', 'aria-current')).toBe('step');
    expect(await page.textContent('.auftrag')).toBe('Welche Zahl fehlt?');
    const steine = await page.$$eval('.aufgabe-bild svg text', (els) => els.map((e) => e.textContent));
    for (const z of [5, 1, 6, 2, 8]) expect(steine).toContain(String(z));
    expect(steine).toContain('3');
    // Hilfe 3 (ergänzen: ? + 1 = 2) als Punkte: einer für den Nachbarn, einer leer – keine Rechnung als Text
    const punkte = await page.$$eval('.aufgabe-bild [data-punkt]', (els) => els.map((e) => e.getAttribute('data-punkt')));
    expect(punkte).toEqual(['zweiter', 'leer']);
    // gold gehobene Blätter über Perle 1 und 3, über Perle 2 liegt das Blatt noch
    const zu = await page.$$eval('.zwilling-perle', (els) => els.map((e) => !!e.querySelector('.blatt')));
    expect(zu).toEqual([false, true, false]);
    // gespeichert wird danach Version 2
    await page.waitForTimeout(150);
    const version = await page.evaluate(
      () =>
        new Promise((ok) => {
          const req = indexedDB.open('denk-raupe', 1);
          req.onsuccess = () => {
            const g = req.result.transaction('kv').objectStore('kv').get('sitzung');
            g.onsuccess = () => (req.result.close(), ok((g.result as { version: number }).version));
          };
        }),
    );
    expect(version).toBe(2);
    await page.close();
  });

  it('Lernbeispiel vor jedem neuen Format: Schritte mit sofortiger Rückmeldung; danach bekannt; keine Perlen, Blätter, Historie', async () => {
    const { page, sitzung } = await oeffnen(390, 800, { formate: {} });
    for (let i = 0; i < sitzung.aufgaben.length; i++) {
      await page.click(`.perle[data-i="${i}"]`);
      expect(await page.textContent('.lern-titel')).toBe("So geht's");
      // von selbst gezeigt: kein Hilfeknopf, kein Weg vorbei, Vergleichen geht nicht
      expect(await page.$('.hilfe-knopf')).toBeNull();
      expect(await page.$('.los')).toBeNull();
      expect(await page.isDisabled('.vergleichen')).toBe(true);
      const f = FORMATE[sitzung.aufgaben[i].format];
      const schritte = lernbeispiel(f);
      expect(schritte.length).toBeGreaterThanOrEqual(2);
      for (let k = 0; k < schritte.length; k++) {
        const a = schritte[k];
        expect(await page.getAttribute('.lern', 'data-schritt')).toBe(String(k));
        expect(await page.innerHTML('.lern .aufgabe-bild')).not.toContain(HILFE2);
        // falsch: „Schau noch einmal.“, die Antwort kehrt zurück, Hilfe Stufe 2 auf dem Bild
        await lernTippen(page, a, lernFalsch(a));
        expect(await page.textContent('.lern .meldung')).toBe(KIND.nochmalSchauen);
        expect(await page.innerHTML('.lern .aufgabe-bild')).toContain(HILFE2);
        expect(await page.$$('.lern [aria-pressed="true"]')).toHaveLength(0);
        if (f.eingabe(a.bedingung).art === 'zahl') expect(await page.isDisabled('[data-ziffer="x"]')).toBe(true);
        // richtig: „Genau so!“, dann zum nächsten Schritt, nach dem letzten „Los geht's“
        await lernTippen(page, a, lernRichtig(a));
        expect(await page.textContent('.lern .meldung')).toBe(KIND.genau);
        if (k < schritte.length - 1) {
          expect(await page.$('.los')).toBeNull();
          await page.click('.lern-weiter');
        }
      }
      await page.click('.los');
      expect(await page.$('.lern')).toBeNull();
      expect(await page.textContent('.auftrag')).toBe(KIND.auftrag[f.auftrag]);
    }
    await page.waitForTimeout(150);
    // nichts davon im Satz: keine Antwort, kein Blatt gehoben, keine Historie, kein Blatt im Korb
    const s = await gespeichert<Sitzung>(page, 'sitzung');
    expect(s.satz.perlen.every((p) => p.antwort === null && p.blatt === 'zu')).toBe(true);
    expect(s.satz.runden).toBe(0);
    expect(s.lernbeispiel).toBeUndefined();
    expect(await gespeichert(page, 'historie')).toBeUndefined();
    expect(await page.$$eval('.zwilling-perle .blatt', (e) => e.length)).toBe(3);
    const p = await gespeichert<Profil>(page, 'profil');
    expect(p.formate).toEqual(Object.fromEntries(PROBE_FORMATE.map((id) => [id, 'bekannt'])));
    expect(p.blaetter).toBe(0);
    // einmal: nach Neuladen und vor jeder Aufgabe kein Lernbeispiel mehr
    await page.reload();
    await page.waitForSelector('.perle');
    for (let i = 0; i < 3; i++) {
      await page.click(`.perle[data-i="${i}"]`);
      expect(await page.$('.lern')).toBeNull();
    }
    await page.close();
  });

  it('Neuladen mitten im Lernbeispiel: derselbe Schritt, derselbe Stand', async () => {
    const { page, sitzung } = await oeffnen(390, 800, { formate: {} });
    const a0 = lernbeispiel(FORMATE[sitzung.aufgaben[0].format]);
    await lernTippen(page, a0[0], lernRichtig(a0[0]));
    await page.waitForTimeout(150);
    await page.reload();
    await page.waitForSelector('.lern');
    expect(await page.getAttribute('.lern', 'data-schritt')).toBe('0');
    expect(await page.textContent('.lern .meldung')).toBe(KIND.genau);
    await page.click('.lern-weiter');
    await lernTippen(page, a0[1], lernFalsch(a0[1]));
    await page.waitForTimeout(150);
    // Drehen (anderes Seitenverhältnis), dann Neuladen
    await page.setViewportSize({ width: 800, height: 390 });
    await page.reload();
    await page.waitForSelector('.lern');
    expect(await page.getAttribute('.lern', 'data-schritt')).toBe('1');
    expect(await page.textContent('.lern .meldung')).toBe(KIND.nochmalSchauen);
    expect(await page.innerHTML('.lern .aufgabe-bild')).toContain(HILFE2);
    // zu einer anderen Perle und zurück: das Lernbeispiel wartet beim selben Schritt
    await page.click('.perle[data-i="1"]');
    await page.click('.perle[data-i="0"]');
    expect(await page.getAttribute('.lern', 'data-schritt')).toBe('1');
    await page.close();
  });

  it("Zeichen „So geht's“: erst ab Hilfe Stufe 2, öffnet das Lernbeispiel, die Hilfestufe bleibt", async () => {
    const { page } = await oeffnen(390, 900);
    await page.click('.perle[data-i="1"]');
    expect(await page.$('.so-gehts')).toBeNull();
    // bekanntes Format: Hilfe Stufe 1 öffnet das Lernbeispiel auf Wunsch – „Los geht's“ führt jederzeit zurück
    await page.click('.hilfe-knopf');
    expect(await page.getAttribute('.lern', 'data-schritt')).toBe('0');
    expect(await page.isDisabled('.vergleichen')).toBe(true);
    await page.click('.los');
    expect(await page.$('.lern')).toBeNull();
    expect(await page.$('.so-gehts')).toBeNull();
    await page.click('.hilfe-knopf');
    expect(await page.isVisible('.so-gehts')).toBe(true);
    const box = (await page.locator('.so-gehts').boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(48);
    await page.waitForTimeout(150);
    const vorher = await gespeichert<Sitzung>(page, 'sitzung');
    expect(vorher.hilfeOffen[1]).toBe(2);
    await page.click('.so-gehts');
    expect(await page.getAttribute('.lern', 'data-schritt')).toBe('0');
    await page.waitForTimeout(150);
    const offen = await gespeichert<Sitzung>(page, 'sitzung');
    expect(offen.hilfeOffen).toEqual(vorher.hilfeOffen);
    expect(offen.aufgaben.map((a) => a.hilfe)).toEqual(vorher.aufgaben.map((a) => a.hilfe));
    await page.click('.los');
    await page.waitForTimeout(150);
    const nachher = await gespeichert<Sitzung>(page, 'sitzung');
    expect(nachher.hilfeOffen).toEqual(vorher.hilfeOffen);
    expect(nachher.lernbeispiel).toBeUndefined();
    expect(await page.isVisible('.so-gehts')).toBe(true);
    // das Profil bleibt: bekannt
    expect((await gespeichert<Profil>(page, 'profil')).formate[nachher.aufgaben[1].format]).toBe('bekannt');
    await page.close();
  });

  it('Hilfe: vor dem Vergleichen zwei Stufen, danach bis zur ähnlichen Aufgabe; „Später“ legt zurück', async () => {
    const { page, sitzung } = await oeffnen(390, 900);
    await page.click('.perle[data-i="1"]');
    // Stufe 1: das Lernbeispiel auf Wunsch; zurück bleibt nichts davon stehen – kein vorgerechnetes Beispiel,
    // noch kein Zeichen „So geht's“ (das kommt erst ab Stufe 2; A9, „Убрать попутно“)
    await page.click('.hilfe-knopf');
    expect(await page.textContent('.lern-titel')).toBe("So geht's");
    await page.click('.los');
    expect(await page.$('.hilfe-box')).toBeNull();
    expect(await page.$('.so-gehts')).toBeNull();
    expect(await page.innerHTML('.aufgabe')).not.toContain("So geht's");
    await page.click('.hilfe-knopf');
    expect(await page.isDisabled('.hilfe-knopf')).toBe(true);
    for (let i = 0; i < 3; i++) await eingeben(page, sitzung, i, i === 1 ? falsch(sitzung, i) : loesung(sitzung, i));
    await vergleichen(page);
    await page.waitForTimeout(1500);
    expect(await page.isDisabled('.hilfe-knopf')).toBe(false);
    await page.click('.hilfe-knopf');
    await page.click('.hilfe-knopf');
    expect(await page.textContent('.hilfe-box')).toContain('ähnlichen Aufgabe');
    await page.click('.spaeter');
    await page.waitForSelector('.ende');
    expect(await page.textContent('.ende')).toContain('wartet auf später');
    // das Blatt über der zurückgelegten Aufgabe bleibt liegen
    const zu = await page.$$eval('.zwilling-perle', (els) => els.map((e) => !!e.querySelector('.blatt')));
    expect(zu).toEqual([false, true, false]);
    // zurückgelegt → dieses Format bekommt das Lernbeispiel noch einmal (nochmal), die anderen nicht
    await page.waitForTimeout(150);
    const id = sitzung.aufgaben[1].format;
    const p = await gespeichert<Profil>(page, 'profil');
    expect(p.formate[id]).toBe('nochmal');
    expect(Object.values(p.formate).filter((k) => k === 'bekannt')).toHaveLength(2);
    await page.click('.neuer-satz');
    await page.waitForTimeout(150);
    const neu = await gespeichert<Sitzung>(page, 'sitzung');
    for (let i = 0; i < neu.aufgaben.length; i++) {
      await page.click(`.perle[data-i="${i}"]`);
      expect(!!(await page.$('.lern')), neu.aufgaben[i].format).toBe(neu.aufgaben[i].format === id);
    }
    // nach dem Lernbeispiel wieder bekannt
    const j = neu.aufgaben.findIndex((a) => a.format === id);
    await page.click(`.perle[data-i="${j}"]`);
    for (const [k, a] of lernbeispiel(FORMATE[id]).entries()) {
      if (k > 0) await page.click('.lern-weiter');
      await lernTippen(page, a, lernRichtig(a));
    }
    await page.click('.los');
    await page.waitForTimeout(150);
    expect((await gespeichert<Profil>(page, 'profil')).formate[id]).toBe('bekannt');
    await page.close();
  });

  it('zurückgelegte Aufgabe kommt im nächsten Satz wieder: dasselbe Bild, kein Zeichen; gelöst → gewöhnliches Blatt', async () => {
    const { page, sitzung } = await oeffnen(390, 900);
    const id = sitzung.aufgaben[1].format;
    /** Bild der Aufgabe und die Wahl darunter, wie das Kind sie sieht */
    const ansicht = async () => [await page.innerHTML('.aufgabe-bild'), (await page.$('.wahl')) ? await page.innerHTML('.wahl') : ''];
    await page.click('.perle[data-i="1"]');
    const vorher = await ansicht();
    for (let i = 0; i < 3; i++) await eingeben(page, sitzung, i, i === 1 ? falsch(sitzung, i) : loesung(sitzung, i));
    await vergleichen(page);
    await page.waitForTimeout(1500);
    // Hilfe bis zur ähnlichen Aufgabe (Stufe 1 öffnet das Lernbeispiel), dann „Später“
    while (!(await page.$('.spaeter'))) {
      await page.click('.hilfe-knopf');
      if (await page.$('.los')) await page.click('.los');
    }
    await page.click('.spaeter');
    await page.waitForSelector('.ende');
    await page.waitForTimeout(150);
    expect((await gespeichert<Profil>(page, 'profil')).zurueckgelegt).toHaveLength(1);
    // Neuladen auf dem Endbildschirm: die Reihe bleibt, nichts doppelt
    await page.reload();
    await page.waitForSelector('.ende');
    await page.waitForTimeout(150);
    const p1 = await gespeichert<Profil>(page, 'profil');
    expect(p1.zurueckgelegt).toHaveLength(1);
    expect(p1.blaetter).toBe(4);

    await page.click('.neuer-satz');
    await page.waitForTimeout(150);
    const neu = await gespeichert<Sitzung>(page, 'sitzung');
    const j = neu.aufgaben.findIndex((a) => a.format === id);
    expect(neu.aufgaben[j].bedingung).toEqual(sitzung.aufgaben[1].bedingung);
    expect(neu.aufgaben[j].wahl).toEqual(sitzung.aufgaben[1].wahl);
    expect(neu.aufgaben[j].samen).toBe(sitzung.aufgaben[1].samen);
    // Neuladen mitten im Satz: die zurückgekehrte Aufgabe bleibt
    await page.reload();
    await page.waitForSelector('.perle');
    expect((await gespeichert<Sitzung>(page, 'sitzung')).aufgaben[j]).toEqual(neu.aufgaben[j]);
    // vorher das Lernbeispiel (Format „nochmal“), dann die Aufgabe genau wie damals – ohne eigenes Zeichen
    await page.click(`.perle[data-i="${j}"]`);
    for (const [k, a] of lernbeispiel(FORMATE[id]).entries()) {
      if (k > 0) await page.click('.lern-weiter');
      await lernTippen(page, a, lernRichtig(a));
    }
    await page.click('.los');
    expect(await ansicht()).toEqual(vorher);
    expect(await page.$('.aufgabe .hinweis')).toBeNull();
    expect(await page.textContent('.hilfe-knopf')).toBe(KIND.hilfe);
    expect(await page.textContent('.meldung')).toBe('');

    for (let i = 0; i < 3; i++) await eingeben(page, neu, i, loesung(neu, i));
    await vergleichen(page);
    await page.waitForSelector('.ende');
    await page.waitForTimeout(150);
    // zwei goldene Blätter und ein gewöhnliches für die zurückgekehrte Aufgabe
    const korb = await page.$$eval('.korb [data-blatt]', (els) => els.map((e) => [e.getAttribute('data-blatt'), e.innerHTML.replace(/id="[^"]*"|url\(#[^)]*\)/g, '')]));
    expect(korb.map(([art]) => art)).toEqual(['gold', 'gold', 'normal']);
    // golden sieht anders aus als gewöhnlich (Farbe und Adern), zwei goldene gleich
    expect(korb[0][1]).toBe(korb[1][1]);
    expect(korb[2][1]).not.toBe(korb[0][1]);
    const s2 = await gespeichert<Sitzung>(page, 'sitzung');
    expect(s2.satz.perlen.map((p) => p.blatt)).toEqual(neu.aufgaben.map((_, i) => (i === j ? 'gehoben' : 'gold')));
    const p2 = await gespeichert<Profil>(page, 'profil');
    expect(p2.zurueckgelegt).toEqual([]);
    expect(p2.blaetter).toBe(4 + 5);
    const h = await gespeichert<{ eintraege: { ergebnis: string; zurueckAus?: unknown }[] }>(page, 'historie');
    expect(h.eintraege.map((e) => e.ergebnis)).toEqual(['gold', 'zurueck', 'gold', ...neu.aufgaben.map((_, i) => (i === j ? 'hilfe' : 'gold'))]);
    expect(h.eintraege[3 + j].zurueckAus).toEqual({ satz: 0, nr: 1 });
    // der Satz danach ist wieder ganz neu
    await page.click('.neuer-satz');
    await page.waitForTimeout(150);
    expect((await gespeichert<Sitzung>(page, 'sitzung')).zurueckAus).toBeUndefined();
    await page.close();
  });

  it('Historie: fertiger Satz kommt genau einmal hinein; neuer Satz und Neuladen löschen nichts', async () => {
    const { page, sitzung } = await oeffnen(390, 800);
    expect(await gespeichert(page, 'historie')).toBeUndefined();
    for (let i = 0; i < 3; i++) await eingeben(page, sitzung, i, i === 1 ? falsch(sitzung, i) : loesung(sitzung, i));
    await vergleichen(page);
    // nach dem ersten Vergleichen ist der Satz nicht fertig: noch nichts in der Historie
    expect(await gespeichert(page, 'historie')).toBeUndefined();
    await eingeben(page, sitzung, 1, loesung(sitzung, 1));
    await vergleichen(page);
    await page.waitForSelector('.ende');
    await page.waitForTimeout(150);
    type H = { version: number; eintraege: { ergebnis: string; samen: number; tag: string; falsch: Antwort[]; satz: number }[] };
    const h1 = await gespeichert<H>(page, 'historie');
    expect(h1.version).toBe(1);
    expect(h1.eintraege.map((e) => e.ergebnis)).toEqual(['gold', 'selbst', 'gold']);
    expect(h1.eintraege.map((e) => e.samen)).toEqual(sitzung.aufgaben.map((a) => a.samen));
    expect(h1.eintraege[1].falsch).toEqual([falsch(sitzung, 1)]);
    const heute = await page.evaluate(() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    expect(h1.eintraege.every((e) => e.tag === heute)).toBe(true);
    // Satz und Profil sind zusammen mit der Historie gespeichert: „gezählt“ steht schon
    expect((await gespeichert<Sitzung>(page, 'sitzung')).gezaehlt).toBe(true);
    // Neuladen auf dem Endbildschirm schreibt nichts doppelt
    await page.reload();
    await page.waitForSelector('.ende');
    await page.waitForTimeout(150);
    expect((await gespeichert<H>(page, 'historie')).eintraege).toHaveLength(3);
    // neuer Satz: Historie bleibt
    await page.click('.neuer-satz');
    await page.waitForTimeout(150);
    expect(await gespeichert<H>(page, 'historie')).toEqual(h1);
    expect((await gespeichert<Sitzung>(page, 'sitzung')).samen).not.toBe(sitzung.samen);
    await page.close();
  });

  it('unbekannte neuere Version: Satz, Profil und Historie bleiben unangetastet unter „…-unbekannt“', async () => {
    const satzNeu = { ...neueSitzung(SAMEN), version: 3, ausDerZukunft: true };
    const profilNeu = { ...neuesProfil(), version: 4, blaetter: 99 };
    const historieNeu = { version: 2, eintraege: [{ format: 'muster', ergebnis: 'gold' }] };
    const { page } = await oeffnen(390, 800, { gespeichert: { sitzung: satzNeu as unknown as Sitzung, profil: profilNeu }, weitere: { historie: historieNeu } });
    await page.waitForTimeout(200);
    expect(await gespeichert(page, 'sitzung-unbekannt')).toEqual([satzNeu]);
    expect(await gespeichert(page, 'profil-unbekannt')).toEqual([profilNeu]);
    expect(await gespeichert(page, 'historie-unbekannt')).toEqual([historieNeu]);
    // die App arbeitet mit neuen Daten weiter
    expect((await gespeichert<Sitzung>(page, 'sitzung')).version).toBe(2);
    expect((await gespeichert<{ version: number; blaetter: number }>(page, 'profil')).blaetter).toBe(0);
    expect(await page.$$eval('.raupe-zeile.kind .perle', (e) => e.length)).toBeGreaterThan(0);
    // Neuladen: die Kopien bleiben, nichts doppelt
    await page.reload();
    await page.waitForSelector('.perle');
    await page.waitForTimeout(150);
    expect(await gespeichert(page, 'sitzung-unbekannt')).toEqual([satzNeu]);
    expect(await gespeichert(page, 'profil-unbekannt')).toEqual([profilNeu]);
    await page.close();
  });
});

describe('Hilfeknopf gegen Durchprobieren (A6)', () => {
  /** k-te falsche Zahl der Mauer: Lösung + 1 + k */
  const falschK = (s: Sitzung, i: number, k: number): Antwort => {
    const l = loesung(s, i);
    return { art: 'zahl', wert: l.art === 'zahl' ? l.wert + 1 + k : 1 + k };
  };
  const pulst = async (page: Page) => (await page.getAttribute('.hilfe-knopf', 'data-puls')) === 'ja';
  type H = { eintraege: { puls?: boolean; hilfeNachPuls?: boolean; ergebnis: string }[] };
  type P = { marke: number; puls: boolean; hilfeNachPuls: boolean };

  it('erst nach zwei verschiedenen Fehlprüfungen; Wiederholung und Vergleichen ohne Änderung zählen nicht; Hilfe beendet es; Historie', async () => {
    const { page, sitzung } = await oeffnen(390, 900);
    const i = sitzung.aufgaben.findIndex((a) => a.format === 'zahlenmauer');
    // vor dem ersten Vergleichen: nie
    for (let j = 0; j < 3; j++) await eingeben(page, sitzung, j, j === i ? falschK(sitzung, i, 0) : loesung(sitzung, j));
    await page.click(`.perle[data-i="${i}"]`);
    expect(await pulst(page)).toBe(false);
    await vergleichen(page);
    // eine Fehlprüfung: nein
    expect(await page.getAttribute(`.perle[data-i="${i}"]`, 'aria-current')).toBe('step');
    expect(await pulst(page)).toBe(false);
    // nochmal Vergleichen ohne Änderung: nein
    await vergleichen(page);
    expect(await page.textContent('.meldung')).toBe(KIND.nichtsGeaendert);
    expect(await pulst(page)).toBe(false);
    // geändert und zurück zur selben Fehlantwort: nein
    await eingeben(page, sitzung, i, falschK(sitzung, i, 1));
    await eingeben(page, sitzung, i, falschK(sitzung, i, 0));
    await vergleichen(page);
    expect(await pulst(page)).toBe(false);
    // zweite, andere Fehlantwort: ja – die Hilfe öffnet sich nicht von selbst
    await eingeben(page, sitzung, i, falschK(sitzung, i, 1));
    await vergleichen(page);
    expect(await pulst(page)).toBe(true);
    expect(await page.$('.hilfe-box')).toBeNull();
    expect(await page.textContent('.hilfe-knopf')).toContain(KIND.hilfe);
    // Tippen zeichnet neu, der Puls bleibt
    await page.click('[data-ziffer="x"]');
    expect(await pulst(page)).toBe(true);
    await eingeben(page, sitzung, i, falschK(sitzung, i, 1));
    // nach Neuladen: derselbe Zustand
    await page.waitForTimeout(150);
    await page.reload();
    await page.waitForSelector('.hilfe-knopf');
    expect(await pulst(page)).toBe(true);
    expect((await gespeichert<Sitzung & { puls: P[] }>(page, 'sitzung')).puls[i]).toEqual({ marke: 0, puls: true, hilfeNachPuls: false });
    // Hilfe gedrückt: Stufe 1 (Lernbeispiel), zurück – kein Puls mehr
    await page.click('.hilfe-knopf');
    await page.click('.los');
    expect(await pulst(page)).toBe(false);
    await page.waitForTimeout(150);
    expect((await gespeichert<Sitzung & { puls: P[] }>(page, 'sitzung')).puls[i]).toEqual({ marke: 2, puls: true, hilfeNachPuls: true });
    // nach Neuladen weiter kein Puls
    await page.reload();
    await page.waitForSelector('.hilfe-knopf');
    expect(await pulst(page)).toBe(false);
    // gelöst → Historie: gepulst und danach Hilfe genommen; die anderen nicht
    await eingeben(page, sitzung, i, loesung(sitzung, i));
    await vergleichen(page);
    await page.waitForSelector('.ende');
    await page.waitForTimeout(150);
    const h = await gespeichert<H>(page, 'historie');
    expect(h.eintraege.map((e) => [e.puls, e.hilfeNachPuls])).toEqual([0, 1, 2].map((j) => (j === i ? [true, true] : [false, false])));
    expect(h.eintraege[i].ergebnis).toBe('selbst');
    await page.close();
  });

  it('gepulst, ohne Hilfe gelöst → Historie: Puls ja, Hilfe danach nein', async () => {
    const { page, sitzung } = await oeffnen(390, 900);
    const i = sitzung.aufgaben.findIndex((a) => a.format === 'zahlenmauer');
    for (let j = 0; j < 3; j++) await eingeben(page, sitzung, j, j === i ? falschK(sitzung, i, 0) : loesung(sitzung, j));
    await vergleichen(page);
    await eingeben(page, sitzung, i, falschK(sitzung, i, 1));
    await vergleichen(page);
    expect(await pulst(page)).toBe(true);
    await eingeben(page, sitzung, i, loesung(sitzung, i));
    await vergleichen(page);
    await page.waitForSelector('.ende');
    await page.waitForTimeout(150);
    const e = (await gespeichert<H>(page, 'historie')).eintraege[i];
    expect([e.puls, e.hilfeNachPuls]).toEqual([true, false]);
    await page.close();
  });

  it('alle Stufen offen: kein Puls, auch nach weiteren Fehlprüfungen', async () => {
    const { page, sitzung } = await oeffnen(390, 900);
    const i = sitzung.aufgaben.findIndex((a) => a.format === 'zahlenmauer');
    for (let j = 0; j < 3; j++) await eingeben(page, sitzung, j, j === i ? falschK(sitzung, i, 0) : loesung(sitzung, j));
    await vergleichen(page);
    await page.click('.hilfe-knopf');
    await page.click('.los');
    for (let k = 2; k <= 4; k++) await page.click('.hilfe-knopf');
    expect(await page.isDisabled('.hilfe-knopf')).toBe(true);
    for (const k of [1, 2, 3]) {
      await eingeben(page, sitzung, i, falschK(sitzung, i, k));
      await vergleichen(page);
    }
    expect(await pulst(page)).toBe(false);
    await page.close();
  });

  it('mit Bewegung: sanfter Puls um 1,7 s; „weniger Bewegung“: keine Animation, feste Doppelumrandung', async () => {
    const { page, sitzung } = await oeffnen(360, 800, { bewegung: true });
    const i = sitzung.aufgaben.findIndex((a) => a.format === 'zahlenmauer');
    for (let j = 0; j < 3; j++) await eingeben(page, sitzung, j, j === i ? falschK(sitzung, i, 0) : loesung(sitzung, j));
    await vergleichen(page);
    await eingeben(page, sitzung, i, falschK(sitzung, i, 1));
    await vergleichen(page);
    await page.waitForSelector('.hilfe-knopf[data-puls]');
    const stil = () =>
      page.$eval('.hilfe-knopf', (b) => {
        const c = getComputedStyle(b);
        return { name: c.animationName, dauer: c.animationDuration, wdh: c.animationIterationCount, schatten: c.boxShadow, hintergrund: c.backgroundColor };
      });
    const an = await stil();
    expect(an.name).toBe('hilfe-puls');
    expect(parseFloat(an.dauer)).toBeGreaterThanOrEqual(1.6);
    expect(parseFloat(an.dauer)).toBeLessThanOrEqual(1.8);
    expect(an.wdh).toBe('infinite');
    // auch beim größten Ausschlag kein waagerechtes Scrollen (Telefon 360 px)
    for (let t = 0; t < 4; t++) {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.waitForTimeout(450);
    }
    // Laterne
    expect(an.hintergrund).toBe('rgb(255, 233, 168)');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const aus = await stil();
    expect(aus.name).toBe('none');
    // fester Saum in Papier und Linie in Fokus-Blau (docs/STIL.md, Abschnitt 4)
    expect(aus.schatten).toContain('rgb(253, 251, 244)');
    expect(aus.schatten).toContain('rgb(43, 40, 159)');
    expect(aus.hintergrund).toBe('rgb(255, 233, 168)');
    // derselbe Zustand wie mit Bewegung
    expect(await pulst(page)).toBe(true);
    // ohne Puls: keine Umrandung, keine Animation – nur die Holzkante und der weiche Schatten der Laterne
    await page.click('.hilfe-knopf');
    await page.click('.los');
    const ruhig = await stil();
    expect(ruhig.name).toBe('none');
    expect(ruhig.schatten).not.toContain('rgb(43, 40, 159)');
    expect(ruhig.schatten).not.toContain('rgb(253, 251, 244)');
    await page.close();
  });
});

describe('Zahl in Plätzen (A5)', () => {
  it('Platz E, 4, Platz Z, 1 ergeben 14; eine Ziffer ersetzen; Löschen mit Wahl; Null in Z', async () => {
    const { sitzung, i } = satzMitMauer(2, 100);
    const { page } = await oeffnen(390, 800, { gespeichert: { sitzung, profil: bekanntesProfil() } });
    await page.click(`.perle[data-i="${i}"]`);
    expect((await plaetzeLesen(page)).map((p) => p.name)).toEqual(['Hunderter', 'Zehner', 'Einer']);
    await page.click('.platz[data-platz="2"]');
    expect((await plaetzeLesen(page)).map((p) => p.gewaehlt)).toEqual([false, false, true]);
    await page.click('[data-ziffer="4"]');
    // E belegt, Z leer → die Wahl geht auf Z
    expect(await plaetzeLesen(page)).toEqual([
      { name: 'Hunderter', inhalt: 'leer', gewaehlt: false },
      { name: 'Zehner', inhalt: 'leer', gewaehlt: true },
      { name: 'Einer', inhalt: '4', gewaehlt: false },
    ]);
    await page.click('.platz[data-platz="1"]');
    await page.click('[data-ziffer="1"]');
    expect(await inhalte(page)).toEqual(['leer', '1', '4']);
    expect(await perleText(page, i)).toContain(': 14');
    expect((await plaetzeLesen(page)).every((p) => !p.gewaehlt)).toBe(true);
    // eine Ziffer ersetzen: 14 → Platz Z, 2 → 24
    await page.click('.platz[data-platz="1"]');
    await page.click('[data-ziffer="2"]');
    expect(await perleText(page, i)).toContain(': 24');
    // Löschen mit Wahl: nur dieser Platz
    await page.click('.platz[data-platz="2"]');
    await page.click('[data-ziffer="x"]');
    expect(await inhalte(page)).toEqual(['leer', '2', 'leer']);
    expect(await perleText(page, i)).toContain('noch leer');
    await page.click('[data-ziffer="7"]');
    expect(await perleText(page, i)).toContain(': 27');
    // Null in Z bei belegtem E: einstellige Zahl
    await page.click('.platz[data-platz="1"]');
    await page.click('[data-ziffer="0"]');
    expect(await inhalte(page)).toEqual(['leer', 'leer', '7']);
    expect(await perleText(page, i)).toMatch(/: 7$/);
    await page.close();
  });

  it('bis 100: 1, 0, 0 ergibt 100; über 100 geht nicht; die dritte Ziffer beginnt neu', async () => {
    const { sitzung, i } = satzMitMauer(2, 100);
    const { page } = await oeffnen(390, 800, { gespeichert: { sitzung, profil: bekanntesProfil() } });
    await page.click(`.perle[data-i="${i}"]`);
    for (const d of '100') await page.click(`[data-ziffer="${d}"]`);
    expect(await inhalte(page)).toEqual(['1', '0', '0']);
    expect(await perleText(page, i)).toContain(': 100');
    for (const d of '234') await page.click(`[data-ziffer="${d}"]`);
    expect(await inhalte(page)).toEqual(['leer', 'leer', '4']);
    // H nimmt nur, was 100 nicht übersteigt
    await page.click('.platz[data-platz="0"]');
    await page.click('[data-ziffer="2"]');
    expect(await inhalte(page)).toEqual(['leer', 'leer', '4']);
    await page.close();

    // Standard-Satz (bis 20): zwei Plätze, die dritte Ziffer beginnt neu
    const s = await oeffnen(390, 800);
    const j = s.sitzung.aufgaben.findIndex((a) => a.format === 'zahlenmauer');
    await s.page.click(`.perle[data-i="${j}"]`);
    expect(await s.page.$$eval('.platz', (e) => e.length)).toBe(2);
    for (const d of '101') await s.page.click(`[data-ziffer="${d}"]`);
    expect(await inhalte(s.page)).toEqual(['leer', '1']);
    expect(await perleText(s.page, j)).toMatch(/: 1$/);
    await s.page.close();
  });

  it('harte Regel 7: Zahlenmauer Stufe 1 bis 20 (Mauer bis 10) nimmt jede Zahl 0–99, Feld immer gleich', async () => {
    const { sitzung, i } = satzMitMauer(1, 20);
    expect((sitzung.aufgaben[i].bedingung as Mauer).grenze).toBe(10);
    const { page } = await oeffnen(390, 800, { gespeichert: { sitzung, profil: bekanntesProfil() } });
    await page.click(`.perle[data-i="${i}"]`);
    expect((await plaetzeLesen(page)).map((p) => p.name)).toEqual(['Zehner', 'Einer']);
    for (const w of ['12', '19', '99', '57']) {
      for (const d of w) await page.click(`[data-ziffer="${d}"]`);
      expect(await perleText(page, i)).toMatch(new RegExp(`: ${w}$`));
      expect(await inhalte(page)).toEqual([...w]);
      // die nächste Zahl beginnt mit der dritten Ziffer neu
    }
    // auch über die Plätze: Platz Z, 9 → 97
    await page.click('.platz[data-platz="0"]');
    await page.click('[data-ziffer="9"]');
    expect(await perleText(page, i)).toMatch(/: 97$/);
    // eine andere Mauer (Stufe 3 bis 100) hat dieselben zwei Plätze bei „bis 20“
    const andere = satzMitMauer(3, 20);
    expect((andere.sitzung.aufgaben[andere.i].bedingung as Mauer).grenze).toBe(20);
    expect(FORMATE.zahlenmauer.eingabe(andere.sitzung.aufgaben[andere.i].bedingung as Mauer)).toEqual(FORMATE.zahlenmauer.eingabe(sitzung.aufgaben[i].bedingung as Mauer));
    await page.close();
  });

  it('nach Neuladen steht die Zahl wieder in den Plätzen, nichts gewählt', async () => {
    const { sitzung, i } = satzMitMauer(2, 100);
    const { page } = await oeffnen(390, 800, { gespeichert: { sitzung, profil: bekanntesProfil() } });
    await page.click(`.perle[data-i="${i}"]`);
    await page.click('[data-ziffer="1"]');
    await page.click('[data-ziffer="4"]');
    await page.click('.platz[data-platz="1"]');
    await page.waitForTimeout(150);
    await page.reload();
    await page.waitForSelector('.platz');
    expect(await plaetzeLesen(page)).toEqual([
      { name: 'Hunderter', inhalt: 'leer', gewaehlt: false },
      { name: 'Zehner', inhalt: '1', gewaehlt: false },
      { name: 'Einer', inhalt: '4', gewaehlt: false },
    ]);
    // weiter wie vorher: Platz Z, 2 → 24
    await page.click('.platz[data-platz="1"]');
    await page.click('[data-ziffer="2"]');
    expect(await perleText(page, i)).toContain(': 24');
    await page.close();
  });

  it('Lernbeispiel: Plätze auch dort; nach Neuladen steht die Zahl wieder darin', async () => {
    const { page, sitzung } = await oeffnen(390, 800, { formate: {} });
    const i = sitzung.aufgaben.findIndex((a) => a.format === 'zahlenmauer');
    await page.click(`.perle[data-i="${i}"]`);
    const a0 = lernbeispiel(FORMATE.zahlenmauer)[0];
    const l0 = lernRichtig(a0);
    if (l0.art !== 'zahl') throw new Error('Zahlenmauer ohne Zahl');
    expect((await plaetzeLesen(page, '.lern')).map((p) => p.name)).toEqual(['Zehner', 'Einer']);
    // erst Platz E wählen, dann die Ziffer
    await page.click('.lern .platz[data-platz="1"]');
    await page.click(`.lern [data-ziffer="${l0.wert}"]`);
    expect(await page.textContent('.lern .meldung')).toBe(KIND.genau);
    expect(await inhalte(page, '.lern')).toEqual(['leer', String(l0.wert)]);
    await page.waitForTimeout(150);
    await page.reload();
    await page.waitForSelector('.lern');
    expect(await inhalte(page, '.lern')).toEqual(['leer', String(l0.wert)]);
    expect(await page.textContent('.lern .meldung')).toBe(KIND.genau);
    // gelöst: Plätze und Ziffern gesperrt
    expect(await page.isDisabled('.lern .platz[data-platz="0"]')).toBe(true);
    await page.close();
  });

  it('die Plätze sehen bei richtiger und falscher Zahl gleich aus', async () => {
    const { page, sitzung } = await oeffnen(390, 800);
    const i = sitzung.aufgaben.findIndex((a) => a.format === 'zahlenmauer');
    const l = loesung(sitzung, i);
    const f = falsch(sitzung, i);
    if (l.art !== 'zahl' || f.art !== 'zahl') throw new Error('Zahlenmauer ohne Zahl');
    expect(String(l.wert)).toHaveLength(String(f.wert).length);
    const aussehen = () =>
      page.$$eval('.plaetze, .platz, .platz-zeichen, .nest', (els) =>
        els.map((e) => {
          const st = getComputedStyle(e);
          return [e.className, e.getAttribute('aria-pressed'), st.borderStyle, st.borderColor, st.boxShadow, st.backgroundColor, st.opacity, e.getBoundingClientRect().width].join('|');
        }),
      );
    await eingeben(page, sitzung, i, l);
    const richtig = await aussehen();
    await eingeben(page, sitzung, i, f);
    expect(await aussehen()).toEqual(richtig);
    await page.close();
  });

  it('Telefon 360 px, bis 100: drei Plätze über den Ziffern, alles ≥ 48 px, kein waagerechtes Scrollen', async () => {
    const { sitzung, i } = satzMitMauer(2, 100);
    const { page } = await oeffnen(360, 640, { gespeichert: { sitzung, profil: bekanntesProfil() } });
    await page.click(`.perle[data-i="${i}"]`);
    for (const d of '100') await page.click(`[data-ziffer="${d}"]`);
    await page.click('.platz[data-platz="1"]');
    const m = await page.evaluate(() => {
      const box = (e: Element) => e.getBoundingClientRect();
      return {
        scrollW: document.documentElement.scrollWidth,
        plaetze: [...document.querySelectorAll('.platz')].map(box),
        nester: [...document.querySelectorAll('.nest')].map(box),
        ziffern: [...document.querySelectorAll('[data-ziffer]')].map(box),
      };
    });
    expect(m.scrollW).toBeLessThanOrEqual(360);
    expect(m.plaetze).toHaveLength(3);
    for (const b of [...m.plaetze, ...m.nester, ...m.ziffern]) {
      expect(Math.min(b.width, b.height)).toBeGreaterThanOrEqual(48);
      expect(b.left).toBeGreaterThanOrEqual(0);
      expect(b.right).toBeLessThanOrEqual(360);
    }
    // Ziffernperlen in Zeilen, nicht untereinander: höchstens drei Reihen
    expect(new Set(m.ziffern.map((b) => Math.round(b.top))).size).toBeLessThanOrEqual(3);
    // Zehner links von den Einern, Plätze über den Ziffern
    expect(m.plaetze[0].x).toBeLessThan(m.plaetze[1].x);
    expect(m.plaetze[1].x).toBeLessThan(m.plaetze[2].x);
    expect(Math.max(...m.plaetze.map((b) => b.bottom))).toBeLessThanOrEqual(Math.min(...m.ziffern.map((b) => b.top)));
    await page.close();
  });
});

describe('Musterseite', () => {
  it('auf Deutsch und Ukrainisch ohne waagerechtes Scrollen (Telefon 360 px)', async () => {
    for (const sp of ['de', 'uk']) {
      const page = await browser.newPage({ viewport: { width: 360, height: 740 } });
      await page.goto(`${url}#/stil?sprache=${sp}`);
      await page.waitForSelector('h1');
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
      expect(await page.textContent('h1')).toBe(sp === 'de' ? 'Designsystem' : 'Дизайн-система');
      // Formate: jedes mit Bild ohne Hilfe, Hilfe 2 und 3 und den Texten für Eltern in der gewählten Sprache
      const formate = await page.$$eval('.format-probe', (els) => els.map((e) => ({ id: e.getAttribute('data-format'), bilder: e.querySelectorAll('svg').length, text: e.textContent })));
      expect(formate.map((f) => f.id).sort()).toEqual(Object.keys(FORMATE).sort());
      for (const f of formate) {
        expect(f.bilder).toBe(3);
        expect(f.text).toMatch(sp === 'de' ? /So helfen Sie/ : /Як допомогти/);
      }
      await page.close();
    }
  });
});

/**
 * docs/STIL.md, Abschnitt 14 (A9), im Browser: Tippflächen, kein waagerechtes Scrollen, keine dünnen Ränder und
 * keine dunklen Umrisse am Ast, keine alten Bilder; ohne Bewegung derselbe Zustand; beim Vergleichen zeigt kein
 * Bild, was unter einem Blatt liegt, das liegen bleibt.
 */
describe('Stil (A9)', () => {
  /** Prüfungen am gerade gezeigten Bildschirm */
  const pruefen = (page: Page) =>
    page.evaluate(() => {
      const fehler: string[] = [];
      const sichtbar = (e: Element) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden';
      };
      // Tippflächen ≥ 48 px: Knöpfe und die Fische im Bild (Kasten der ähnlichen Aufgabe ist nur Bild)
      for (const e of document.querySelectorAll('.satz button, .satz [data-wahl]')) {
        if (!sichtbar(e) || e.closest('.hilfe-box')) continue;
        const r = e.getBoundingClientRect();
        if (Math.min(r.width, r.height) < 47.5) fehler.push(`klein: ${typeof e.className === 'string' ? e.className : e.tagName} ${Math.round(r.width)}×${Math.round(r.height)}`);
      }
      // keine Ränder dünner als 2 px
      for (const e of document.querySelectorAll('.satz *')) {
        const c = getComputedStyle(e);
        for (const s of ['Top', 'Right', 'Bottom', 'Left'] as const) {
          const w = parseFloat(c[`border${s}Width`]);
          if (c[`border${s}Style`] !== 'none' && w > 0 && w < 2) fehler.push(`dünner Rand: ${String(e.className)}`);
        }
      }
      // keine alten Bilder, überhaupt kein Rasterbild auf dem Satz-Bildschirm (bis K1)
      for (const img of document.querySelectorAll('img')) fehler.push(`Bild: ${img.getAttribute('src')}`);
      // am Ast kein dunkler Strich an Figuren, Blättern, Korb und Marken (die Perle hat ihre fünf Schichten:
      // Trennring und Saum der Ziffer gehören dazu, Formen auf der Perle sind Figuren einer Aufgabe)
      const dunkel = (farbe: string) => {
        const m = farbe.match(/\d+(\.\d+)?/g);
        if (!m || farbe === 'none') return false;
        const [r, g, b] = m.slice(0, 3).map((v) => Number(v) / 255).map((s) => (s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4));
        return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.05;
      };
      for (const e of document.querySelectorAll('.ast-zone svg:not(.perle-svg) *, .werkzeug svg *')) {
        const c = getComputedStyle(e);
        if (c.stroke !== 'none' && dunkel(c.stroke)) fehler.push(`dunkler Strich am Ast: ${e.tagName}`);
      }
      return { fehler, scrollW: document.documentElement.scrollWidth };
    });

  for (const [name, w, h] of GERAETE) {
    it(`${name}: jede Aufgabe, nach dem Vergleichen und am Ende – Tippflächen, Ränder, Striche, Bilder`, async () => {
      const { page, sitzung } = await oeffnen(w, h);
      for (let i = 0; i < sitzung.aufgaben.length; i++) {
        await page.click(`.perle[data-i="${i}"]`);
        const p = await pruefen(page);
        expect(p.fehler, `Aufgabe ${i + 1}`).toEqual([]);
        expect(p.scrollW).toBeLessThanOrEqual(w);
      }
      for (let i = 0; i < 3; i++) await eingeben(page, sitzung, i, i === 1 ? falsch(sitzung, i) : loesung(sitzung, i));
      await vergleichen(page);
      const nach = await pruefen(page);
      expect(nach.fehler).toEqual([]);
      expect(nach.scrollW).toBeLessThanOrEqual(w);
      // das liegen gebliebene Blatt ist selbst eine Tippfläche zur Aufgabe
      expect(await page.$$eval('.zwilling-perle[data-i]', (e) => e.map((x) => x.getAttribute('data-i')))).toEqual(['1']);
      await eingeben(page, sitzung, 1, loesung(sitzung, 1));
      await vergleichen(page);
      await page.waitForSelector('.ende');
      const ende = await pruefen(page);
      expect(ende.fehler).toEqual([]);
      expect(ende.scrollW).toBeLessThanOrEqual(w);
      expect(await page.$$eval('.kachel', (e) => e.length)).toBe(3);
      await page.close();
    });
  }

  /** was das Kind sieht, ohne Klassen der Bewegung */
  const zustand = (page: Page) =>
    page.evaluate(() => ({
      blaetter: [...document.querySelectorAll('.zwilling .zwilling-perle')].map((e) => [!!e.querySelector('.blatt'), !!e.querySelector('.tipp-marke'), !!e.querySelector('.perle-svg')]),
      korb: [...document.querySelectorAll('.korb-schild')].map((e) => e.textContent),
      aktuell: document.querySelector('.perle[aria-current]')?.getAttribute('data-i') ?? null,
      meldung: document.querySelector('.meldung')?.textContent ?? null,
      hilfe: !!document.querySelector('.hilfe-knopf'),
      vergleichen: document.querySelector('.vergleichen')?.hasAttribute('disabled'),
      ende: !!document.querySelector('.ende'),
      inKorb: [...document.querySelectorAll('.korb [data-blatt]')].map((e) => e.getAttribute('data-blatt')),
      geheim: [...document.querySelectorAll('.geheim span')].map((e) => e.className.replace(/\s+/g, ' ').trim()),
      kacheln: [...document.querySelectorAll('.kachel')].map((e) => e.textContent),
      sichtbar: [...document.querySelectorAll('.zwilling .blatt')].map((e) => getComputedStyle(e).visibility),
    }));

  it('„weniger Bewegung“: nach Vergleichen und am Ende derselbe Zustand wie mit Bewegung', async () => {
    const ablauf = async (bewegung: boolean) => {
      const { page, sitzung } = await oeffnen(390, 900, { bewegung });
      for (let i = 0; i < 3; i++) await eingeben(page, sitzung, i, i === 1 ? falsch(sitzung, i) : loesung(sitzung, i));
      await vergleichen(page);
      const geprueft = await zustand(page);
      await eingeben(page, sitzung, 1, loesung(sitzung, 1));
      await vergleichen(page);
      await page.waitForSelector('.ende');
      await bewegungFertig(page);
      const fertig = await zustand(page);
      await page.close();
      return { geprueft, fertig };
    };
    const mit = await ablauf(true);
    const ohne = await ablauf(false);
    expect(ohne).toEqual(mit);
    // und der Zustand stimmt: nur über Perle 2 liegt das Blatt, mit Marke; 2 goldene Blätter zählen 4
    expect(ohne.geprueft.blaetter).toEqual([
      [false, false, true],
      [true, true, false],
      [false, false, true],
    ]);
    expect(ohne.geprueft.korb).toEqual(['4']);
    expect(ohne.fertig.inKorb).toEqual(['gold', 'gold', 'normal']);
  });

  it('Vergleichen mit Bewegung: kein Bild zeigt, was unter dem Blatt liegt, das liegen bleibt; gehobene zeigen die Perle', async () => {
    const { page, sitzung } = await oeffnen(390, 900, { bewegung: true });
    for (let i = 0; i < 3; i++) await eingeben(page, sitzung, i, i === 1 ? falsch(sitzung, i) : loesung(sitzung, i));
    // jedes Bild mitschreiben: bei jeder Änderung am Ast und in jedem Frame
    await page.evaluate(() => {
      const w = window as unknown as { bilder: string[][]; laeuft: boolean };
      w.bilder = [];
      w.laeuft = true;
      const nimm = () =>
        w.bilder.push([...document.querySelectorAll('.zwilling .zwilling-perle')].map((e) => (e.querySelector('.perle-svg') ? 'perle' : '') + (e.querySelector('.blatt') ? '+blatt' : '')));
      new MutationObserver(nimm).observe(document.querySelector('.buehne-platz')!, { subtree: true, childList: true, attributes: true });
      const frame = () => {
        nimm();
        if (w.laeuft) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
    await vergleichen(page);
    const bilder = await page.evaluate(() => {
      const w = window as unknown as { bilder: string[][]; laeuft: boolean };
      w.laeuft = false;
      return w.bilder;
    });
    expect(bilder.length).toBeGreaterThan(10);
    // Perle 2 (falsch) liegt in keinem Bild offen
    for (const b of bilder) expect(b[1]).not.toContain('perle');
    // Perle 1 und 3 lagen erst unter dem Blatt, am Ende sind sie offen
    expect(bilder.some((b) => b[0] === '+blatt' && b[2] === '+blatt')).toBe(true);
    expect(bilder.at(-1)).toEqual(['perle', '+blatt', 'perle']);
    await page.close();
  });

  it('Ende: drei Kacheln; Welt und Pause sind Zwischenseiten mit „Zurück“, ein neuer Satz startet nie von selbst', async () => {
    const { page, sitzung } = await oeffnen(390, 900);
    for (let i = 0; i < 3; i++) await eingeben(page, sitzung, i, loesung(sitzung, i));
    await vergleichen(page);
    await page.waitForSelector('.ende');
    expect(await page.$$eval('.kachel', (e) => e.map((x) => x.textContent))).toEqual([KIND.welt, KIND.neuerSatz, KIND.pause]);
    await page.waitForTimeout(150);
    const samen = (await gespeichert<Sitzung>(page, 'sitzung')).samen;
    await page.click('.kachel.welt');
    await page.waitForSelector('.platzhalter');
    expect(await page.textContent('.platzhalter-text')).toBe(KIND.weltBald);
    await page.click('.platzhalter .btn');
    await page.waitForSelector('.ende');
    await page.click('.kachel.pause');
    await page.waitForSelector('.platzhalter');
    expect(await page.textContent('.platzhalter-text')).toBe(KIND.bisBald);
    await page.click('.platzhalter .btn');
    await page.waitForSelector('.ende');
    // nichts davon hat einen neuen Satz begonnen
    expect((await gespeichert<Sitzung>(page, 'sitzung')).samen).toBe(samen);
    await page.close();
  });
});
