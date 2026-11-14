import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';
import { createServer, type ViteDevServer } from 'vite';
import { resolve } from 'node:path';

/**
 * Satz-Bildschirm im echten Browser: Telefon 360 px hoch und quer, Tablet hoch und quer.
 * Adaptives Layout, keine getrennten Layouts je Gerät (docs/TZ.md).
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

async function oeffnen(w: number, h: number, hash = '#/'): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
  await page.goto(url + hash);
  await page.waitForSelector('.perle');
  await page.evaluate(() => document.fonts.ready);
  return page;
}

/** füllt alle sechs Perlen; Aufgabe 2 absichtlich anders als die Lösung, Aufgabe 6 mit dem Wort */
async function fuellen(page: Page): Promise<void> {
  const wahl = [2, 0, 1, 0, 1, 0];
  for (let i = 0; i < 6; i++) {
    await page.click(`.perle[data-i="${i}"]`);
    await page.click(`.wahl button[data-k="${wahl[i]}"]`);
  }
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
}

for (const [name, w, h] of GERAETE) {
  describe(`Satz-Bildschirm: ${name} (${w}×${h})`, () => {
    it('kein waagerechtes Scrollen, Raupe und Zwilling in einer Zeile, Perlen groß genug', async () => {
      const page = await oeffnen(w, h);
      await fuellen(page);
      const m = await page.evaluate(() => {
        const box = (el: Element) => el.getBoundingClientRect();
        const kind = [...document.querySelectorAll('.raupe-zeile.kind .perle')].map(box);
        const zw = [...document.querySelectorAll('.raupe-zeile.zwilling .zwilling-perle')].map(box);
        const koepfe = [...document.querySelectorAll('.kopf')].map(box);
        const buehne = box(document.querySelector('.buehne-wrap')!);
        return {
          scrollW: document.documentElement.scrollWidth,
          kind: kind.map((r) => ({ x: r.x + r.width / 2, y: r.y, w: r.width, h: r.height, r: r.right })),
          zw: zw.map((r) => ({ x: r.x + r.width / 2, y: r.y })),
          kopfRechts: Math.max(...koepfe.map((r) => r.right)),
          buehneRechts: buehne.right,
        };
      });
      expect(m.scrollW).toBeLessThanOrEqual(w);
      expect(m.kind).toHaveLength(6);
      // eine Zeile: alle Perlen auf gleicher Höhe
      for (const p of m.kind) expect(Math.abs(p.y - m.kind[0].y)).toBeLessThan(1);
      // Zwilling genau unter der Raupe
      m.kind.forEach((p, i) => expect(Math.abs(p.x - m.zw[i].x), `Perle ${i + 1}`).toBeLessThan(1));
      // Tippfläche: mindestens 48 px hoch
      for (const p of m.kind) expect(p.h).toBeGreaterThanOrEqual(48);
      // Kopf bleibt in der Bühne
      expect(m.kopfRechts).toBeLessThanOrEqual(m.buehneRechts + 1);
      await page.close();
    });

    it('„Vergleichen“ ist sichtbar, mindestens 56 px hoch und erst bei voller Raupe aktiv', async () => {
      const page = await oeffnen(w, h);
      const knopf = page.locator('.vergleichen');
      await expect(knopf.isDisabled()).resolves.toBe(true);
      await fuellen(page);
      await expect(knopf.isDisabled()).resolves.toBe(false);
      const r = (await knopf.boundingBox())!;
      expect(r.height).toBeGreaterThanOrEqual(56);
      expect(r.y + r.height).toBeLessThanOrEqual(h + 1);
      await page.close();
    });

    it('nach dem Vergleichen: Blatt bleibt nur über der anderen Antwort, Lösung nirgends sichtbar', async () => {
      const page = await oeffnen(w, h);
      await fuellen(page);
      await page.click('.vergleichen');
      await page.waitForFunction(() => !document.querySelector('.vergleichen')!.hasAttribute('disabled') || document.querySelector('.ende'));
      await page.waitForTimeout(300);
      const zu = await page.$$eval('.zwilling-perle', (els) => els.map((e) => !!e.querySelector('.blatt')));
      expect(zu).toEqual([false, true, false, false, false, false]);
      // unter dem liegen gebliebenen Blatt liegt keine Perle mit der Lösung 14
      const unter = await page.$eval('.zwilling-perle:nth-child(2)', (e) => e.textContent);
      expect(unter).not.toContain('14');
      await page.close();
    });
  });
}

describe('Musterseite', () => {
  it('auf Deutsch und Ukrainisch ohne waagerechtes Scrollen (Telefon 360 px)', async () => {
    for (const sp of ['de', 'uk']) {
      const page = await oeffnen(360, 740, `#/stil?sprache=${sp}`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
      expect(await page.textContent('h1')).toBe(sp === 'de' ? 'Designsystem' : 'Дизайн-система');
      await page.close();
    }
  });
});
