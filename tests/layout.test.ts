import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';
import { createServer, type ViteDevServer } from 'vite';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { FORMATE } from '../src/aufgaben';
import { aufgabeAus, lernbeispiel, type Aufgabe, type Zahlenraum } from '../src/aufgaben/format';
import type { Mauer } from '../src/aufgaben/zahlenmauer';
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
  // abgebrochene Animationen (Bildschirm neu gezeichnet) zählen als fertig
  await page.evaluate(() => Promise.all(document.getAnimations().map((x) => x.finished.catch(() => null))));
}

/** Hilfe Stufe 2 auf dem Bild: warme Füllung des hervorgehobenen Teils (in allen drei Formaten) */
const HILFE2 = '#FFF3B0';
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
  await page.waitForFunction(() => document.querySelector('.ende') || !document.querySelector('.vergleichen')!.hasAttribute('disabled') || document.querySelector('.meldung')?.textContent);
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
        const koepfe = [...document.querySelectorAll('.kopf')].map(box);
        return {
          scrollW: document.documentElement.scrollWidth,
          kind: kind.map((r) => ({ x: r.x + r.width / 2, y: r.y, h: r.height })),
          zw: zw.map((r) => ({ x: r.x + r.width / 2 })),
          kopfRechts: Math.max(...koepfe.map((r) => r.right)),
          buehneRechts: box(document.querySelector('.buehne-wrap')!).right,
          ziffern: [...document.querySelectorAll('[data-ziffer]')].map((e) => box(e).height),
          plaetze: [...document.querySelectorAll('.platz, .nest')].map((e) => ({ w: box(e).width, h: box(e).height })),
        };
      });
      expect(m.scrollW).toBeLessThanOrEqual(w);
      for (const p of m.kind) expect(Math.abs(p.y - m.kind[0].y)).toBeLessThan(1);
      m.kind.forEach((p, i) => expect(Math.abs(p.x - m.zw[i].x), `Perle ${i + 1}`).toBeLessThan(1));
      for (const p of m.kind) expect(p.h).toBeGreaterThanOrEqual(48);
      expect(m.kopfRechts).toBeLessThanOrEqual(m.buehneRechts + 1);
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
    expect(steine).toContain('? + 1 = 2');
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
    // Stufe 1: das Lernbeispiel auf Wunsch; zurück steht sein letzter Schritt vorgerechnet in der Hilfe
    await page.click('.hilfe-knopf');
    expect(await page.textContent('.lern-titel')).toBe("So geht's");
    await page.click('.los');
    expect(await page.textContent('.hilfe-box')).toContain("So geht's");
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
    // ohne Puls: keine Umrandung, keine Animation
    await page.click('.hilfe-knopf');
    await page.click('.los');
    const ruhig = await stil();
    expect(ruhig.name).toBe('none');
    expect(ruhig.schatten).toBe('none');
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
      await page.close();
    }
  });
});
