/**
 * Farbsehschwächen nach docs/PLAN.md, Anhang A: sRGB → linear RGB → Matrix → auf 0…1 begrenzen → CIE Lab (D65);
 * Abstand = ΔE76 (euklidisch in Lab).
 */
type M = [[number, number, number], [number, number, number], [number, number, number]];

export const MODELLE: Record<string, M> = {
  'Modell 1, Protanopie': [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  'Modell 1, Deuteranopie': [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  'Modell 2, Protanopie': [
    [0.11238, 0.88762, 0],
    [0.11238, 0.88762, 0],
    [0.00401, -0.00401, 1],
  ],
  'Modell 2, Deuteranopie': [
    [0.29275, 0.70725, 0],
    [0.29275, 0.70725, 0],
    [-0.02234, 0.02234, 1],
  ],
};

function linear(h: string): [number, number, number] {
  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return [1, 3, 5].map((i) => lin(parseInt(h.slice(i, i + 2), 16) / 255)) as [number, number, number];
}

function labAusLinear([r, g, b]: [number, number, number]): [number, number, number] {
  const X = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const Y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const Z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const t = (v: number) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
  return [116 * t(Y) - 16, 500 * (t(X) - t(Y)), 200 * (t(Y) - t(Z))];
}

export function simuliert(h: string, m: M): [number, number, number] {
  const c = linear(h);
  const k = (v: number) => Math.min(1, Math.max(0, v));
  return labAusLinear(m.map((z) => k(z[0] * c[0] + z[1] * c[1] + z[2] * c[2])) as [number, number, number]);
}

export function deltaE76(a: [number, number, number], b: [number, number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
