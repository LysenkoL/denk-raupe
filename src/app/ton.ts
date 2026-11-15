/**
 * Spielgeräusche, im Code erzeugt (keine Tondateien, keine fremden Lizenzen). Abschaltbar.
 * Keine Stimme (docs/TZ.md).
 */
let ctx: AudioContext | null = null;
let an = true;

export function tonAn(wert: boolean): void {
  an = wert;
}

function audio(): AudioContext | null {
  if (!an) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function klang(freq: number, dauer: number, typ: OscillatorType = 'sine', lautst = 0.15, start = 0): void {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + start;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = typ;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(lautst, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dauer + 0.02);
}

/** Perle einfädeln: kurzes „Klick“ */
export function klick(): void {
  klang(880, 0.08, 'triangle', 0.12);
}

/** Blatt raschelt (gefiltertes Rauschen) */
export function rascheln(): void {
  const a = audio();
  if (!a) return;
  const dauer = 0.25;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dauer), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 3200;
  const g = a.createGain();
  g.gain.value = 0.18;
  src.connect(f).connect(g).connect(a.destination);
  src.start();
}

/** Blatt hebt sich: kleiner Aufwärtston */
export function heben(gold: boolean): void {
  klang(gold ? 784 : 660, 0.18, 'sine', 0.12);
  klang(gold ? 1175 : 990, 0.22, 'sine', 0.1, 0.08);
}

/** Satz fertig: kurze Tonfolge */
export function fertigTon(): void {
  [523, 659, 784, 1047].forEach((f, i) => klang(f, 0.25, 'triangle', 0.1, i * 0.1));
}
