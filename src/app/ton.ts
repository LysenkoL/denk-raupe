/**
 * Spielgeräusche (docs/STIL.md, Abschnitt 10), im Code erzeugt mit Web Audio – keine Tondateien, keine
 * fremden Lizenzen, keine Stimme (docs/TZ.md). Leise und warm: kurze Hüllkurven, weiche Filter, alles über
 * einen gemeinsamen Regler mit Begrenzer. Abschaltbar (Profil, Tonknopf).
 */
let ctx: AudioContext | null = null;
let ausgang: AudioNode | null = null;
let an = true;

/** Gesamtlautstärke: eher leise, das Kind spielt oft ohne Kopfhörer neben anderen */
const LAUT = 0.55;

export function tonAn(wert: boolean): void {
  an = wert;
}

function audio(): AudioContext | null {
  if (!an) return null;
  try {
    if (!ctx) {
      ctx = new AudioContext();
      const regler = ctx.createGain();
      regler.gain.value = LAUT;
      const begrenzer = ctx.createDynamicsCompressor();
      begrenzer.threshold.value = -18;
      begrenzer.ratio.value = 8;
      regler.connect(begrenzer).connect(ctx.destination);
      ausgang = regler;
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** ein Ton mit weichem Anschlag und Ausklang */
function ton(freq: number, dauer: number, o: { typ?: OscillatorType; lautst?: number; start?: number; gleiten?: number } = {}): void {
  const a = audio();
  if (!a || !ausgang) return;
  const t = a.currentTime + (o.start ?? 0);
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = o.typ ?? 'sine';
  osc.frequency.setValueAtTime(freq, t);
  if (o.gleiten) osc.frequency.exponentialRampToValueAtTime(freq * o.gleiten, t + dauer);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(o.lautst ?? 0.08, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
  osc.connect(g).connect(ausgang);
  osc.start(t);
  osc.stop(t + dauer + 0.03);
}

/** kurzes gefiltertes Rauschen (Holz, Blatt) */
function rauschen(dauer: number, filter: BiquadFilterType, freq: number, lautst: number, q = 0.8, start = 0): void {
  const a = audio();
  if (!a || !ausgang) return;
  const t = a.currentTime + start;
  const buf = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * dauer)), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2;
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = filter;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = a.createGain();
  g.gain.value = lautst;
  src.connect(f).connect(g).connect(ausgang);
  src.start(t);
}

/**
 * Perle: kurzer warmer Klick von Holz auf Glas. Die Höhe hängt von der Ziffer ab (Einer der Zahl;
 * andere Perlen in der Mitte) – eine kleine Tonleiter, nie schrill.
 */
export function perleTon(ziffer: number | null = null): void {
  const stufen = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16];
  const halbton = ziffer === null ? 7 : stufen[((ziffer % 10) + 10) % 10];
  const f = 523 * 2 ** (halbton / 12);
  rauschen(0.025, 'bandpass', 1800, 0.12, 1.2);
  ton(f, 0.16, { lautst: 0.07 });
  ton(f * 2.01, 0.07, { lautst: 0.02 });
}

/** Teil ins Nest: weicher Holzklopfer */
export function setzenTon(): void {
  ton(190, 0.09, { lautst: 0.1, gleiten: 0.7 });
  rauschen(0.04, 'lowpass', 900, 0.14);
}

/** Knopf: gedämpfter Klick */
export function knopfTon(): void {
  rauschen(0.02, 'lowpass', 1300, 0.12);
  ton(140, 0.05, { lautst: 0.06, gleiten: 0.8 });
}

/** Blatt hebt sich: kurzes Rascheln */
export function rascheln(): void {
  rauschen(0.16, 'bandpass', 2600, 0.07, 0.7);
  rauschen(0.12, 'highpass', 4200, 0.025, 0.7, 0.03);
}

/** goldenes Blatt: zwei reine Töne nacheinander */
export function goldTon(): void {
  ton(784, 0.22, { lautst: 0.06 });
  ton(1175, 0.3, { lautst: 0.05, start: 0.11 });
}

/** Blatt landet im Korb: leises Flechtwerk */
export function korbTon(): void {
  rauschen(0.06, 'bandpass', 700, 0.08, 1);
}

/** Buchstabe des Geheimworts: kurzes Glockenspiel */
export function buchstabeTon(): void {
  [1047, 1319, 1568].forEach((f, i) => ton(f, 0.35, { lautst: 0.035, start: i * 0.06 }));
}
