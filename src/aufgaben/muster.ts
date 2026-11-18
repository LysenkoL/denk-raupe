import type { Antwort, Form } from '../perlen/antwort';
import { gleich } from '../perlen/antwort';
import { FORM_FARBEN, LATERNE, LATERNE_KANTE, type FormFarbe } from '../design/farbe';
import { formPfad } from '../perlen/maler';
import type { Format } from './format';
import type { Zufall } from '../core/zufall';

/**
 * Muster (Reihe): eine Reihe aus Formen wiederholt sich – was kommt als Nächstes?
 * Stufe 1: AB – zwei Elemente im Wechsel, jedes mit eigener Form und Farbe.
 * Stufe 2: schwerer wird die Länge der Wiederholung – ABC, oder AAB (ein Element doppelt).
 * Stufe 3: schwerer wird, wie viele Merkmale sich zugleich ändern – drei Elemente, Form und Farbe wechseln
 *          unabhängig voneinander (dieselbe Form in zwei Farben, dieselbe Farbe an zwei Formen).
 * Das Muster ist immer mindestens zweimal ganz zu sehen; der Löser prüft, dass keine andere
 * Wiederholung zu einer anderen Antwort führt – auch nicht, wenn das Kind nur auf ein Merkmal schaut.
 *
 * Hilfe auf dem Bild (docs/TZ.md, „Помощь“): Stufe 2 rahmt die erste Wiederholung ein; Stufe 3 rahmt jede
 * ganze Wiederholung und das angefangene Stück mit der Lücke – die Lücke bleibt leer, die Antwort setzt
 * das Kind selbst ein.
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

/**
 * Geschlossene Liste der Merkmale, nach denen das Kind die Reihe lesen kann (docs/FORMATE.md, Abschnitt 3,
 * Regel 3): Form und Farbe. Der Löser geht jedes einzeln durch und das ganze Element.
 */
export const MERKMALE = ['form', 'farbe'] as const;
type Merkmal = (typeof MERKMALE)[number];

const gl = (a: Element, b: Element) => MERKMALE.every((k) => a[k] === b[k]);
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

/**
 * Fortsetzung einer Folge: jede Wiederholungslänge q, die zur ganzen sichtbaren Folge passt und mindestens
 * zweimal zu sehen ist (q ≤ halbe Länge), sagt das nächste Glied voraus. Alle Vorhersagen, ohne Doppelte.
 */
function weiter<T>(folge: T[], gleich: (a: T, b: T) => boolean): T[] {
  const out: T[] = [];
  for (let q = 1; q <= Math.floor(folge.length / 2); q++) {
    if (!folge.every((x, i) => i < q || gleich(x, folge[i - q]))) continue;
    const v = folge[folge.length - q];
    if (!out.some((o) => gleich(o, v))) out.push(v);
  }
  return out;
}

/**
 * Löser (liest `periode` nicht): (1) die ganze Reihe als Folge von Elementen; (2) jedes Merkmal für sich –
 * die Formen allein und die Farben allein, jede Kombination der Vorhersagen ist eine Antwort.
 * Alle Antworten aus (1) und (2) zusammen. Mehrdeutig oder ohne Antwort → die Aufgabe wird verworfen.
 */
function loesungen(m: Muster): Antwort[] {
  const r = m.reihe;
  const ganz = weiter(r, gl);
  const jeMerkmal = MERKMALE.map((k: Merkmal) => weiter(r.map((e) => e[k]), (a, b) => a === b));
  const getrennt: Element[] = [];
  for (const form of jeMerkmal[0] as Form[]) for (const farbe of jeMerkmal[1] as FormFarbe[]) getrennt.push({ form, farbe });
  const out: Antwort[] = [];
  for (const e of [...ganz, ...getrennt]) {
    const a = alsAntwort(e);
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

/** Bereiche der Rahmen in Hilfe 2 und 3: [erstes Element, Zahl der Elemente]; das letzte Stück schließt die Lücke ein */
export function rahmenVon(m: Muster, hilfe: number): [number, number][] {
  const n = m.reihe.length;
  const p = m.periode;
  if (hilfe === 2) return [[0, p]];
  if (hilfe < 3) return [];
  const ganze = Math.floor(n / p);
  const out: [number, number][] = Array.from({ length: ganze }, (_, k) => [k * p, p] as [number, number]);
  // angefangene Wiederholung samt Lücke (Stelle n): so lang wie das Stück, das schon da ist, plus eins
  out.push([ganze * p, n - ganze * p + 1]);
  return out;
}

/**
 * `hilfe` 2: warmer Rahmen um die erste Wiederholung (data-hilfe="teil").
 * `hilfe` 3: dazu Rahmen um jede weitere ganze Wiederholung und gestrichelt um das angefangene Stück mit
 * der Lücke (data-hilfe="schritt"); die Lücke bleibt „?“.
 * `vorrechnen`: Rahmen um jede ganze Wiederholung, in der Lücke steht die Lösung.
 */
function zeichne(m: Muster, o: { hilfe: number; gewaehlt: Antwort | null; vorrechnen?: boolean }): string {
  const n = m.reihe.length;
  const W = (n + 1) * AB + 8;
  const H = 80;
  let s = '';
  const rahmen: [number, number][] = o.vorrechnen
    ? Array.from({ length: Math.floor(n / m.periode) }, (_, k) => [k * m.periode, m.periode])
    : rahmenVon(m, o.hilfe);
  rahmen.forEach(([von, laenge], k) => {
    const offen = !o.vorrechnen && o.hilfe >= 3 && k === rahmen.length - 1;
    // der erste Rahmen ist der von Stufe 2; was Stufe 3 dazulegt, ist der Schritt
    const art = !o.vorrechnen && o.hilfe >= 3 && k > 0 ? 'schritt' : 'teil';
    s += `<rect data-hilfe="${art}" x="${4 + von * AB + 2}" y="6" width="${laenge * AB - 4}" height="${H - 12}" rx="12" fill="${offen ? 'none' : LATERNE}" stroke="${LATERNE_KANTE}" stroke-width="3"${offen ? ' stroke-dasharray="8 6"' : ''}/>`;
  });
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
  /**
   * Lernbeispiel: (1) immer dasselbe – eine Form, ein Blick; (2) zwei Formen im Wechsel, dreimal ganz zu
   * sehen; (3) gewöhnliche Aufgabe der Stufe 1 (AB, Länge 5).
   */
  beispiele: () => {
    const e = (form: Form, farbe: FormFarbe): Element => ({ form, farbe });
    const a = e('kreis', 'rot');
    const [b, c] = [e('dreieck', 'gelb'), e('quadrat', 'blau')];
    const [d, f] = [e('stern', 'gruen'), e('kreis', 'lila')];
    return [
      { reihe: [a, a, a, a], periode: 1 },
      { reihe: [b, c, b, c, b, c], periode: 2 },
      { reihe: [d, f, d, f, d], periode: 2 },
    ];
  },
};
