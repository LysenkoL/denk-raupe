import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';
import { createServer, type ViteDevServer } from 'vite';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { FORMATE } from '../src/aufgaben';
import { neueSitzung, neuesProfil, PROBE_FORMATE, type Sitzung } from '../src/satz/sitzung';
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

/** Seite mit festem Satz; `gesehen` = Lernbeispiele schon gezeigt; `gespeichert` = so liegt es schon im Speicher */
async function oeffnen(
  w: number,
  h: number,
  o: { gesehen?: boolean; samen?: number; gespeichert?: { sitzung: Sitzung; profil: unknown } } = {},
): Promise<{ page: Page; sitzung: Sitzung }> {
  const page = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
  const sitzung = o.gespeichert?.sitzung ?? neueSitzung(o.samen ?? SAMEN);
  const profil = o.gespeichert?.profil ?? { ...neuesProfil(), ton: false, gesehen: o.gesehen === false ? [] : PROBE_FORMATE };
  // Musterseite fasst den Speicher nicht an – sonst könnte die App beim ersten Laden einen eigenen Satz speichern
  await page.goto(url + '#/stil');
  await page.evaluate(
    ([s, p]) =>
      new Promise<void>((ok) => {
        const req = indexedDB.open('denk-raupe', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('kv');
        req.onsuccess = () => {
          const tx = req.result.transaction('kv', 'readwrite');
          tx.objectStore('kv').put(s, 'sitzung');
          tx.objectStore('kv').put(p, 'profil');
          tx.oncomplete = () => (req.result.close(), ok());
        };
      }),
    [sitzung, profil] as const,
  );
  await page.goto(url + '#/');
  await page.reload();
  await page.waitForSelector('.perle');
  await page.evaluate(() => document.fonts.ready);
  return { page, sitzung };
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

  it("Lernbeispiel vor einem neuen Format: falsche Wahl → „Schau noch einmal“, richtige → „Los geht's“", async () => {
    const { page, sitzung } = await oeffnen(390, 800, { gesehen: false });
    expect(await page.textContent('.lern-titel')).toBe("So geht's");
    const f = FORMATE[sitzung.aufgaben[0].format];
    const b = f.beispiele({} as never)[0];
    const art = f.eingabe(b).art;
    const richtig = f.loesungen(b)[0];
    const tippe = async (a: Antwort) => {
      if (art === 'zahl' && a.art === 'zahl') for (const d of String(a.wert)) await page.click(`[data-ziffer="${d}"]`);
      else {
        const { zufall } = await import('../src/core/zufall');
        const wahl = f.wahl!(b, zufall(1));
        const k = wahl.findIndex((w) => gleich(w, a));
        await page.click(art === 'wahl' ? `.wahl button[data-k="${k}"]` : `[data-wahl="${k}"]`);
      }
    };
    const anders: Antwort = richtig.art === 'zahl' ? { art: 'zahl', wert: richtig.wert === 1 ? 2 : 1 } : { art: 'form', form: 'stern', farbe: 'gelb' };
    if (art !== 'wahl' || anders.art === 'zahl') {
      await tippe(anders);
      expect(await page.textContent('.meldung')).toBe('Schau noch einmal.');
      if (art === 'zahl') await page.click('[data-ziffer="x"]');
    }
    await tippe(richtig);
    expect(await page.textContent('.meldung')).toBe('Genau so!');
    await page.click('.los');
    expect(await page.$('.lern')).toBeNull();
    expect(await page.textContent('.auftrag')).toBe(KIND.auftrag[f.auftrag]);
    await page.close();
  });

  it('Hilfe: vor dem Vergleichen zwei Stufen, danach bis zur ähnlichen Aufgabe; „Später“ legt zurück', async () => {
    const { page, sitzung } = await oeffnen(390, 900);
    await page.click('.perle[data-i="1"]');
    await page.click('.hilfe-knopf');
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
