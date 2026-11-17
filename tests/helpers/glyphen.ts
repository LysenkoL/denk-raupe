import { resolve } from 'node:path';
// fontkit hat keine Typen (siehe tests/fontkit.d.ts)
import * as fontkit from 'fontkit';

/**
 * Umriss eines Textes in Inter ExtraBold (cv05, cv11) als Punktfolgen in SVG-Koordinaten –
 * so, wie der Browser ihn mit text-anchor="middle" setzt. Für Tests, die prüfen, was auf der Schrift liegt.
 */
const font = fontkit.openSync(resolve(__dirname, '../../src/fonts/Inter-ExtraBold.woff2'));

type P = [number, number];

/** Textumriss; `breite` = textLength (gestaucht/gedehnt wie lengthAdjust="spacingAndGlyphs") */
export function textUmriss(text: string, fs: number, mitteX: number, grundlinie: number, breite: number | null = null): P[][] {
  const run = font.layout(text, ['cv05', 'cv11']);
  const s = fs / font.unitsPerEm;
  const q = breite ? breite / (run.advanceWidth * s) : 1;
  const start = mitteX - (run.advanceWidth * s * q) / 2;
  const linien: P[][] = [];
  let x = 0;
  run.glyphs.forEach((g: { path: { commands: { command: string; args: number[] }[] } }, i: number) => {
    const pos = run.positions[i];
    const ox = x + pos.xOffset;
    const oy = pos.yOffset;
    const pkt = (px: number, py: number): P => [start + (ox + px) * s * q, grundlinie - (oy + py) * s];
    let akt: P[] = [];
    let last: [number, number] = [0, 0];
    const kurve = (pts: [number, number][]) => {
      // de Casteljau, fein genug für Abstände unter einer Einheit
      for (let t = 1; t <= 24; t++) {
        let ps = [last, ...pts];
        while (ps.length > 1) ps = ps.slice(1).map((p, k) => [ps[k][0] + (p[0] - ps[k][0]) * (t / 24), ps[k][1] + (p[1] - ps[k][1]) * (t / 24)] as [number, number]);
        akt.push(pkt(ps[0][0], ps[0][1]));
      }
      last = pts[pts.length - 1];
    };
    for (const c of g.path.commands) {
      const a = c.args;
      if (c.command === 'moveTo') {
        if (akt.length) linien.push(akt);
        akt = [pkt(a[0], a[1])];
        last = [a[0], a[1]];
      } else if (c.command === 'lineTo') {
        // gerade Strecken fein unterteilen, damit der Abstand zu jedem Punkt der Kante zählt
        for (let t = 1; t <= 24; t++) akt.push(pkt(last[0] + ((a[0] - last[0]) * t) / 24, last[1] + ((a[1] - last[1]) * t) / 24));
        last = [a[0], a[1]];
      } else if (c.command === 'quadraticCurveTo') kurve([[a[0], a[1]], [a[2], a[3]]]);
      else if (c.command === 'bezierCurveTo') kurve([[a[0], a[1]], [a[2], a[3]], [a[4], a[5]]]);
      else if (c.command === 'closePath' && akt.length) {
        akt.push(akt[0]);
        linien.push(akt);
        akt = [];
      }
    }
    if (akt.length) linien.push(akt);
    x += pos.xAdvance;
  });
  return linien;
}

/** liegt der Punkt in der Schrift? (Nonzero-Regel wie bei TrueType/CFF) */
export function inSchrift(linien: P[][], [px, py]: P): boolean {
  let w = 0;
  for (const l of linien)
    for (let i = 0; i + 1 < l.length; i++) {
      const [x1, y1] = l[i];
      const [x2, y2] = l[i + 1];
      if (y1 <= py && y2 > py && (x2 - x1) * (py - y1) - (px - x1) * (y2 - y1) > 0) w++;
      else if (y1 > py && y2 <= py && (x2 - x1) * (py - y1) - (px - x1) * (y2 - y1) < 0) w--;
    }
  return w !== 0;
}
