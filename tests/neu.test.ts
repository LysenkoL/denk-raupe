import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';
import { createServer, type ViteDevServer } from 'vite';
import { resolve } from 'node:path';

/**
 * Neuer Satzbildschirm nach Probe 7c (#/neu) im echten Browser: Fenster der Aufgabe, Lade und Blatt bleiben
 * in allen Aufgaben gleich groß und an derselben Stelle; nur die Perle schickt die Antwort; nichts scrollt;
 * der Zwilling erscheint erst beim Vergleichen; „Zurück“ fragt zuerst.
 */
const GERAETE: [number, number][] = [[360, 640], [412, 800], [640, 360], [800, 1280], [1280, 800]];

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

async function oeffnen(w: number, h: number): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
  await page.goto(url + '#/neu');
  await page.waitForSelector('.nz-brett');
  return page;
}
/** Lage von Fenster, Lade und Blatt (gerundet) */
const lage = (page: Page) => page.evaluate(() => ['.nz-brett', '.nz-werkzeug', '.nz-schale'].map((s) => {
  const r = document.querySelector(s)!.getBoundingClientRect();
  return [r.left, r.top, r.width, r.height].map(Math.round).join(',');
}).join(' | '));
const scrollt = (page: Page) => page.evaluate(() => document.documentElement.scrollHeight > innerHeight + 1 || document.documentElement.scrollWidth > innerWidth + 1);
/** irgendeine Antwort geben: Zahl, Wahl oder Tipp ins Bild */
async function antworten(page: Page): Promise<void> {
  if (await page.$('.nz-tasten')) await page.click('[data-ziffer="7"]');
  else if (await page.$('.nz-option')) await page.click('.nz-option >> nth=0');
  else await page.click('#nz-bild [data-wahl] >> nth=0', { force: true });
}

describe('#/neu', () => {
  for (const [w, h] of GERAETE) {
    it(`${w}×${h}: feste Fenster, kein Scrollen, ganzer Satz bis zum Vergleich`, async () => {
      const page = await oeffnen(w, h);
      const n = await page.locator('#nz-reihe .nz-slot').count();
      expect(n).toBe(6);
      const erste = await lage(page);
      for (let k = 0; k < n; k++) {
        expect(await lage(page)).toBe(erste);
        expect(await scrollt(page)).toBe(false);
        await antworten(page);
        // nur die Perle schickt: das Nest bleibt leer, bis die Perle getippt wird
        expect(await page.locator(`[data-slot="${k}"] .nz-perle`).count()).toBe(0);
        await page.click('[data-abgabe]');
        // 0,3 s nach dem Wechsel nimmt der Tisch keine Tipps an (STIL: Glätten 0,3 s)
        await page.waitForTimeout(400);
        expect(await page.locator(`[data-slot="${k}"] .nz-perle`).count()).toBe(1);
      }
      // beim Lösen kein Zwilling; beim Vergleichen kriecht er auf seinen Ast
      expect(await page.locator('.nz-zwilling').count()).toBe(0);
      await page.click('[data-vergleichen]');
      expect(await page.locator('.nz-zwilling').count()).toBe(1);
      expect(await scrollt(page)).toBe(false);
      await page.close();
    });
  }

  it('leere Perle schickt nichts; „Zurück“ fragt zuerst', async () => {
    const page = await oeffnen(412, 800);
    await page.click('[data-abgabe]');
    expect(await page.locator('[data-slot="0"] .nz-perle').count()).toBe(0);
    await page.click('[data-zurueck]');
    await expect(page.locator('.nz-dialog p').textContent()).resolves.toBe('Wirklich aufhören?');
    await page.click('[data-schliessen]');
    expect(await page.locator('.nz-dialog').count()).toBe(0);
    await page.close();
  });

  it('Zurück zu einer beantworteten Zahl: die erste Ziffer ersetzt die alte Zahl', async () => {
    const page = await oeffnen(412, 800);
    // eine Zahlaufgabe suchen
    for (let k = 0; k < 6 && !(await page.$('.nz-tasten')); k++) { await antworten(page); await page.click('[data-abgabe]'); await page.waitForTimeout(400); }
    const nr = await page.locator('.nz-slot.aktuell').getAttribute('data-slot');
    await page.click('[data-ziffer="1"]'); await page.click('[data-ziffer="4"]');
    await page.click('[data-abgabe]'); await page.waitForTimeout(400);
    await page.click(`[data-slot="${nr}"]`, { force: true });
    await page.waitForTimeout(400);
    await expect(page.locator('.nz-abgabe.markiert').count()).resolves.toBe(1);
    await page.click('[data-ziffer="9"]');
    await expect(page.locator('.nz-abgabe').getAttribute('class')).resolves.not.toContain('markiert');
    await page.click('[data-abgabe]'); await page.waitForTimeout(150);
    await expect(page.locator(`[data-slot="${nr}"] .nz-perle`).getAttribute('aria-hidden')).resolves.toBe('true');
    const text = await page.locator(`[data-slot="${nr}"] .nz-perle text`).textContent();
    expect(text).toBe('9');
    await page.close();
  });
});
