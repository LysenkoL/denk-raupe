import type { Antwort, Form } from '../perlen/antwort';
import { gleich } from '../perlen/antwort';
import { FORM_FARBEN, type FormFarbe } from '../design/farbe';
import { formPfad } from '../perlen/maler';
import type { Format } from './format';
import type { Zufall } from '../core/zufall';

/**
 * Muster (Reihe): eine Reihe aus Formen wiederholt sich – was kommt als Nächstes?
 * Stufe 1: AB. Stufe 2: ABC oder AAB. Stufe 3: drei Elemente, Form und Farbe wechseln unabhängig.
 * Das Muster ist immer mindestens zweimal ganz zu sehen; der Löser prüft, dass keine andere
 * Wiederholung zu einer anderen Antwort führt.
 */
export interface Element {
  form: Form;
  farbe: FormFarbe;
}
export interface Muster {
  reihe: Element[];
  /** Länge der Wiederholung (nur für Hilfe und Lernbeispiel; der Löser braucht sie nicht) */
  periode: number;
}

const FORMEN: Form[] = ['kreis', 'quadrat', 'dreieck', 'stern', 'raute'];
const FARBEN: FormFarbe[] = ['rot', 'blau', 'gelb', 'gruen', 'lila'];

const gl = (a: Element, b: Element) => a.form === b.form && a.farbe === b.farbe;
const alsAntwort = (e: Element): Antwort => ({ art: 'form', form: e.form, farbe: e.farbe });

function einheit(z: Zufall, stufe: number): Element[] {
  const f = z.mischen(FORMEN);
  const c = z.mischen(FARBEN);
  if (stufe === 1) return [{ form: f[0], farbe: c[0] }, { form: f[1], farbe: c[1] }];
  if (stufe === 2) {
    if (z.zahl() < 0.5) return [0, 1, 2].map((i) => ({ form: f[i], farbe: c[i] }));
    const a = { form: f[0], farbe: c[0] };
    return [a, a, { form: f[1], farbe: c[1] }];
  }
  // Stufe 3: Form und Farbe passen nicht paarweise zusammen
  const formen = [f[0], f[1], f[z.ganz(0, 1)]];
  const farben = z.mischen([c[0], c[1], c[0]]);
  const e = formen.map((form, i) => ({ form, farbe: farben[i] }));
  return e;
}

/** kleinste Periode einer Reihe */
function periode(e: Element[]): number {
  for (let p = 1; p <= e.length; p++) if (e.every((x, i) => i < p || gl(x, e[i - p]))) return p;
  return e.length;
}

function erzeuge(z: Zufall, stufe: number): Muster {
  for (;;) {
    const u = einheit(z, stufe);
    const p = periode(u);
    if (p !== u.length) continue;
    const laenge = Math.max(5, 2 * p + z.ganz(0, p - 1));
    return { reihe: Array.from({ length: laenge }, (_, i) => u[i % p]), periode: p };
  }
}

/** Löser: jede Wiederholungslänge q, die zur sichtbaren Reihe passt und mindestens zweimal zu sehen ist */
function loesungen(m: Muster): Antwort[] {
  const r = m.reihe;
  const out: Antwort[] = [];
  for (let q = 1; q <= Math.floor(r.length / 2); q++) {
    if (!r.every((x, i) => i < q || gl(x, r[i - q]))) continue;
    const a = alsAntwort(r[r.length - q]);
    if (!out.some((o) => gleich(o, a))) out.push(a);
  }
  return out;
}

function wahl(m: Muster, z: Zufall): Antwort[] {
  const loesung = m.reihe[m.reihe.length - m.periode];
  const kandidaten: Element[] = [loesung];
  const dazu = (e: Element) => !kandidaten.some((k) => gl(k, e)) && kandidaten.push(e);
  m.reihe.forEach(dazu);
  // ähnliche Ablenker: gleiche Form in anderer Farbe, gleiche Farbe in anderer Form
  dazu({ form: loesung.form, farbe: z.eins(FARBEN.filter((c) => c !== loesung.farbe)) });
  dazu({ form: z.eins(FORMEN.filter((f) => f !== loesung.form)), farbe: loesung.farbe });
  return z.mischen(kandidaten.slice(0, 4)).map(alsAntwort);
}

const AB = 54;

function zeichne(m: Muster, o: { hilfe: number; gewaehlt: Antwort | null; vorrechnen?: boolean }): string {
  const n = m.reihe.length;
  const W = (n + 1) * AB + 8;
  const H = 80;
  let s = '';
  // Hilfe 2: Rahmen um die erste Wiederholung; Hilfe 3 / Vorrechnen: um jede ganze Wiederholung
  const rahmen = o.vorrechnen || o.hilfe >= 3 ? Math.floor(n / m.periode) : o.hilfe === 2 ? 1 : 0;
  for (let k = 0; k < rahmen; k++) {
    s += `<rect x="${4 + k * m.periode * AB + 2}" y="6" width="${m.periode * AB - 4}" height="${H - 12}" rx="12" fill="#FFF3B0" stroke="#E8B10E" stroke-width="3"/>`;
  }
  m.reihe.forEach((e, i) => (s += formPfad(e.form, 4 + i * AB + AB / 2, H / 2, 17, FORM_FARBEN[e.farbe])));
  const x = 4 + n * AB;
  const loesung = m.reihe[n - m.periode];
  const zeige = o.vorrechnen ? alsAntwort(loesung) : o.gewaehlt;
  s += `<rect x="${x + 4}" y="${H / 2 - 23}" width="${AB - 8}" height="46" rx="10" fill="#FDEEDC" stroke="#E8893A" stroke-width="3" stroke-dasharray="7 5"/>`;
  if (zeige?.art === 'form') s += formPfad(zeige.form, x + AB / 2, H / 2, 15, FORM_FARBEN[zeige.farbe]);
  else s += `<text x="${x + AB / 2}" y="${H / 2 + 9}" text-anchor="middle" font-size="26" font-weight="800" fill="#8A4B12">?</text>`;
  return `<svg class="aufgabe-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Muster">${s}</svg>`;
}

export const MUSTER: Format<Muster> = {
  id: 'muster',
  nr: 19,
  version: 1,
  bereich: 'muster',
  faehigkeit: 'M1',
  motor: 'reihe',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'wieGehtEsWeiter',
  stufen: 3,
  /** hängt nicht vom Zahlenraum ab: liest die Einstellung nicht */
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'wahl' }),
  wahl,
  zeichne,
  beispiele: () => {
    const u: Element[] = [
      { form: 'kreis', farbe: 'rot' },
      { form: 'quadrat', farbe: 'blau' },
    ];
    return [{ reihe: [u[0], u[1], u[0], u[1], u[0]], periode: 2 }];
  },
};
