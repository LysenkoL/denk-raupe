import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';
import { createServer, type ViteDevServer } from 'vite';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { FORMATE } from '../src/aufgaben';
import { lernbeispiel, type Aufgabe } from '../src/aufgaben/format';
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

/** Seite mit festem Satz; `formate` = Kenntnis im Profil (Standard: alle bekannt); `gespeichert` = so liegt es schon im Speicher */
async function oeffnen(
  w: number,
  h: number,
  o: { formate?: Profil['formate']; samen?: number; gespeichert?: { sitzung: Sitzung; profil: unknown }; weitere?: Record<string, unknown> } = {},
): Promise<{ page: Page; sitzung: Sitzung }> {
  const page = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
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
        };
      });
      expect(m.scrollW).toBeLessThanOrEqual(w);
      for (const p of m.kind) expect(Math.abs(p.y - m.kind[0].y)).toBeLessThan(1);
      m.kind.forEach((p, i) => expect(Math.abs(p.x - m.zw[i].x), `Perle ${i + 1}`).toBeLessThan(1));
      for (const p of m.kind) expect(p.h).toBeGreaterThanOrEqual(48);
      expect(m.kopfRechts).toBeLessThanOrEqual(m.buehneRechts + 1);
      for (const z of m.ziffern) expect(z).toBeGreaterThanOrEqual(44);
      const k = (await page.locator('.vergleichen').boundingBox())!;
      expect(k.height).toBeGreaterThanOrEqual(56);
      expect(k.y + k.height).toBeLessThanOrEqual(h + 1);
      await page.close();
    });
  });
}

describe('Ablauf eines Satzes', () => {
  it('Zahl mit Ziffernperlen: 1 dann 4 ergibt 14, Löschen nimmt die letzte Ziffer', async () => {
    const { page, sitzung } = await oeffnen(390, 800);
    const i = sitzung.aufgaben.findIndex((a) => a.format === 'zahlenmauer');
    await page.click(`.perle[data-i="${i}"]`);
    await page.click('[data-ziffer="1"]');
    await page.click('[data-ziffer="4"]');
    expect(await page.getAttribute(`.perle[data-i="${i}"]`, 'aria-label')).toContain(': 14');
    await page.click('[data-ziffer="x"]');
    expect(await page.getAttribute(`.perle[data-i="${i}"]`, 'aria-label')).toContain(': 1');
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
    const profilNeu = { ...neuesProfil(), version: 3, blaetter: 99 };
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
