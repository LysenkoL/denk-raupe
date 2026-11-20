import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';
import { createServer, type ViteDevServer } from 'vite';
import { resolve } from 'node:path';

/**
 * Neuer Satzbildschirm nach Probe 7c (#/neu) im echten Browser: Fenster der Aufgabe, Lade und Blatt bleiben
 * in allen Aufgaben gleich groß und an derselben Stelle; nur die Perle schickt die Antwort; nichts scrollt;
 * der Zwilling erscheint erst beim Vergleichen; „Zurück“ fragt zuerst.
 * Облик 20.11.2026: голова гусеницы на одном месте во всех фазах; «Zurück» и «Menü» не заходят на лоток и лист.
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
/** Kopf der Raupe des Kindes: Lage und Größe (gerundet) */
const kopf = (page: Page) => page.evaluate(() => {
  const r = document.querySelector('#nz-reihe .nz-kopf')!.getBoundingClientRect();
  return [r.left, r.top, r.width, r.height].map(Math.round).join(',');
});
/** überlappen sich zwei Rechtecke? */
const ueber = (page: Page, a: string, b: string) => page.evaluate(([a, b]) => {
  const p = document.querySelector(a)?.getBoundingClientRect(), q = document.querySelector(b)?.getBoundingClientRect();
  if (!p || !q) return false;
  return p.left < q.right && q.left < p.right && p.top < q.bottom && q.top < p.bottom;
}, [a, b]);
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
      const raupe = await kopf(page);
      for (let k = 0; k < n; k++) {
        expect(await lage(page)).toBe(erste);
        expect(await kopf(page)).toBe(raupe);
        expect(await scrollt(page)).toBe(false);
        // die Knöpfe unten (hochkant) liegen neben Lade und Blatt, nie darauf
        for (const k2 of ['[data-zurueck]', '[data-menue]']) for (const z of ['.nz-werkzeug', '.nz-schale']) expect(await ueber(page, k2, z)).toBe(false);
        await antworten(page);
        // nur die Perle schickt: das Nest bleibt leer, bis die Perle getippt wird
        expect(await page.locator(`[data-slot="${k}"] .nz-perle`).count()).toBe(0);
        await page.click('[data-abgabe]');
        // 0,3 s nach dem Wechsel nimmt der Tisch keine Tipps an (STIL: Glätten 0,3 s)
        await page.waitForTimeout(400);
        expect(await page.locator(`[data-slot="${k}"] .nz-perle`).count()).toBe(1);
      }
      // beim Lösen kein Zwilling; beim Vergleichen kriecht er auf seinen Ast
      expect(await page.locator('.nz-zwilling:not([hidden])').count()).toBe(0);
      expect(await kopf(page)).toBe(raupe);
      await page.click('[data-vergleichen]');
      expect(await page.locator('.nz-zwilling:not([hidden])').count()).toBe(1);
      // die Raupe des Kindes bleibt beim Vergleichen, wo sie war – auch wenn danach der Korb erscheint; der Zwilling liegt darunter, gleich breit
      await page.waitForTimeout(700);
      expect(await kopf(page)).toBe(raupe);
      const [r, z] = await page.evaluate(() => ['#nz-reihe', '#nz-zwilling'].map((s) => { const b = document.querySelector(s)!.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.width), Math.round(b.top)]; }));
      expect(z[0]).toBe(r[0]); expect(z[1]).toBe(r[1]); expect(z[2]).toBeGreaterThan(r[2]);
      expect(await scrollt(page)).toBe(false);
      await page.close();
    });
  }

  it('Knöpfe ohne Unterschrift, aber mit Namen; nur „Hilfe“ ist beschriftet', async () => {
    const page = await oeffnen(390, 844);
    expect(await page.locator('[data-zurueck] .nz-name, [data-menue] .nz-name').count()).toBe(0);
    expect(await page.getAttribute('[data-zurueck]', 'aria-label')).toBe('Zurück');
    expect(await page.getAttribute('[data-menue]', 'aria-label')).toBe('Menü');
    expect(await page.locator('.nz-laterne .nz-name').textContent()).toBe('Hilfe');
    // hochkant liegen die Knöpfe unten
    const [knopf, h] = await page.evaluate(() => [document.querySelector('[data-zurueck]')!.getBoundingClientRect().bottom, innerHeight]);
    expect(knopf).toBeGreaterThan(h * 0.85);
    await page.close();
  });

  it('der Ast endet an der letzten Perle; der Zwilling-Knopf liegt auf dem Brett, nicht in der Reihe', async () => {
    const page = await oeffnen(390, 844);
    const [ast, perle] = await page.evaluate(() => {
      const r = document.querySelector('#nz-reihe')!, a = getComputedStyle(r, '::before');
      const letzte = [...r.querySelectorAll('.nz-slot')].pop()!.getBoundingClientRect();
      return [r.getBoundingClientRect().right - parseFloat(a.right), letzte.right];
    });
    expect(ast).toBeLessThanOrEqual(perle);
    for (let k = 0; k < 6; k++) { await antworten(page); await page.click('[data-abgabe]'); await page.waitForTimeout(400); }
    await page.click('[data-slot="0"]', { force: true }); await page.waitForTimeout(400);
    expect(await page.locator('#nz-reihe .nz-ueberblick').count()).toBe(0);
    expect(await page.locator('.nz-brett .nz-ueberblick').textContent()).toBe('Vergleichen');
    // ein Tipp genügt: es wird sofort verglichen, ohne zweite Karte „Vergleichen“
    await page.click('[data-ueberblick]');
    expect(await page.locator('[data-vergleichen]').count()).toBe(0);
    expect(await page.locator('.nz-zwilling:not([hidden])').count()).toBe(1);
    await page.close();
  });

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
