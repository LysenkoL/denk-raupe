import { FORM_FARBEN } from '../design/farbe';
import { formPfad } from '../perlen/maler';
import { gleich, type Antwort } from '../perlen/antwort';
import { KIND } from '../i18n/kind';

/**
 * Allgemeines Beispiel der Geste (docs/STIL.md, „Управление набором — одна стеклянная бусина“, „Учебный пример“):
 * einmal, vor der allerersten Aufgabe. Zwei Schritte, beide mit stehendem Finger:
 * (1) aus drei großen, verschiedenen Bildern das Gleiche wählen – Finger auf dem Bild, dann auf der Perle;
 * (2) eine zweistellige Zahl nach Vorlage – Finger auf die erste Ziffer, auf die zweite, erst dann auf die Perle.
 * Reine Daten und Regeln; zeichnen und bewegen tut der Satzbildschirm.
 */

export interface GestenSchritt {
  art: 'wahl' | 'zahl';
  auftrag: string;
  vorlage: Antwort;
  /** bei 'wahl': drei Bilder, genau eins gleich der Vorlage */
  wahl: Antwort[] | null;
}

export const GESTE: readonly GestenSchritt[] = [
  {
    art: 'wahl',
    auftrag: KIND.geste.gleich,
    vorlage: { art: 'form', form: 'stern', farbe: 'gelb' },
    wahl: [
      { art: 'form', form: 'kreis', farbe: 'rot' },
      { art: 'form', form: 'stern', farbe: 'gelb' },
      { art: 'form', form: 'dreieck', farbe: 'blau' },
    ],
  },
  { art: 'zahl', auftrag: KIND.geste.zahl, vorlage: { art: 'zahl', wert: 12 }, wahl: null },
];

/** sofortige Rückmeldung wie im Lernbeispiel: richtig, falsch oder offen (noch nichts abgeschickt) */
export function gestePruefen(k: number, antwort: Antwort | null): 'richtig' | 'falsch' | 'offen' {
  if (!antwort) return 'offen';
  return gleich(GESTE[k].vorlage, antwort) ? 'richtig' : 'falsch';
}

/** wohin der Finger gerade zeigt */
export type FingerZiel = { art: 'wahl'; k: number } | { art: 'ziffer'; d: number } | { art: 'loeschen' } | { art: 'abgabe' };

/**
 * Ziel des Fingers im Schritt `k` beim Entwurf `entwurf`: erst auf das, was zu tippen ist, dann auf die Perle.
 * Bei der Zahl: die nächste fehlende Ziffer; passt der Entwurf nicht mehr zur Vorlage, auf „Löschen“.
 */
export function fingerZiel(k: number, entwurf: Antwort | null): FingerZiel {
  const s = GESTE[k];
  if (gleich(entwurf, s.vorlage)) return { art: 'abgabe' };
  if (s.art === 'wahl') return { art: 'wahl', k: s.wahl!.findIndex((w) => gleich(w, s.vorlage)) };
  const ziel = String((s.vorlage as { wert: number }).wert);
  const da = entwurf?.art === 'zahl' ? String(entwurf.wert) : '';
  if (!ziel.startsWith(da)) return { art: 'loeschen' };
  return { art: 'ziffer', d: Number(ziel[da.length]) };
}

/** Bild des Schritts auf dem Brett: die Vorlage groß auf einem Teller (Zahl als Ziffern, Form als Form) */
export function gesteBild(k: number): string {
  const v = GESTE[k].vorlage;
  const teller = '<rect x="20" y="10" width="260" height="180" rx="36" fill="#fff" stroke="#E6D8B8" stroke-width="5"/>';
  if (v.art === 'form') {
    const c = FORM_FARBEN[v.farbe];
    return `<svg viewBox="0 0 300 200" role="img" aria-label="Vorlage">${teller}${formPfad(v.form, 150, 102, 70, c)}</svg>`;
  }
  const wert = (v as { wert: number }).wert;
  return `<svg viewBox="0 0 300 200" role="img" aria-label="${wert}">${teller}<text x="150" y="140" text-anchor="middle" font-size="130" font-weight="800" fill="#23305E" font-family="inherit">${wert}</text></svg>`;
}
