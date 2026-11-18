// Screenshots des Satz-Bildschirms und der Musterseite auf Telefon und Tablet.
// Aufruf: npm run screenshots  → Ordner screenshots/ (nicht im Repo)
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';

const GERAETE = [
  ['telefon-hoch', 360, 740],
  ['telefon-quer', 740, 360],
  ['tablet-hoch', 800, 1280],
  ['tablet-quer', 1280, 800],
];

mkdirSync('screenshots', { recursive: true });
const server = await createServer({ logLevel: 'silent', server: { port: 0, host: '127.0.0.1' } });
await server.listen();
const url = server.resolvedUrls.local[0];
const { neueSitzung, neuesProfil, PROBE_FORMATE } = await server.ssrLoadModule('/src/satz/sitzung.ts');
const { FORMATE } = await server.ssrLoadModule('/src/aufgaben/index.ts');
const { gleich } = await server.ssrLoadModule('/src/perlen/antwort.ts');
const { lernbeispiel } = await server.ssrLoadModule('/src/aufgaben/format.ts');
const browser = await chromium.launch();

const sitzung = neueSitzung(20261115);
const loesung = (i) => FORMATE[sitzung.aufgaben[i].format].loesungen(sitzung.aufgaben[i].bedingung)[0];
const falsch = (i) => {
  const a = sitzung.aufgaben[i];
  const l = loesung(i);
  return a.wahl ? a.wahl.find((w) => !gleich(w, l)) : { art: 'zahl', wert: (l.wert + 1) % 100 };
};

/** `bekannt`: alle Formate bekannt (kein Lernbeispiel von selbst); sonst alle neu */
async function vorbereiten(page, bekannt = true) {
  // Musterseite fasst den Speicher nicht an – sonst könnte die App beim ersten Laden einen eigenen Satz speichern
  await page.goto(url + '#/stil');
  await page.evaluate(
    ([s, p]) =>
      new Promise((ok) => {
        const req = indexedDB.open('denk-raupe', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('kv');
        req.onsuccess = () => {
          const tx = req.result.transaction('kv', 'readwrite');
          tx.objectStore('kv').put(s, 'sitzung');
          tx.objectStore('kv').put(p, 'profil');
          tx.oncomplete = () => (req.result.close(), ok());
        };
      }),
    [sitzung, { ...neuesProfil(), ton: false, formate: bekannt ? Object.fromEntries(PROBE_FORMATE.map((id) => [id, 'bekannt'])) : {} }],
  );
  await page.goto(url + '#/');
  await page.reload();
  await page.waitForSelector('.perle');
  await page.evaluate(() => document.fonts.ready);
}

async function eingeben(page, i, antwort) {
  await page.click(`.perle[data-i="${i}"]`);
  const a = sitzung.aufgaben[i];
  const art = FORMATE[a.format].eingabe(a.bedingung).art;
  if (art === 'zahl') {
    while (await page.isEnabled('[data-ziffer="x"]')) await page.click('[data-ziffer="x"]');
    for (const d of String(antwort.wert)) await page.click(`[data-ziffer="${d}"]`);
  } else {
    const k = a.wahl.findIndex((w) => gleich(w, antwort));
    await page.click(art === 'wahl' ? `.wahl button[data-k="${k}"]` : `[data-wahl="${k}"]`);
  }
}

/** im Lernbeispiel die richtige oder eine falsche Antwort tippen */
async function lernTippen(page, a, richtig) {
  const f = FORMATE[a.format];
  const l = f.loesungen(a.bedingung)[0];
  const antwort = richtig ? l : a.wahl ? a.wahl.find((w) => !gleich(w, l)) : { art: 'zahl', wert: (l.wert + 1) % 10 };
  if (f.eingabe(a.bedingung).art === 'zahl') for (const d of String(antwort.wert)) await page.click(`.lern [data-ziffer="${d}"]`);
  else {
    const k = a.wahl.findIndex((w) => gleich(w, antwort));
    await page.click(f.eingabe(a.bedingung).art === 'wahl' ? `.lern .wahl button[data-k="${k}"]` : `.lern [data-wahl="${k}"]`);
  }
}

for (const [name, w, h] of GERAETE) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await vorbereiten(page, false);
  await page.screenshot({ path: `screenshots/${name}-lernbeispiel.png` });
  // Lernbeispiel: richtig („Genau so!“), dann im zweiten Schritt falsch („Schau noch einmal.“, Hilfe Stufe 2)
  const schritte = lernbeispiel(FORMATE[sitzung.aufgaben[0].format]);
  await lernTippen(page, schritte[0], true);
  await page.screenshot({ path: `screenshots/${name}-lernbeispiel-genau.png` });
  await page.click('.lern-weiter');
  await lernTippen(page, schritte[1], false);
  await page.screenshot({ path: `screenshots/${name}-lernbeispiel-falsch.png` });
  await vorbereiten(page);
  await eingeben(page, 0, loesung(0));
  await page.screenshot({ path: `screenshots/${name}-teil.png` });
  await eingeben(page, 1, falsch(1));
  await eingeben(page, 2, loesung(2));
  await page.click('.vergleichen');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `screenshots/${name}-geprueft.png` });
  await page.click('.hilfe-knopf');
  // Stufe 1 öffnet das Lernbeispiel, „Los geht's“ führt zurück; Stufe 2 zeigt das Zeichen „So geht's“
  await page.click('.los');
  await page.click('.hilfe-knopf');
  await page.screenshot({ path: `screenshots/${name}-hilfe.png`, fullPage: true });
  await eingeben(page, 1, loesung(1));
  await page.click('.vergleichen');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `screenshots/${name}-fertig.png` });
  await page.close();
}
const page = await browser.newPage({ viewport: { width: 980, height: 900 } });
for (const sp of ['de', 'uk']) {
  await page.goto(`${url}#/stil?sprache=${sp}`);
  await page.waitForSelector('h1');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `screenshots/stil-${sp}.png`, fullPage: true });
}
await browser.close();
await server.close();
console.log('screenshots/ fertig');
