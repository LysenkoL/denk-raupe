const { chromium } = require('playwright');
const f = 'file://' + process.argv[2], out = process.argv[3];
const groessen = process.argv[4] ? JSON.parse(process.argv[4]) : [[360,740],[412,800],[740,360],[943,1500],[1000,1000],[1280,800],[800,1280],[1920,1080],[1000,700]];
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [w,h] of groessen) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    p.on('pageerror', e => errs.push(w+': '+e.message));
    await p.goto(f); await p.waitForTimeout(400);
    const shot = n => p.screenshot({ path: `${out}/${w}x${h}-${n}.png` });
    const tap = async (s, ms=450) => { await p.click(s,{force:true}); await p.waitForTimeout(ms); };
    await shot('0-intro');
    await tap('[data-ik="1"]', 500); await tap('[data-abgabe]', 2600);
    await tap('[data-iziffer="2"]'); await shot('1-intro-zahl'); await tap('[data-iziffer="4"]'); await tap('[data-abgabe]', 2700);
    await tap('[data-ziffer="8"]', 500); await shot('2-zahl');
    await tap('[data-abgabe]', 1300); await tap('[data-k="1"]', 500); await shot('3-wahl');
    await tap('[data-abgabe]', 1300); await tap('[data-raupe="5"]', 500); await shot('4-wer');
    await tap('[data-abgabe]', 1800);
    for (const k of [2,4,6]) await tap(`[data-bkarte="${k}"]`, 350); await p.waitForTimeout(400); await tap('[data-abgabe]', 2400);
    for (const k of [1,5,8]) await tap(`[data-bkarte="${k}"]`, 350); await p.waitForTimeout(400); await tap('[data-abgabe]', 2400);
    for (const k of [3,5,7]) await tap(`[data-karte="${k}"]`, 350); await p.waitForTimeout(400); await shot('5-ordnen');
    await tap('[data-abgabe]', 1300); await tap('[data-ziffer="4"]', 500); await tap('[data-abgabe]', 1300);
    await tap('[data-k="1"]', 500); await tap('[data-abgabe]', 1400);
    await tap('[data-vergleichen]', 1700); await shot('6-vergleich'); await p.waitForTimeout(3000); await shot('7-ende');
    await p.close();
  }
  console.log(errs.join('\n') || 'keine Fehler'); await b.close();
})();
