// Screenshots des Satzbildschirms (A10) auf sieben Größen und der Musterseite.
// Aufruf: npm run build && npm run screenshots  → Ordner screenshots/ (nicht im Repo)
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';

/** sieben Größen aus docs/STIL.md, „Проверка — на семи размерах“ */
const GROESSEN = [
  ['360x740', 360, 740],
  ['740x360', 740, 360],
  ['1000x1000', 1000, 1000],
  ['1280x800', 1280, 800],
  ['800x1280', 800, 1280],
  ['1920x1080', 1920, 1080],
  ['1000x700', 1000, 700],
];

mkdirSync('screenshots', { recursive: true });
const server = await createServer({ logLevel: 'silent', server: { port: 0, host: '127.0.0.1' } });
await server.listen();
const url = server.resolvedUrls.local[0];
const { neueSitzung, neuesProfil } = await server.ssrLoadModule('/src/satz/sitzung.ts');
const { probeSatzPlan } = await server.ssrLoadModule('/src/screens/alle.ts');
const { FORMATE } = await server.ssrLoadModule('/src/aufgaben/index.ts');
const { gleich } = await server.ssrLoadModule('/src/perlen/antwort.ts');
const { lernbeispiel, stimmt } = await server.ssrLoadModule('/src/aufgaben/format.ts');
const { setzeAntwort, vergleiche } = await server.ssrLoadModule('/src/satz/vergleich.ts');
const browser = await chromium.launch();
const ALLE = Object.keys(FORMATE);
const bekannt = { ...neuesProfil(), ton: false, geste: true, formate: Object.fromEntries(ALLE.map((id) => [id, 'bekannt'])) };

/** fester Satz: Zahl, Bild, Wahl */
const sitzung = neueSitzung(20261115, undefined, [{ format: 'zahlenmauer', stufe: 1 }, { format: 'wer-ist-es', stufe: 1 }, { format: 'muster', stufe: 1 }]);
const loesung = (a) => FORMATE[a.format].loesungen(a.bedingung)[0];
const falsch = (a) => {
  const l = loesung(a);
  return a.wahl ? a.wahl.find((w) => !gleich(w, l)) : { art: 'zahl', wert: (l.wert + 1) % 100 };
};

/** Satz nach dem ersten Vergleichen, Aufgabe 1 im Format `id` wieder leer, Hilfestufe `hilfe` offen */
function hilfeSitzung(id, hilfe) {
  const s = neueSitzung(20261115, { zahlenraum: 100 }, [{ format: id, stufe: 2 }, { format: 'muster', stufe: 1 }, { format: 'zahlenmauer', stufe: 1 }]);
  const voll = s.aufgaben.reduce((st, a, j) => setzeAntwort(st, j, falsch(a)), s.satz);
  const geprueft = vergleiche(voll, (j, antwort) => stimmt(FORMATE[s.aufgaben[j].format], s.aufgaben[j], antwort)).satz;
  return { ...s, satz: setzeAntwort(geprueft, 0, null), aktuell: 0, hilfeOffen: s.aufgaben.map((_, j) => (j === 0 ? hilfe : 0)) };
}

async function vorbereiten(page, s = sitzung, profil = bekannt) {
  // Musterseite fasst den Speicher nicht an – sonst könnte die App beim ersten Laden einen eigenen Satz speichern
  await page.goto(url + '#/stil');
  await page.evaluate(
    ([s, p]) =>
      new Promise((ok) => {
        const req = indexedDB.open('denk-raupe', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('kv');
        req.onsuccess = () => {
          const tx = req.result.transaction('kv', 'readwrite');
          if (s) tx.objectStore('kv').put(s, 'sitzung');
          else tx.objectStore('kv').delete('sitzung');
          tx.objectStore('kv').put(p, 'profil');
          tx.oncomplete = () => (req.result.close(), ok());
        };
      }),
    [s, profil],
  );
  await page.goto(url + '#/');
  await page.reload();
  await page.waitForSelector('.nz-brett, .nz-karte');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
}

/** Entwurf bauen und mit der Perle abschicken */
async function geben(page, a, antwort, abschicken = true) {
  if (await page.$('.nz-tasten')) for (const d of String(antwort.wert)) await page.click(`[data-ziffer="${d}"]`);
  else {
    const k = a.wahl.findIndex((w) => gleich(w, antwort));
    await page.click((await page.$('.nz-option')) ? `.nz-option[data-k="${k}"]` : `#nz-bild [data-wahl="${k}"]`, { force: true });
  }
  await page.waitForTimeout(350);
  if (!abschicken) return;
  await page.click('[data-abgabe]');
  // Flug 0,7 s, dann 0,3 s Glätten an der nächsten Aufgabe
  await page.waitForTimeout(1300);
}
const shot = (page, name, bild) => page.screenshot({ path: `screenshots/${name}-${bild}.png` });

for (const [name, w, h] of GROESSEN) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  // allererstes Mal: Geste mit Finger
  await vorbereiten(page, null, { ...neuesProfil(), ton: false });
  await shot(page, name, '01-geste-wahl');
  await page.click('[data-k="1"]');
  await page.waitForTimeout(400);
  await shot(page, name, '02-geste-perle');
  await page.click('[data-abgabe]');
  await page.waitForTimeout(1600);
  await page.click('[data-ziffer="1"]');
  await page.waitForTimeout(200);
  await shot(page, name, '03-geste-zahl');
  // Lernbeispiel eines neuen Formats: falsch, dann richtig
  await vorbereiten(page, sitzung, { ...bekannt, formate: { ...bekannt.formate, zahlenmauer: 'neu' } });
  const schritte = lernbeispiel(FORMATE.zahlenmauer);
  await shot(page, name, '04-lernbeispiel');
  await geben(page, schritte[0], falsch(schritte[0]));
  await shot(page, name, '05-lernbeispiel-falsch');
  await geben(page, schritte[0], loesung(schritte[0]), false);
  await page.click('[data-abgabe]');
  await page.waitForTimeout(700);
  await shot(page, name, '06-lernbeispiel-genau');
  // Satz
  await vorbereiten(page);
  for (let i = 0; i < 3; i++) {
    await page.click(`[data-slot="${i}"]`);
    await page.waitForTimeout(450);
    await shot(page, name, `1${i}-aufgabe-${sitzung.aufgaben[i].format}`);
  }
  await page.click('[data-slot="0"]');
  await page.waitForTimeout(450);
  await geben(page, sitzung.aufgaben[0], { art: 'zahl', wert: 14 }, false);
  await shot(page, name, '13-entwurf-zahl');
  await page.click('[data-loeschen]');
  await page.click('[data-loeschen]');
  await geben(page, sitzung.aufgaben[0], loesung(sitzung.aufgaben[0]));
  await geben(page, sitzung.aufgaben[1], falsch(sitzung.aufgaben[1]));
  await geben(page, sitzung.aufgaben[2], loesung(sitzung.aufgaben[2]));
  await shot(page, name, '20-bereit');
  await page.click('[data-vergleichen]', { force: true });
  await page.waitForTimeout(2700);
  await shot(page, name, '21-vergleich');
  await page.waitForFunction(() => document.querySelector('#nz').getAttribute('data-phase') === 'loesen', null, { timeout: 8000 });
  await page.waitForTimeout(500);
  await shot(page, name, '22-geprueft');
  await page.click('[data-hilfe]');
  await page.click('[data-los]');
  await page.waitForTimeout(350);
  await page.click('[data-hilfe]');
  await page.waitForTimeout(300);
  await shot(page, name, '23-hilfe2');
  await page.click('[data-hilfe]');
  await page.click('[data-hilfe]');
  await page.waitForTimeout(300);
  await shot(page, name, '24-hilfe4-aehnlich');
  await geben(page, sitzung.aufgaben[1], loesung(sitzung.aufgaben[1]));
  await page.click('[data-vergleichen], [data-ueberblick]', { force: true });
  await page.waitForSelector('.nz-karte.ende', { timeout: 10000 });
  await page.waitForTimeout(1500);
  await shot(page, name, '25-fertig');
  // Hilfe 2 und 3 je Format (Stufe 2, bis 100)
  for (const id of ALLE)
    for (const hilfe of [2, 3]) {
      await vorbereiten(page, hilfeSitzung(id, hilfe));
      await shot(page, name, `30-hilfe${hilfe}-${id}`);
    }
  // jedes Format: erste und letzte Aufgabe eines Probesatzes bis 100 (nur zwei Größen, sonst zu viele Bilder)
  if (name === '360x740' || name === '1280x800')
    for (const id of ALLE) {
      const plan = probeSatzPlan(id);
      await vorbereiten(page, neueSitzung(20261116, { zahlenraum: 100 }, [plan[0], plan[plan.length - 1]]));
      await shot(page, name, `40-format-${id}-stufe1`);
      await page.click('[data-slot="1"]');
      await page.waitForTimeout(450);
      await shot(page, name, `40-format-${id}-stufe${plan[plan.length - 1].stufe}`);
    }
  await page.close();
}
const page = await browser.newPage({ viewport: { width: 980, height: 900 } });
for (const sp of ['de', 'uk']) {
  await page.goto(`${url}#/stil?sprache=${sp}`);
  await page.waitForSelector('h1');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `screenshots/stil-${sp}.png`, fullPage: true });
}
await page.goto(url + '#/alle');
await page.waitForSelector('.alle-liste');
await page.screenshot({ path: 'screenshots/alle.png', fullPage: true });
await browser.close();
await server.close();
console.log('screenshots/ fertig');
