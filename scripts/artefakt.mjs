// Baut die App als EINE HTML-Datei (Schriften, Bilder, Code eingebettet) – zum Ausprobieren
// ohne Installation, z. B. als Seite in Claude. Aufruf: npm run artefakt -- <Zieldatei>
import { build } from 'vite';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ziel = process.argv[2] ?? 'dist-artefakt/denk-raupe.html';
// zweites Argument: Startseite, z. B. `neu` – der neue Satzbildschirm statt des alten
if (process.argv[3]) process.env.VITE_START = process.argv[3];
const out = 'dist-artefakt/bau';
await build({
  logLevel: 'warn',
  build: { outDir: out, emptyOutDir: true, assetsInlineLimit: 100_000_000, cssCodeSplit: false, modulePreload: false },
});

const assets = join(out, 'assets');
const dateien = readdirSync(assets);
const js = dateien.filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(assets, f), 'utf8')).join('\n');
const css = dateien.filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(assets, f), 'utf8')).join('\n');
const rest = dateien.filter((f) => !/\.(js|css)$/.test(f));
if (rest.length) throw new Error(`nicht eingebettet: ${rest.join(', ')}`);

// Seiteninhalt ohne <html>/<head>/<body> (die Seite wird beim Veröffentlichen damit umschlossen)
const html = `<meta charset="utf-8">
<title>Denk-Raupe Probe</title>
<meta name="theme-color" content="#FDFBF4">
<style>${css}</style>
<div id="app"></div>
<script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>
`;
writeFileSync(ziel, html);
console.log(`${ziel}: ${(html.length / 1024).toFixed(0)} KB`);
