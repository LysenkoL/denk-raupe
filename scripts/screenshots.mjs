// Screenshots des Satz-Bildschirms und der Musterseite auf Telefon und Tablet.
// Aufruf: npm run build && npm run screenshots  → Ordner screenshots/ (nicht im Repo)
import { chromium } from 'playwright';
import { preview } from 'vite';
import { mkdirSync } from 'node:fs';

const GERAETE = [
  ['telefon-hoch', 360, 740],
  ['telefon-quer', 740, 360],
  ['tablet-hoch', 800, 1280],
  ['tablet-quer', 1280, 800],
];

mkdirSync('screenshots', { recursive: true });
const server = await preview({ preview: { port: 0, host: '127.0.0.1' }, logLevel: 'silent' });
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch();

async function satz(page, zustand) {
  await page.goto(`${url}#/`);
  await page.reload();
  await page.evaluate(() => document.fonts.ready);
  // Lösungen der Platzhalter-Aufgaben: 7, 14, Dreieck, C, die, Haus
  const wahl = [2, 2, 1, 0, 1, 0];
  const n = zustand === 'teil' ? 3 : 6;
  for (let i = 0; i < n; i++) {
    await page.click(`.perle[data-i="${i}"]`);
    const k = zustand !== 'teil' && i === 1 ? 0 : wahl[i]; // Aufgabe 2 absichtlich anders
    await page.click(`.wahl button[data-k="${k}"]`);
  }
  if (zustand === 'teil') return;
  if (zustand === 'voll') return;
  await page.click('.vergleichen');
  await page.waitForTimeout(3500);
  if (zustand === 'geprueft') return;
  await page.click('.perle[data-i="1"]');
  await page.click('.wahl button[data-k="2"]');
  await page.click('.vergleichen');
  await page.waitForTimeout(1500);
}

for (const [name, w, h] of GERAETE) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true });
  for (const z of ['teil', 'voll', 'geprueft', 'fertig']) {
    await satz(page, z);
    await page.screenshot({ path: `screenshots/${name}-${z}.png` });
  }
  await page.close();
}
const page = await browser.newPage({ viewport: { width: 980, height: 900 }, deviceScaleFactor: 1 });
for (const sp of ['de', 'uk']) {
  await page.goto(`${url}#/stil?sprache=${sp}`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `screenshots/stil-${sp}.png`, fullPage: true });
}
await browser.close();
await server.close();
console.log('screenshots/ fertig');
