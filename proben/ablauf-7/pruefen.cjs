// Проверка пробы на 12 размерах: проходит весь набор, снимает кадры и меряет раскладку.
// Запуск: NODE_PATH=$(npm root -g) node proben/ablauf-7/pruefen.cjs <проба.html> <папка кадров> [тема] ['[[w,h],…]']
const { chromium } = require('playwright');
const thema = process.argv[4] || 'sonnig';
const f = 'file://' + process.argv[2] + '#thema=' + thema, out = process.argv[3];
const groessen = process.argv[5] ? JSON.parse(process.argv[5]) : [
  [360,740],[360,800],[412,800],[600,960],[800,1280],[943,1500],   // телефоны и планшеты вертикально
  [740,360],[915,412],[1280,800],[1000,700],                       // телефоны и планшеты горизонтально
  [1000,1000],[1920,1080]];                                        // компьютер (для просмотра пробы)
// Замеры: прокрутка, вылет за экран, кнопки меньше нормы, заполнение доски заданием
function messen(name) {
  const r = e => e.getBoundingClientRect(), W = innerWidth, H = innerHeight, fehler = [];
  if (document.documentElement.scrollHeight > H + 1 || document.documentElement.scrollWidth > W + 1) fehler.push('прокрутка');
  document.querySelectorAll('.app button, .app [data-raupe]').forEach(b => {
    if (!b.offsetParent && b.tagName === 'BUTTON' || b.closest('.autor, [hidden]')) return;
    const q = r(b); if (q.width === 0) return;
    if (q.right > W + 1 || q.bottom > H + 1 || q.left < -1 || q.top < -1) fehler.push('за экраном: ' + ((b.className.baseVal ?? b.className) || b.tagName));
    const t = b.querySelector('.treffer'), z = t ? r(t) : q, cls = String(b.className.baseVal ?? b.className).split(' ')[0] || 'raupe';
    const norm = /rund|laterne/.test(cls) ? 56 : /abgabe/.test(cls) ? 56 : 44;
    if (Math.min(z.width, z.height) < norm - .5) fehler.push(`${cls} ${Math.round(z.width)}×${Math.round(z.height)} < ${norm}`);
  });
  const pa = document.querySelector('.papier:not(.voll)'), bild = document.querySelector('#bild svg, .bild .ordnen, .bild .muster-gross');
  let fuell = '';
  if (pa && bild) {
    const kinder = [...bild.querySelectorAll('rect, circle, text, g[data-raupe], .oslot, .vorlage, .ziel')].map(r).filter(q => q.width > 3);
    if (kinder.length) {
      const l = Math.min(...kinder.map(q => q.left)), t = Math.min(...kinder.map(q => q.top)), rr = Math.max(...kinder.map(q => q.right)), b = Math.max(...kinder.map(q => q.bottom));
      const p = r(pa); fuell = Math.round(100 * (rr - l) * (b - t) / (p.width * p.height)) + '%';
    }
  }
  return name + (fuell ? ' доска ' + fuell : '') + (fehler.length ? ' ⚠ ' + [...new Set(fehler)].join('; ') : '');
}
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [w,h] of groessen) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); const zeilen = [];
    p.on('pageerror', e => errs.push(w+'x'+h+': '+e.message));
    await p.goto(f); await p.waitForTimeout(500);
    const shot = async n => { await p.screenshot({ path: `${out}/${w}x${h}-${n}.png` }); zeilen.push(await p.evaluate(messen, n)); };
    const tap = async (s, ms=450) => { await p.click(s,{force:true}); await p.waitForTimeout(ms); };
    await shot('0-intro');
    await tap('[data-ik="1"]', 500); await tap('[data-abgabe]', 2600);
    await tap('[data-iziffer="2"]'); await shot('1-intro-zahl'); await tap('[data-iziffer="4"]'); await tap('[data-abgabe]', 2700);
    await tap('[data-ziffer="8"]', 500); await shot('2-zahl');
    await tap('[data-hilfe]', 400); await shot('2b-hilfe'); await tap('[data-hilfe]', 300);
    await tap('[data-abgabe]', 1300); await tap('[data-k="1"]', 500); await shot('3-wahl');
    await tap('[data-abgabe]', 1300); await tap('[data-raupe="5"]', 500); await shot('4-wer');
    await tap('[data-abgabe]', 1800);
    for (const k of [2,4,6]) await tap(`[data-bkarte="${k}"]`, 350); await p.waitForTimeout(400); await tap('[data-abgabe]', 2400);
    for (const k of [1,5,8]) await tap(`[data-bkarte="${k}"]`, 350); await p.waitForTimeout(400); await tap('[data-abgabe]', 2400);
    for (const k of [3,5,7]) await tap(`[data-karte="${k}"]`, 350); await p.waitForTimeout(400); await shot('5-ordnen');
    await tap('[data-abgabe]', 1300); await tap('[data-ziffer="4"]', 500); await tap('[data-abgabe]', 1300);
    await tap('[data-k="1"]', 500); await tap('[data-abgabe]', 1400);
    await shot('5b-bereit');
    await tap('[data-vergleichen]', 1700); await shot('6-vergleich'); await p.waitForTimeout(3000); await shot('7-ende');
    await tap('[data-stub="welt"]', 400); await shot('8-platzhalter'); await tap('[data-weiter]', 300);
    console.log(`${w}x${h}: ` + zeilen.join(' | '));
    await p.close();
  }
  console.log(errs.join('\n') || 'JS: keine Fehler'); await b.close();
})();
