import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { createServer, type ViteDevServer } from 'vite';
import { resolve } from 'node:path';
import { FORMATE } from '../src/aufgaben';
import { aufgabeAus, stimmt, type Aufgabe, type FormatId, type HilfeStufe, type Zahlenraum } from '../src/aufgaben/format';
import { setzeAntwort, vergleiche } from '../src/satz/vergleich';
import { neueSitzung, neuesProfil, type Sitzung } from '../src/satz/sitzung';
import { gleich, type Antwort } from '../src/perlen/antwort';

/**
 * Gruppe Г1б im echten Browser (docs/FORMATE.md, Abschnitt 4: 360 px und Tablet in beiden Lagen). Die Formate
 * stehen noch in keinem Satz: die erste Aufgabe des festen Satzes wird durch eine Aufgabe des Formats ersetzt.
 */
const G1B: FormatId[] = ['bild-gleichungen', 'malaufgaben', 'hunderterfeld', 'zahlenstrahl', 'entdeckerpaeckchen', 'rechenstrich'];
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

/** fester Satz, erste Aufgabe aus Format `id`; `hilfe` > 0: nach einem Vergleichen mit falschen Antworten, Hilfe offen */
function satz(id: FormatId, stufe: number, zahlenraum: Zahlenraum, hilfe: HilfeStufe): Sitzung {
  const s = neueSitzung(20261115);
  const aufgaben = s.aufgaben.map((a, j) => (j === 0 ? aufgabeAus(FORMATE[id], 11, stufe, { zahlenraum }) : a));
  if (!hilfe) return { ...s, aufgaben, aktuell: 0 };
  const daneben = (a: Aufgabe): Antwort => {
    const l = FORMATE[a.format].loesungen(a.bedingung)[0];
    return a.wahl ? a.wahl.find((w) => !gleich(w, l))! : { art: 'zahl', wert: l.art === 'zahl' ? (l.wert + 1) % 100 : 1 };
  };
  const voll = aufgaben.reduce((st, a, j) => setzeAntwort(st, j, daneben(a)), s.satz);
  const geprueft = vergleiche(voll, (j, antwort) => stimmt(FORMATE[aufgaben[j].format], aufgaben[j], antwort)).satz;
  return { ...s, aufgaben, satz: setzeAntwort(geprueft, 0, null), aktuell: 0, hilfeOffen: aufgaben.map((_, j) => (j === 0 ? hilfe : 0)) };
}

async function oeffnen(w: number, h: number, s: Sitzung) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
  const profil = { ...neuesProfil(), ton: false, formate: Object.fromEntries(Object.keys(FORMATE).map((id) => [id, 'bekannt'])) };
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
    [s, profil] as const,
  );
  await page.goto(url + '#/');
  await page.reload();
  await page.waitForSelector('.aufgabe-bild svg');
  await page.evaluate(() => document.fonts.ready);
  return page;
}

/** Maße des eigenen Bildes: Rand, Zahlen, Teile der Hilfe, Schritt; Kasten der ähnlichen Aufgabe */
const messen = (page: import('playwright').Page) =>
  page.evaluate(() => {
    const box = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height };
    };
    const eigen = document.querySelector('.feld > .aufgabe-bild svg')!;
    const kasten = document.querySelector('.hilfe-box svg');
    return {
      scrollW: document.documentElement.scrollWidth,
      eigen: box(eigen),
      zahlen: [...eigen.querySelectorAll('text')].filter((t) => /\d|\?/.test(t.textContent ?? '')).map((t) => box(t).h),
      teil: [...eigen.querySelectorAll('[data-hilfe="teil"]')].map(box),
      schritt: [...eigen.querySelectorAll('[data-hilfe="schritt"]')].map(box),
      kasten: kasten ? box(kasten) : null,
      schrittKasten: kasten ? kasten.querySelectorAll('[data-hilfe="schritt"]').length : 0,
      knoepfe: [...document.querySelectorAll('.satz button')].filter((b) => b.getBoundingClientRect().width > 0).map((b) => Math.min(b.getBoundingClientRect().width, b.getBoundingClientRect().height)),
    };
  });

for (const [name, w, h] of GERAETE) {
  describe(`Г1б auf dem Bildschirm: ${name} (${w}×${h})`, () => {
    it.each(G1B)('%s: Bild ganz zu sehen, Zahlen lesbar, Knöpfe groß genug; Zahl des Kindes im Nest', async (id) => {
      for (const [stufe, zr] of [[1, 20], [3, 100]] as const) {
        const page = await oeffnen(w, h, satz(id, stufe, zr, 0));
        const m = await messen(page);
        expect(m.scrollW, `${id} Stufe ${stufe}`).toBeLessThanOrEqual(w);
        expect(m.eigen.l).toBeGreaterThanOrEqual(0);
        expect(m.eigen.r).toBeLessThanOrEqual(w);
        expect(m.eigen.w).toBeGreaterThan(120);
        // Zahlen: mindestens 10 px hoch (das Hunderterfeld auf dem quer gehaltenen Telefon ist das kleinste Bild)
        for (const z of m.zahlen) expect(z, `${id} Stufe ${stufe}`).toBeGreaterThanOrEqual(w === 640 && id === 'hunderterfeld' ? 7 : 10);
        for (const k of m.knoepfe) expect(k).toBeGreaterThanOrEqual(47.5);
        // eine Zahl tippen: sie steht sofort im Nest des Bildes
        await page.click('[data-ziffer="7"]');
        expect(await page.$$eval('.feld > .aufgabe-bild [data-inhalt] text', (t) => t.map((x) => x.textContent))).toEqual(['7']);
        await page.close();
      }
    });

    if (w === 360 || w === 1280)
      it.each(G1B)('%s: Hilfe 2 und 3 liegen im Bild; Schritt am eigenen Bild oder an der ähnlichen Aufgabe', async (id) => {
        for (const hilfe of [2, 3] as const) {
          const s = satz(id, 2, 100, hilfe);
          const page = await oeffnen(w, h, s);
          const m = await messen(page);
          expect(m.scrollW).toBeLessThanOrEqual(w);
          expect(m.teil.length).toBeGreaterThan(0);
          for (const t of [...m.teil, ...m.schritt]) {
            expect(t.w).toBeGreaterThan(4);
            expect(t.l).toBeGreaterThanOrEqual(m.eigen.l - 1);
            expect(t.r).toBeLessThanOrEqual(m.eigen.r + 1);
            expect(t.b).toBeLessThanOrEqual(m.eigen.b + 1);
          }
          const verraet = FORMATE[id].schrittVerraet?.(s.aufgaben[0].bedingung) ?? false;
          if (hilfe === 2) expect(m.schritt).toHaveLength(0);
          else if (verraet) {
            expect(m.schritt).toHaveLength(0);
            expect(m.schrittKasten).toBeGreaterThan(0);
            expect(m.kasten!.r).toBeLessThanOrEqual(w);
          } else {
            expect(m.schritt.length).toBeGreaterThan(0);
            expect(m.kasten).toBeNull();
          }
          await page.close();
        }
      });
  });
}
