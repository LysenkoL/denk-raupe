import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';
import { createServer, type ViteDevServer } from 'vite';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { FORMATE } from '../src/aufgaben';
import { lernbeispiel, type Aufgabe, type FormatId } from '../src/aufgaben/format';
import { neueSitzung, neuesProfil, type Profil, type Sitzung } from '../src/satz/sitzung';
import type { Historie } from '../src/satz/historie';
import { probeSatzPlan, probeStufen } from '../src/screens/alle';
import { gleich, type Antwort } from '../src/perlen/antwort';
import { KIND } from '../src/i18n/kind';

/**
 * Satzbildschirm nach A10 im echten Browser (docs/PLAN.md, A10; docs/STIL.md, „Управление набором — одна стеклянная
 * бусина“ und „Облик экрана набора: стекло“): sieben Größen ohne Scrollen, nur die Perle schickt, Zahl in einem
 * Fenster, Glätten 0,3 s, Speichern und Wiederherstellen, Vergleichen ohne Lösung unter dem Blatt, Lernbeispiel mit
 * einem Nest, Hilfeleiter mit Puls und „Später“, allgemeines Beispiel der Geste mit Finger, Finger im Satz.
 */
const GROESSEN: [number, number][] = [[360, 740], [740, 360], [1000, 1000], [1280, 800], [800, 1280], [1920, 1080], [1000, 700]];
const SAMEN = 20261115;
const ALLE = Object.keys(FORMATE) as FormatId[];

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

/** Profil: alle Formate bekannt, Geste durch, Ton aus */
const bekannt = (mehr: Partial<Profil> = {}): Profil => ({ ...neuesProfil(), ton: false, geste: true, formate: Object.fromEntries(ALLE.map((id) => [id, 'bekannt'])), ...mehr });
/** fester Satz: Zahlenmauer, Wer ist es?, Muster (Zahl, Bild, Wahl) */
const probe = (): Sitzung => neueSitzung(SAMEN, undefined, [{ format: 'zahlenmauer', stufe: 1 }, { format: 'wer-ist-es', stufe: 1 }, { format: 'muster', stufe: 1 }]);

async function oeffnen(w: number, h: number, o: { sitzung?: Sitzung | null; profil?: unknown; weitere?: Record<string, unknown>; bewegung?: boolean; uhr?: boolean } = {}): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: o.bewegung ? 'no-preference' : 'reduce' });
  if (o.uhr) await page.clock.install();
  // Musterseite fasst den Speicher nicht an – sonst könnte die App beim ersten Laden einen eigenen Satz speichern
  await page.goto(url + '#/stil');
  const werte: Record<string, unknown> = { profil: o.profil ?? bekannt(), ...(o.weitere ?? {}) };
  if (o.sitzung !== null) werte.sitzung = o.sitzung ?? probe();
  await page.evaluate(
    (werte) =>
      new Promise<void>((ok) => {
        const req = indexedDB.open('denk-raupe', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('kv');
        req.onsuccess = () => {
          const tx = req.result.transaction('kv', 'readwrite');
          for (const [k, w] of Object.entries(werte)) tx.objectStore('kv').put(w, k);
          tx.oncomplete = () => (req.result.close(), ok());
        };
      }),
    werte,
  );
  await page.goto(url + '#/');
  await page.reload();
  await page.waitForSelector('.nz-brett, .nz-karte');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(320);
  return page;
}

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
const loesung = (a: Aufgabe): Antwort => FORMATE[a.format].loesungen(a.bedingung)[0];
const falsch = (a: Aufgabe): Antwort => {
  const l = loesung(a);
  return a.wahl ? a.wahl.find((w) => !gleich(w, l))! : { art: 'zahl', wert: l.art === 'zahl' ? (l.wert + 1) % 100 : 1 };
};

/** Entwurf bauen wie das Kind: Ziffern, Wahlkachel oder Tipp ins Bild – noch ohne Abgabe */
async function bauen(page: Page, a: Pick<Aufgabe, 'wahl'>, antwort: Antwort): Promise<void> {
  if (await page.$('.nz-tasten')) {
    // eine zurückgekehrte Zahl ist markiert: die erste Ziffer ersetzt sie
    for (const c of String((antwort as { wert: number }).wert)) await page.click(`[data-ziffer="${c}"]`);
    return;
  }
  const k = a.wahl!.findIndex((w) => gleich(w, antwort));
  if (await page.$('.nz-option')) await page.click(`.nz-option[data-k="${k}"]`);
  else await page.click(`#nz-bild [data-wahl="${k}"]`, { force: true });
}
/** Entwurf bauen und mit der Perle abschicken */
async function geben(page: Page, a: Pick<Aufgabe, 'wahl'>, antwort: Antwort): Promise<void> {
  await bauen(page, a, antwort);
  await page.waitForTimeout(320);
  await page.click('[data-abgabe]');
  await page.waitForTimeout(330);
}
async function vergleichen(page: Page): Promise<void> {
  await page.click('[data-vergleichen], [data-ueberblick]');
  // ohne Bewegung: sofort; danach 1,5 s Pause, bis die nächste offene Aufgabe kommt
  await page.waitForFunction(() => document.querySelector('#nz')!.getAttribute('data-phase') !== 'vergleich', null, { timeout: 5000 });
  await page.waitForTimeout(330);
}
const scrollt = (page: Page) => page.evaluate(() => document.documentElement.scrollHeight > innerHeight + 1 || document.documentElement.scrollWidth > innerWidth + 1);
const phase = (page: Page) => page.getAttribute('#nz', 'data-phase');
const lage = (page: Page) => page.evaluate(() => ['.nz-brett', '.nz-werkzeug', '.nz-schale', '#nz-reihe .nz-kopf'].map((s) => {
  const r = document.querySelector(s)!.getBoundingClientRect();
  return [r.left, r.top, r.width, r.height].map(Math.round).join(',');
}).join(' | '));
/** alles Sichtbare liegt im Fenster, Tippflächen ≥ 48 px, „Zurück“ und „Menü“ liegen nicht auf Lade und Blatt */
const pruefen = (page: Page) => page.evaluate(() => {
  const fehler: string[] = [];
  const W = innerWidth, H = innerHeight;
  for (const b of document.querySelectorAll<HTMLElement>('#nz button')) {
    const r = b.getBoundingClientRect();
    if (!r.width || getComputedStyle(b).visibility === 'hidden') continue;
    if (r.left < -1 || r.right > W + 1 || r.top < -1 || r.bottom > H + 1) fehler.push(`außerhalb: ${b.className} ${Math.round(r.left)},${Math.round(r.top)}`);
    // Perlen am Ast haben eine unsichtbare Trefferfläche (.nz-treffer); sonst ≥ 48 px
    if (b.matches('.nz-slot')) continue;
    if (Math.min(r.width, r.height) < 47.5) fehler.push(`klein: ${b.className} ${Math.round(r.width)}×${Math.round(r.height)}`);
  }
  const ueber = (a: string, b: string) => {
    const p = document.querySelector(a)?.getBoundingClientRect(), q = document.querySelector(b)?.getBoundingClientRect();
    return !!p && !!q && p.width > 0 && q.width > 0 && p.left < q.right && q.left < p.right && p.top < q.bottom && q.top < p.bottom;
  };
  for (const k of ['[data-zurueck]', '[data-menue]']) for (const z of ['.nz-werkzeug', '.nz-schale', '.nz-brett']) if (ueber(k, z)) fehler.push(`${k} auf ${z}`);
  const bild = document.querySelector('#nz-bild svg')?.getBoundingClientRect();
  const brett = document.querySelector('.nz-brett')?.getBoundingClientRect();
  if (bild && brett && (bild.left < brett.left - 1 || bild.right > brett.right + 1 || bild.bottom > brett.bottom + 1)) fehler.push('Bild ragt aus dem Brett');
  return fehler;
});

describe('sieben Größen: fester Tisch, kein Scrollen, ganzer Satz bis zum Ende', () => {
  for (const [w, h] of GROESSEN)
    it(`${w}×${h}`, async () => {
      const s = probe();
      const page = await oeffnen(w, h, { sitzung: s });
      const erste = await lage(page);
      for (let i = 0; i < 3; i++) {
        expect(await lage(page), `Aufgabe ${i + 1}`).toBe(erste);
        expect(await scrollt(page)).toBe(false);
        expect(await pruefen(page), `Aufgabe ${i + 1}`).toEqual([]);
        await geben(page, s.aufgaben[i], i === 1 ? falsch(s.aufgaben[i]) : loesung(s.aufgaben[i]));
      }
      // alle Perlen da: Karte „Vergleichen“, kein Zwilling vorher
      expect(await phase(page)).toBe('bereit');
      expect(await page.isHidden('#nz-zwilling')).toBe(true);
      expect(await pruefen(page)).toEqual([]);
      await vergleichen(page);
      // das Blatt über Aufgabe 2 bleibt liegen: sie ist wieder offen, der Tisch an derselben Stelle
      expect(await phase(page)).toBe('loesen');
      expect(await page.getAttribute('[data-slot="1"]', 'aria-current')).toBe('step');
      expect(await lage(page)).toBe(erste);
      expect(await pruefen(page)).toEqual([]);
      await geben(page, s.aufgaben[1], loesung(s.aufgaben[1]));
      await vergleichen(page);
      expect(await phase(page)).toBe('fertig');
      expect(await page.locator('.nz-kachel').count()).toBe(3);
      expect(await scrollt(page)).toBe(false);
      expect(await pruefen(page)).toEqual([]);
      await page.close();
    });

  for (const [w, h] of [[360, 740], [740, 360], [1280, 800]] as const)
    it(`${w}×${h}: jedes Format, Stufe 1 und höchste bis 100 – Bild ganz im Brett, Zahlen lesbar`, async () => {
      for (const id of ALLE) {
        const plan = probeSatzPlan(id);
        const s = neueSitzung(SAMEN, { zahlenraum: 100 }, [plan[0], plan[plan.length - 1]]);
        const page = await oeffnen(w, h, { sitzung: s });
        for (const i of [0, 1]) {
          await page.click(`[data-slot="${i}"]`);
          await page.waitForTimeout(320);
          expect(await pruefen(page), `${id} Aufgabe ${i + 1}`).toEqual([]);
          expect(await scrollt(page)).toBe(false);
          const m = await page.evaluate(() => {
            const svg = document.querySelector('#nz-bild svg')!;
            const r = svg.getBoundingClientRect();
            const texte = [...svg.querySelectorAll('text')].filter((t) => /\d|\?/.test(t.textContent ?? '') && t.getBoundingClientRect().height > 0);
            return { w: r.width, h: r.height, zahl: Math.min(99, ...texte.map((t) => t.getBoundingClientRect().height)) };
          });
          expect(m.w, id).toBeGreaterThan(120);
          expect(m.zahl, `${id} Stufe ${s.aufgaben[i].stufe}`).toBeGreaterThanOrEqual(id === 'hunderterfeld' && h < 500 ? 6 : 9);
        }
        await page.close();
      }
    });
});

describe('Bedienung: nur die Perle schickt', () => {
  it('Wahl und Zahl bauen nur den Entwurf; leere Perle schickt nichts; der Entwurf steht in der Aufgabe', async () => {
    const s = probe();
    const page = await oeffnen(412, 800, { sitzung: s });
    await page.click('[data-abgabe]');
    await page.waitForTimeout(100);
    expect(await page.locator('[data-slot="0"] .nz-perle').count()).toBe(0);
    await page.click('[data-ziffer="1"]');
    await page.click('[data-ziffer="4"]');
    // die Zahl steht sofort in der Aufgabe und in der Perle, aber noch nicht auf der Raupe
    expect(await page.$$eval('#nz-bild text[data-inhalt]', (t) => t.map((x) => x.textContent))).toEqual(['14']);
    expect(await page.getAttribute('[data-abgabe]', 'aria-label')).toBe(KIND.abgeben);
    expect(await page.locator('[data-slot="0"] .nz-perle').count()).toBe(0);
    await page.click('[data-loeschen]');
    expect(await page.$$eval('#nz-bild text[data-inhalt]', (t) => t.map((x) => x.textContent))).toEqual(['1']);
    await page.click('[data-ziffer="4"]');
    await page.waitForTimeout(320);
    await page.click('[data-abgabe]');
    await page.waitForTimeout(330);
    expect((await gespeichert<Sitzung>(page, 'sitzung')).satz.perlen[0].antwort).toEqual({ art: 'zahl', wert: 14 });
    // automatisch weiter zur nächsten leeren Aufgabe
    expect(await page.getAttribute('[data-slot="1"]', 'aria-current')).toBe('step');
    await page.close();
  });

  it('0,3 s nach dem Wechsel nimmt der Tisch keine Tipps an; die Perle nimmt 0,3 s nach einer Änderung keine Abgabe', async () => {
    const page = await oeffnen(412, 800);
    // Wechsel zur Aufgabe 3 und sofort ein Tipp auf eine Wahlkachel: verworfen
    await page.evaluate(() => {
      (document.querySelector('[data-slot="2"]') as HTMLElement).click();
      (document.querySelector('.nz-option[data-k="0"]') as HTMLElement).click();
    });
    expect(await page.locator('.nz-option.gewaehlt').count()).toBe(0);
    await page.waitForTimeout(320);
    await page.click('.nz-option[data-k="0"]');
    expect(await page.locator('.nz-option.gewaehlt').count()).toBe(1);
    // Ziffer und sofort die Perle: die Abgabe gilt erst nach der Sperre
    await page.click('[data-slot="0"]');
    await page.waitForTimeout(320);
    await page.evaluate(() => {
      (document.querySelector('[data-ziffer="5"]') as HTMLElement).click();
      (document.querySelector('[data-abgabe]') as HTMLElement).click();
    });
    expect(await page.locator('[data-slot="0"] .nz-perle').count()).toBe(0);
    await page.close();
  });

  it('Zahl bis 100: 1, 0, 0 ergibt 100; die nächste Ziffer beginnt neu; zurück zu einer Zahl: erste Ziffer ersetzt', async () => {
    const s = neueSitzung(SAMEN, { zahlenraum: 100 }, [{ format: 'zahlenmauer', stufe: 3 }, { format: 'muster', stufe: 1 }]);
    const page = await oeffnen(412, 800, { sitzung: s });
    for (const d of '100') await page.click(`[data-ziffer="${d}"]`);
    expect(await page.$$eval('#nz-bild text[data-inhalt]', (t) => t.map((x) => x.textContent))).toEqual(['100']);
    await page.click('[data-ziffer="7"]');
    expect(await page.$$eval('#nz-bild text[data-inhalt]', (t) => t.map((x) => x.textContent))).toEqual(['7']);
    await page.click('[data-ziffer="3"]');
    await page.waitForTimeout(320);
    await page.click('[data-abgabe]');
    await page.waitForTimeout(330);
    await page.click('[data-slot="0"]');
    await page.waitForTimeout(320);
    await page.click('[data-ziffer="5"]');
    expect(await page.$$eval('#nz-bild text[data-inhalt]', (t) => t.map((x) => x.textContent))).toEqual(['5']);
    // selbst zurückgekehrt: nach der Abgabe bleibt der Bildschirm auf dieser Aufgabe
    await page.waitForTimeout(320);
    await page.click('[data-abgabe]');
    await page.waitForTimeout(330);
    expect(await page.getAttribute('[data-slot="0"]', 'aria-current')).toBe('step');
    await page.close();
  });

  it('Wahl: ein anderer Vorschlag ersetzt, derselbe noch einmal nimmt ihn weg', async () => {
    const page = await oeffnen(412, 800);
    await page.click('[data-slot="2"]');
    await page.waitForTimeout(320);
    await page.click('.nz-option[data-k="0"]');
    await page.click('.nz-option[data-k="1"]');
    expect(await page.$$eval('.nz-option.gewaehlt', (e) => e.map((x) => x.getAttribute('data-k')))).toEqual(['1']);
    await page.click('.nz-option[data-k="1"]');
    expect(await page.locator('.nz-option.gewaehlt').count()).toBe(0);
    expect(await page.getAttribute('[data-abgabe]', 'aria-label')).toBe(KIND.nochLeer);
    await page.close();
  });
});

describe('Speichern', () => {
  it('nach Neuladen: Antworten, aktuelle Aufgabe und halber Entwurf sind wieder da', async () => {
    const s = probe();
    const page = await oeffnen(412, 800, { sitzung: s });
    await geben(page, s.aufgaben[0], loesung(s.aufgaben[0]));
    await page.click('.nz-tipp, #nz-bild');
    await bauen(page, s.aufgaben[1], falsch(s.aufgaben[1]));
    await page.waitForTimeout(150);
    await page.reload();
    await page.waitForSelector('.nz-brett');
    await page.waitForTimeout(320);
    expect(await page.getAttribute('[data-slot="1"]', 'aria-current')).toBe('step');
    expect(await page.locator('[data-slot="0"] .nz-perle').count()).toBe(1);
    expect(await page.getAttribute('[data-abgabe]', 'aria-label')).toBe(KIND.abgeben);
    expect(await page.locator('[data-slot="1"] .nz-perle').count()).toBe(0);
    await page.close();
  });

  it('Satz aus Version 1 öffnet sich nach dem Update mit denselben Aufgaben und Antworten', async () => {
    const v1 = JSON.parse(readFileSync(resolve(__dirname, 'fixtures/speicher-v1.json'), 'utf8'));
    const page = await oeffnen(390, 800, { sitzung: v1.sitzung, profil: { ...v1.profil, geste: true } });
    const labels = await page.$$eval('#nz-reihe .nz-slot', (els) => els.map((e) => e.getAttribute('aria-label')));
    expect(labels).toEqual(['Aufgabe 1: Quadrat', 'Aufgabe 2: 3', 'Aufgabe 3: 2']);
    expect(await page.getAttribute('[data-slot="1"]', 'aria-current')).toBe('step');
    expect(await page.textContent('.nz-frage')).toBe('Welche Zahl fehlt?');
    // Hilfe 3 aus Version 1: Punkte am eigenen Bild
    expect(await page.$$eval('#nz-bild [data-punkt]', (els) => els.map((e) => e.getAttribute('data-punkt')))).toEqual(['zweiter', 'leer']);
    // offen ist nur Aufgabe 2 (gestrichelter Ring)
    expect(await page.$$eval('#nz-reihe .zu-mark', (e) => e.map((x) => x.getAttribute('data-slot')))).toEqual(['1']);
    await page.waitForTimeout(150);
    expect((await gespeichert<Sitzung>(page, 'sitzung')).version).toBe(2);
    await page.close();
  });

  it('unbekannte neuere Version: Satz, Profil und Historie bleiben unangetastet unter „…-unbekannt“', async () => {
    const satzNeu = { ...neueSitzung(SAMEN), version: 3, ausDerZukunft: true };
    const profilNeu = { ...neuesProfil(), version: 4, blaetter: 99 };
    const page = await oeffnen(412, 800, { sitzung: satzNeu as unknown as Sitzung, profil: profilNeu });
    await page.waitForTimeout(150);
    expect(await gespeichert(page, 'sitzung-unbekannt')).toEqual([satzNeu]);
    expect(await gespeichert(page, 'profil-unbekannt')).toEqual([profilNeu]);
    await page.close();
  });
});

describe('Vergleichen', () => {
  it('kein Zwilling beim Lösen; unter einem liegen gebliebenen Blatt keine Perle (auch nicht im DOM); Korb zählt', async () => {
    const s = probe();
    const page = await oeffnen(412, 800, { sitzung: s, bewegung: true, profil: bekannt({ blaetter: 5 }) });
    for (let i = 0; i < 3; i++) {
      await geben(page, s.aufgaben[i], i === 2 ? falsch(s.aufgaben[i]) : loesung(s.aufgaben[i]));
      await page.waitForTimeout(700);
    }
    // die Karte wippt (Bewegung): nicht auf Stillstand warten
    await page.click('[data-vergleichen]', { force: true });
    // mitten in der Bewegung und danach: Nest unter Blatt 3 leer
    for (const warte of [600, 2600]) {
      await page.waitForTimeout(warte);
      const z = await page.$$eval('#nz-zwilling [data-gslot]', (els) => els.map((e) => !!e.querySelector('.nz-unter .nz-perle')));
      expect(z[2]).toBe(false);
    }
    const z = await page.$$eval('#nz-zwilling [data-gslot]', (els) => els.map((e) => !!e.querySelector('.nz-unter .nz-perle')));
    expect(z).toEqual([true, true, false]);
    expect(await page.textContent('.nz-zahl')).toBe('9');
    await page.waitForFunction(() => document.querySelector('#nz')!.getAttribute('data-phase') === 'loesen', null, { timeout: 6000 });
    expect(await page.getAttribute('[data-slot="2"]', 'aria-current')).toBe('step');
    await page.close();
  });

  it('fertig: Historie genau einmal, Blätter und Buchstabe im Profil; „Noch ein Satz“ beginnt einen neuen, nichts geht verloren', async () => {
    const s = probe();
    const page = await oeffnen(412, 800, { sitzung: s });
    for (let i = 0; i < 3; i++) await geben(page, s.aufgaben[i], loesung(s.aufgaben[i]));
    await vergleichen(page);
    expect(await phase(page)).toBe('fertig');
    await page.waitForTimeout(150);
    const h = await gespeichert<Historie>(page, 'historie');
    expect(h.eintraege.map((e) => e.ergebnis)).toEqual(['gold', 'gold', 'gold']);
    const p = await gespeichert<Profil>(page, 'profil');
    expect([p.blaetter, p.saetze, p.geheim.offen.length]).toEqual([6, 1, 1]);
    expect(await page.locator('.nz-geheim span.neu').count()).toBe(1);
    await page.reload();
    await page.waitForSelector('.nz-karte.ende');
    expect((await gespeichert<Historie>(page, 'historie')).eintraege).toHaveLength(3);
    await page.click('[data-noch]');
    await page.waitForSelector('.nz-brett');
    await page.waitForTimeout(150);
    const neu = await gespeichert<Sitzung>(page, 'sitzung');
    expect(neu.samen).not.toBe(s.samen);
    expect(neu.aufgaben).toHaveLength(5);
    expect((await gespeichert<Historie>(page, 'historie')).eintraege).toHaveLength(3);
    await page.close();
  });

  it('nochmal Vergleichen ohne Änderung: Hinweis, kein Fehlversuch', async () => {
    const s = probe();
    const page = await oeffnen(412, 800, { sitzung: s });
    for (let i = 0; i < 3; i++) await geben(page, s.aufgaben[i], i === 0 ? falsch(s.aufgaben[i]) : loesung(s.aufgaben[i]));
    await vergleichen(page);
    await page.click('[data-ueberblick]');
    await page.waitForSelector('.nz-vtext');
    await page.waitForFunction((t) => document.querySelector('.nz-vtext')?.textContent === t, KIND.nichtsGeaendert, { timeout: 3000 });
    await page.waitForFunction(() => document.querySelector('#nz')!.getAttribute('data-phase') === 'loesen', null, { timeout: 4000 });
    expect((await gespeichert<Sitzung>(page, 'sitzung')).satz.perlen[0].fehlversuche).toBe(1);
    await page.close();
  });
});

describe('Lernbeispiel', () => {
  it('neues Format: ein Nest, kein Korb; falsch → zurück und Hilfe 2; richtig → „Genau so!“, nächster Schritt; danach bekannt', async () => {
    const s = probe();
    const formate = { ...bekannt().formate, zahlenmauer: 'neu' as const };
    const page = await oeffnen(412, 800, { sitzung: s, profil: bekannt({ formate, blaetter: 3 }) });
    expect(await page.getAttribute('#nz', 'data-modus')).toBe('lern');
    expect(await page.locator('[data-lernslot]').count()).toBe(1);
    expect(await page.locator('[data-slot]').count()).toBe(0);
    expect(await page.locator('#nz-korb img').count()).toBe(0);
    const schritte = lernbeispiel(FORMATE.zahlenmauer);
    await geben(page, schritte[0], falsch(schritte[0]));
    await page.waitForTimeout(200);
    expect(await page.textContent('.nz-meldung')).toBe(KIND.nochmalSchauen);
    expect(await page.locator('#nz-bild [data-hilfe="teil"]').count()).toBeGreaterThan(0);
    expect(await page.getAttribute('[data-abgabe]', 'aria-label')).toBe(KIND.nochLeer);
    for (let k = 0; k < schritte.length; k++) {
      await geben(page, schritte[k], loesung(schritte[k]));
      expect(await page.textContent('.nz-meldung')).toBe(KIND.genau);
      // Neuladen mitten im Beispiel: derselbe Schritt
      if (k === 0) {
        await page.waitForTimeout(1100);
        await page.reload();
        await page.waitForSelector('.nz-brett');
        await page.waitForTimeout(320);
        expect((await gespeichert<Sitzung>(page, 'sitzung')).lernbeispiel?.schritt).toBe(1);
      } else await page.waitForTimeout(1100);
    }
    expect(await page.getAttribute('#nz', 'data-modus')).toBe('satz');
    const p = await gespeichert<Profil>(page, 'profil');
    expect(p.formate.zahlenmauer).toBe('bekannt');
    expect(p.blaetter).toBe(3);
    const ss = await gespeichert<Sitzung>(page, 'sitzung');
    expect(ss.satz.perlen.every((x) => x.antwort === null)).toBe(true);
    expect(await gespeichert(page, 'historie')).toBeUndefined();
    await page.close();
  });
});

describe('Hilfe', () => {
  it('Laterne: 1 = Lernbeispiel auf Wunsch (zurück jederzeit), 2 = auf dem Bild + „So geht’s“; vor dem Vergleichen nicht mehr', async () => {
    const page = await oeffnen(412, 800);
    await page.click('[data-hilfe]');
    expect(await page.getAttribute('#nz', 'data-modus')).toBe('lern');
    await page.click('[data-los]');
    await page.waitForTimeout(320);
    expect(await page.getAttribute('#nz', 'data-modus')).toBe('satz');
    await page.click('[data-hilfe]');
    expect(await page.locator('#nz-bild [data-hilfe="teil"]').count()).toBeGreaterThan(0);
    expect(await page.locator('[data-sogehts]').count()).toBe(1);
    expect(await page.isDisabled('[data-hilfe]')).toBe(true);
    await page.click('[data-sogehts]');
    expect(await page.getAttribute('#nz', 'data-modus')).toBe('lern');
    await page.click('[data-los]');
    await page.waitForTimeout(320);
    expect((await gespeichert<Sitzung>(page, 'sitzung')).hilfeOffen[0]).toBe(2);
    await page.close();
  });

  it('nach dem Vergleichen bis Stufe 4: ähnliche Aufgabe im Brett; „Später“ legt zurück; nächster Satz bringt sie wieder', async () => {
    const s = probe();
    const page = await oeffnen(412, 800, { sitzung: s });
    for (let i = 0; i < 3; i++) await geben(page, s.aufgaben[i], i === 0 ? falsch(s.aufgaben[i]) : loesung(s.aufgaben[i]));
    await vergleichen(page);
    for (let k = 0; k < 4; k++) {
      await page.click('[data-hilfe]');
      if (k === 0) {
        await page.click('[data-los]');
        await page.waitForTimeout(320);
      }
    }
    expect(await page.locator('.nz-aehnlich svg').count()).toBe(1);
    expect(await pruefen(page)).toEqual([]);
    await page.click('[data-spaeter]');
    await page.waitForTimeout(150);
    expect(await phase(page)).toBe('fertig');
    expect(await page.textContent('.nz-karte.ende')).toContain(KIND.spaeter);
    const p = await gespeichert<Profil>(page, 'profil');
    expect(p.zurueckgelegt).toHaveLength(1);
    expect((await gespeichert<Historie>(page, 'historie')).eintraege.map((e) => e.ergebnis)).toEqual(['zurueck', 'gold', 'gold']);
    await page.click('[data-noch]');
    await page.waitForSelector('.nz-brett');
    await page.waitForTimeout(150);
    const neu = await gespeichert<Sitzung>(page, 'sitzung');
    expect(neu.aufgaben.some((a) => JSON.stringify(a.bedingung) === JSON.stringify(s.aufgaben[0].bedingung))).toBe(true);
    await page.close();
  });

  it('Puls erst nach zwei verschiedenen Fehlprüfungen; Hilfe drücken beendet ihn', async () => {
    const s = probe();
    const page = await oeffnen(412, 800, { sitzung: s });
    const a = s.aufgaben[0];
    const l = loesung(a) as { wert: number };
    for (let i = 0; i < 3; i++) await geben(page, s.aufgaben[i], i === 0 ? { art: 'zahl', wert: l.wert + 1 } : loesung(s.aufgaben[i]));
    await vergleichen(page);
    expect(await page.getAttribute('[data-hilfe]', 'data-puls')).toBeNull();
    await geben(page, a, { art: 'zahl', wert: l.wert + 2 });
    await vergleichen(page);
    expect(await page.getAttribute('[data-hilfe]', 'data-puls')).toBe('ja');
    await page.click('[data-hilfe]');
    await page.click('[data-los]');
    await page.waitForTimeout(320);
    expect(await page.getAttribute('[data-hilfe]', 'data-puls')).toBeNull();
    await page.close();
  });
});

describe('Geste und Finger', () => {
  it('allererstes Mal: Geste in zwei Schritten mit Finger; danach nie wieder; erster Satz auf Stufe 1', async () => {
    const page = await oeffnen(412, 800, { sitzung: null, profil: { ...neuesProfil(), ton: false } });
    expect(await page.getAttribute('#nz', 'data-modus')).toBe('geste');
    const fingerAuf = (sel: string) => page.evaluate((sel) => {
      const f = document.querySelector('#nz-finger') as HTMLElement;
      if (f.hidden) return false;
      const z = document.querySelector(sel)!.getBoundingClientRect();
      const r = f.getBoundingClientRect();
      // Spitze (oben Mitte, ungedreht) innerhalb des Ziels oder knapp darunter
      const x = r.left + r.width / 2, y = r.top + 2;
      return x >= z.left && x <= z.right && y >= z.top && y <= z.bottom + 4;
    }, sel);
    await page.waitForTimeout(100);
    expect(await fingerAuf('[data-k="1"]')).toBe(true);
    await page.click('[data-k="0"]');
    await page.waitForTimeout(320);
    expect(await fingerAuf('[data-k="1"]')).toBe(true);
    await page.click('[data-k="1"]');
    await page.waitForTimeout(320);
    // Perle unten am Rand: der Finger kommt von der Seite – sichtbar ist er trotzdem
    expect(await page.isHidden('#nz-finger')).toBe(false);
    await page.click('[data-abgabe]');
    await page.waitForTimeout(1300);
    expect(await page.textContent('.nz-frage')).toBe(KIND.geste.zahl);
    await page.waitForTimeout(100);
    expect(await fingerAuf('[data-ziffer="1"]')).toBe(true);
    await page.click('[data-ziffer="1"]');
    await page.waitForTimeout(100);
    expect(await fingerAuf('[data-ziffer="2"]')).toBe(true);
    await page.click('[data-ziffer="2"]');
    await page.waitForTimeout(320);
    await page.click('[data-abgabe]');
    await page.waitForTimeout(1300);
    expect(await page.getAttribute('#nz', 'data-modus')).toBe('lern');
    expect((await gespeichert<Profil>(page, 'profil')).geste).toBe(true);
    const s = await gespeichert<Sitzung>(page, 'sitzung');
    expect(s.aufgaben).toHaveLength(3);
    expect(s.aufgaben.every((a) => a.stufe === 1)).toBe(true);
    await page.reload();
    await page.waitForSelector('.nz-brett');
    expect(await page.getAttribute('#nz', 'data-modus')).toBe('lern');
    await page.close();
  });

  it('im Satz: Finger auf der Perle nach 15 s Ruhe bei Wahl, einmal je Aufgabe; nach zwei eigenen Abgaben nicht mehr', async () => {
    const page = await oeffnen(412, 800, { uhr: true });
    await page.click('[data-slot="2"]');
    await page.clock.runFor(400);
    await page.click('.nz-option[data-k="0"]');
    await page.clock.runFor(10000);
    expect(await page.isHidden('#nz-finger')).toBe(true);
    await page.clock.runFor(6000);
    expect(await page.isHidden('#nz-finger')).toBe(false);
    await page.mouse.click(5, 300);
    expect(await page.isHidden('#nz-finger')).toBe(true);
    await page.clock.runFor(20000);
    expect(await page.isHidden('#nz-finger')).toBe(true);
    await page.close();
    const satt = await oeffnen(412, 800, { uhr: true, profil: bekannt({ abgaben: { wahl: 2, bild: 0 } }) });
    await satt.click('[data-slot="2"]');
    await satt.clock.runFor(400);
    await satt.click('.nz-option[data-k="0"]');
    await satt.clock.runFor(20000);
    expect(await satt.isHidden('#nz-finger')).toBe(true);
    await satt.close();
  });

  it('zweimal auf die leere Perle: der Finger zeigt einmal auf die Werkzeuge; Zahl: kein Finger nach Ruhe', async () => {
    const page = await oeffnen(412, 800, { uhr: true });
    await page.click('[data-abgabe]');
    expect(await page.isHidden('#nz-finger')).toBe(true);
    await page.click('[data-abgabe]');
    expect(await page.isHidden('#nz-finger')).toBe(false);
    await page.click('[data-ziffer="3"]');
    expect(await page.isHidden('#nz-finger')).toBe(true);
    await page.clock.runFor(20000);
    expect(await page.isHidden('#nz-finger')).toBe(true);
    await page.close();
  });
});

describe('Rand: Zurück, Menü, Probe-Seite, gezählt markieren', () => {
  it('„Zurück“ fragt erst; „Aufhören“ führt zur Pause; Ton im Menü wird gespeichert', async () => {
    const page = await oeffnen(412, 800);
    await page.click('[data-menue]');
    await page.click('[data-ton]');
    await page.waitForTimeout(150);
    expect((await gespeichert<Profil>(page, 'profil')).ton).toBe(true);
    await page.click('[data-menue]');
    await page.click('[data-zurueck]');
    expect(await page.textContent('.nz-dialog p')).toBe(KIND.wirklichAufhoeren);
    await page.click('[data-schliessen]');
    expect(await page.locator('.nz-dialog').count()).toBe(0);
    await page.click('[data-zurueck]');
    await page.click('[data-aufhoeren]');
    await page.waitForFunction(() => location.hash === '#/pause');
    await page.close();
  });

  it('Probe-Seite: ein Format → 5 Aufgaben nur dieses Formats, Stufen 1 → 3', async () => {
    const page = await oeffnen(360, 740);
    await page.click('[data-menue]');
    await page.click('a[href="#/alle"]');
    await page.waitForSelector('.alle-liste');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
    await page.click('.alle-format[data-format="klecks"]');
    await page.waitForSelector('.nz-brett');
    await page.waitForTimeout(150);
    const s = await gespeichert<Sitzung>(page, 'sitzung');
    expect(s.aufgaben.map((a) => a.format)).toEqual(Array(5).fill('klecks'));
    expect(s.aufgaben.map((a) => a.stufe)).toEqual(probeStufen(3));
    expect(await page.locator('#nz-reihe .nz-slot').count()).toBe(5);
    await page.close();
  });

  it('gezählt markieren: Ring bleibt beim Eingeben, die Antwort ändert sich nicht; andere Aufgabe: neu', async () => {
    const s = neueSitzung(SAMEN, undefined, [{ format: 'wie-viele', stufe: 2 }, { format: 'wie-viele', stufe: 1 }, { format: 'muster', stufe: 1 }]);
    const page = await oeffnen(360, 740, { sitzung: s });
    const ring = (k: number) => page.$eval(`#nz-bild [data-zaehl="${k}"]`, (e) => e.classList.contains('gezaehlt'));
    await page.click('#nz-bild [data-zaehl="0"]', { force: true });
    await page.click('#nz-bild [data-zaehl="2"]', { force: true });
    expect(await ring(0)).toBe(true);
    await page.click('[data-ziffer="4"]');
    expect([await ring(0), await ring(2)]).toEqual([true, true]);
    expect((await gespeichert<Sitzung>(page, 'sitzung')).satz.perlen[0].antwort).toBeNull();
    await page.click('#nz-bild [data-zaehl="2"]', { force: true });
    expect(await ring(2)).toBe(false);
    await page.click('[data-slot="1"]');
    await page.waitForTimeout(320);
    expect(await ring(0)).toBe(false);
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
      const formate = await page.$$eval('.format-probe', (els) => els.map((e) => ({ id: e.getAttribute('data-format'), bilder: e.querySelectorAll('svg').length, text: e.textContent })));
      expect(formate.map((f) => f.id).sort()).toEqual([...ALLE].sort());
      for (const f of formate) {
        expect(f.bilder).toBe(3);
        expect(f.text).toMatch(sp === 'de' ? /So helfen Sie/ : /Як допомогти/);
      }
      await page.close();
    }
  });
});

