import { FORM_FARBEN, HUNDERT_FARBE, NEUTRAL_PERLE, ZIFFER_FARBEN, schriftAuf } from '../design/farbe';
import type { Antwort, Form, Sammelzeichen } from './antwort';

/**
 * Wie eine Perle aussieht – reine Beschreibung ohne SVG, damit sie testbar ist.
 * Maße relativ zum Perlenradius r.
 */
export interface PerlenBild {
  /** Breite in r (2 = rund); breiter = Kapsel für längere Texte */
  breite: number;
  fuellung: string;
  /** Ring in der Farbe der Zehner (nur zweistellige Zahlen) */
  ring: string | null;
  inhalt:
    | { typ: 'text'; text: string; schrift: string; saum: string; groesse: number; /** Text auf diese Breite (in r) gestaucht */ maxBreite: number | null }
    | { typ: 'form'; form: Form; farbe: string; klein: boolean }
    | { typ: 'zeichen'; zeichen: Sammelzeichen };
  /** Vorlesbarer Name (für Screenreader, nicht für das Kind) */
  name: string;
}

/** ungefähre Breite einer Ziffer/eines Buchstabens in Inter ExtraBold, in em */
const ZEICHEN_EM = 0.62;
const KAPSEL_MAX = 4.4;
const RAND = 0.9;

function text(text: string, fuellung: string, groesse: number, name: string): PerlenBild {
  const { schrift, saum } = schriftAuf(fuellung);
  const zeichen = [...text].length;
  const textBreite = zeichen * ZEICHEN_EM * groesse;
  // passt der Text in den Kreis (Sehne bei ~1.6 r), bleibt die Perle rund, sonst wird sie zur Kapsel
  if (textBreite <= 1.6) return { breite: 2, fuellung, ring: null, inhalt: { typ: 'text', text, schrift, saum, groesse, maxBreite: null }, name };
  const breite = Math.min(KAPSEL_MAX, textBreite + RAND);
  const maxBreite = textBreite + RAND > KAPSEL_MAX ? KAPSEL_MAX - RAND : null;
  return { breite, fuellung, ring: null, inhalt: { typ: 'text', text, schrift, saum, groesse, maxBreite }, name };
}

/** Farbe der Zahlenperle: Füllung = Einer, Ring = Zehner; 100 eigene Farbe */
export function zahlFarben(n: number): { fuellung: string; ring: string | null } {
  if (!Number.isInteger(n) || n < 0 || n > 100) throw new Error(`Zahlenperle nur 0–100, nicht ${n}`);
  if (n === 100) return { fuellung: HUNDERT_FARBE, ring: null };
  if (n < 10) return { fuellung: ZIFFER_FARBEN[n], ring: null };
  return { fuellung: ZIFFER_FARBEN[n % 10], ring: ZIFFER_FARBEN[Math.floor(n / 10)] };
}

const FORM_NAMEN: Record<Form, string> = { kreis: 'Kreis', quadrat: 'Quadrat', dreieck: 'Dreieck', raute: 'Raute', stern: 'Stern' };
const ZEICHEN_NAMEN: Record<Sammelzeichen, string> = {
  reihe: 'Reihenfolge',
  gitter: 'Gitter',
  paar: 'Paar',
  bau: 'Bau',
  ansicht: 'Ansicht',
  satz: 'Satz',
};

export function zeit(stunde: number, minute: number): string {
  return `${stunde}:${String(minute).padStart(2, '0')}`;
}

export function geld(cent: number): string {
  const euro = Math.floor(cent / 100);
  const rest = cent % 100;
  return rest === 0 ? `${euro} €` : `${euro},${String(rest).padStart(2, '0')} €`;
}

export function perlenBild(a: Antwort): PerlenBild {
  switch (a.art) {
    case 'zahl': {
      const { fuellung, ring } = zahlFarben(a.wert);
      const stellen = String(a.wert).length;
      const groesse = stellen === 1 ? 1.05 : stellen === 2 ? (ring ? 0.8 : 0.9) : 0.68;
      const { schrift, saum } = schriftAuf(fuellung);
      return { breite: 2, fuellung, ring, inhalt: { typ: 'text', text: String(a.wert), schrift, saum, groesse, maxBreite: null }, name: String(a.wert) };
    }
    case 'buchstabe':
      return text(a.wert, NEUTRAL_PERLE, 1.0, a.wert);
    case 'artikel':
      return text(a.wert, NEUTRAL_PERLE, 0.72, a.wert);
    case 'wort':
      return text(a.wert, NEUTRAL_PERLE, 0.72, a.wert);
    case 'zeit':
      return text(zeit(a.stunde, a.minute), NEUTRAL_PERLE, 0.72, zeit(a.stunde, a.minute) + ' Uhr');
    case 'geld':
      return text(geld(a.cent), NEUTRAL_PERLE, 0.72, geld(a.cent));
    case 'laenge':
      return text(`${a.cm} cm`, NEUTRAL_PERLE, 0.72, `${a.cm} cm`);
    case 'form':
      return {
        breite: 2,
        fuellung: NEUTRAL_PERLE,
        ring: null,
        inhalt: { typ: 'form', form: a.form, farbe: FORM_FARBEN[a.farbe], klein: !!a.klein },
        name: `${a.klein ? 'kleines ' : ''}${FORM_NAMEN[a.form]}`,
      };
    case 'sammel':
      return { breite: 2, fuellung: NEUTRAL_PERLE, ring: null, inhalt: { typ: 'zeichen', zeichen: a.zeichen }, name: ZEICHEN_NAMEN[a.zeichen] };
  }
}
