import { describe, expect, it } from 'vitest';
import { HUNDERT_FARBE, KONTUR, NEUTRAL_PERLE, ZIFFER_FARBEN, kontrast } from '../src/design/farbe';
import { perlenBild, zahlFarben, geld } from '../src/perlen/perle';
import { gleich, type Antwort } from '../src/perlen/antwort';

describe('Ziffernfarben (docs/TZ.md)', () => {
  it('zehn feste Farben für 0–9, alle verschieden', () => {
    expect(ZIFFER_FARBEN).toEqual(['#EEF1F4', '#FF4D6D', '#FF9F1C', '#FFD23F', '#A3D93B', '#3BC14A', '#22C3A6', '#2EC4F0', '#3A86FF', '#5B5BF0']);
    expect(new Set(ZIFFER_FARBEN).size).toBe(10);
  });

  it('einstellig: Perle in der Farbe der Ziffer, ohne Ring', () => {
    for (let n = 0; n <= 9; n++) expect(zahlFarben(n)).toEqual({ fuellung: ZIFFER_FARBEN[n], ring: null });
  });

  it('zweistellig: Füllung = Einer, Ring = Zehner (Beispiele aus dem Brief)', () => {
    expect(zahlFarben(14)).toEqual({ fuellung: '#A3D93B', ring: '#FF4D6D' }); // hellgrün, roter Ring
    expect(zahlFarben(10)).toEqual({ fuellung: '#EEF1F4', ring: '#FF4D6D' }); // hell, roter Ring
    expect(zahlFarben(47)).toEqual({ fuellung: '#2EC4F0', ring: '#A3D93B' }); // hellblau, hellgrüner Ring
    expect(zahlFarben(99)).toEqual({ fuellung: '#5B5BF0', ring: '#5B5BF0' });
  });

  it('100 ist lila, mehr gibt es nicht', () => {
    expect(zahlFarben(100)).toEqual({ fuellung: HUNDERT_FARBE, ring: null });
    expect(HUNDERT_FARBE).toBe('#8338EC');
    expect(() => zahlFarben(101)).toThrow();
    expect(() => zahlFarben(-1)).toThrow();
    expect(() => zahlFarben(2.5)).toThrow();
  });
});

describe('Perle zeigt die Antwort selbst, die Farbe hilft nur', () => {
  const alle: Antwort[] = [
    ...Array.from({ length: 101 }, (_, n) => ({ art: 'zahl', wert: n }) as Antwort),
    { art: 'buchstabe', wert: 'B' },
    { art: 'buchstabe', wert: 'ä' },
    { art: 'wort', wert: 'Haus' },
    { art: 'wort', wert: 'Schmetterling' },
    { art: 'artikel', wert: 'die' },
    { art: 'zeit', stunde: 7, minute: 30 },
    { art: 'geld', cent: 250 },
    { art: 'laenge', cm: 12 },
  ];

  it('jede Zahl und jedes Wort steht als Text in der Perle', () => {
    for (const a of alle) {
      const p = perlenBild(a);
      expect(p.inhalt.typ, JSON.stringify(a)).toBe('text');
      if (p.inhalt.typ === 'text' && a.art === 'zahl') expect(p.inhalt.text).toBe(String(a.wert));
    }
  });

  it('zwei Zahlen haben nie dasselbe Bild – auch nicht mit gleichen Farben (z. B. 11 und 1)', () => {
    const bilder = Array.from({ length: 101 }, (_, n) => JSON.stringify(perlenBild({ art: 'zahl', wert: n })));
    expect(new Set(bilder).size).toBe(101);
  });

  it('Schrift ist auf jeder Füllung lesbar (großer Text: Kontrast ≥ 3, mit Saum ≥ 7)', () => {
    for (const a of alle) {
      const p = perlenBild(a);
      if (p.inhalt.typ !== 'text') continue;
      expect(kontrast(p.inhalt.schrift, p.fuellung), `${p.name} auf ${p.fuellung}`).toBeGreaterThanOrEqual(3);
      expect(kontrast(p.inhalt.schrift, p.inhalt.saum)).toBeGreaterThanOrEqual(7);
    }
  });

  it('Buchstaben, Wörter, Artikel, Formen und Sammelantworten liegen auf der neutralen hellen Perle', () => {
    const neutral: Antwort[] = [
      { art: 'buchstabe', wert: 'K' },
      { art: 'wort', wert: 'Baum' },
      { art: 'artikel', wert: 'das' },
      { art: 'form', form: 'stern', farbe: 'blau' },
      { art: 'sammel', zeichen: 'gitter', wert: [1, 2, 3, 2, 3, 1, 3, 1, 2] },
    ];
    for (const a of neutral) expect(perlenBild(a).fuellung).toBe(NEUTRAL_PERLE);
    // nicht zu verwechseln mit der hellen Null
    expect(NEUTRAL_PERLE).not.toBe(ZIFFER_FARBEN[0]);
  });

  it('Form behält ihre eigene Farbe und Größe', () => {
    const gross = perlenBild({ art: 'form', form: 'kreis', farbe: 'rot' });
    const klein = perlenBild({ art: 'form', form: 'kreis', farbe: 'rot', klein: true });
    expect(gross.inhalt).toMatchObject({ typ: 'form', form: 'kreis', farbe: '#FF4D6D', klein: false });
    expect(klein.inhalt).toMatchObject({ klein: true });
  });

  it('kurze Inhalte rund, lange Wörter als Kapsel mit Höchstbreite', () => {
    expect(perlenBild({ art: 'zahl', wert: 100 }).breite).toBe(2);
    expect(perlenBild({ art: 'artikel', wert: 'der' }).breite).toBe(2);
    const haus = perlenBild({ art: 'wort', wert: 'Haus' });
    expect(haus.breite).toBeGreaterThan(2);
    const lang = perlenBild({ art: 'wort', wert: 'Schmetterling' });
    expect(lang.breite).toBeLessThanOrEqual(4.4);
    expect(lang.inhalt).toMatchObject({ typ: 'text' });
    if (lang.inhalt.typ === 'text') expect(lang.inhalt.maxBreite).not.toBeNull();
  });

  it('Text dunkel mit weißem Saum, wo es lesbar ist; der dunkle Umriss ist der der Lese-Raupe', () => {
    expect(KONTUR).toBe('#1B2033');
    const p = perlenBild({ art: 'zahl', wert: 3 });
    expect(p.inhalt).toMatchObject({ schrift: KONTUR, saum: '#FFFFFF' });
  });

  it('Geld in deutscher Schreibweise', () => {
    expect(geld(250)).toBe('2,50 €');
    expect(geld(300)).toBe('3 €');
    expect(geld(5)).toBe('0,05 €');
  });
});

describe('Antwort als Wert', () => {
  it('gleich vergleicht Werte, nicht Bilder: gleiche Farbe ist nicht gleiche Antwort', () => {
    // 4 und 14 haben dieselbe Füllfarbe
    expect(gleich({ art: 'zahl', wert: 4 }, { art: 'zahl', wert: 14 })).toBe(false);
    // zwei Wörter mit demselben Anfangsbuchstaben
    expect(gleich({ art: 'wort', wert: 'Hund' }, { art: 'wort', wert: 'Haus' })).toBe(false);
    expect(gleich({ art: 'form', form: 'kreis', farbe: 'rot' }, { farbe: 'rot', form: 'kreis', art: 'form' } as Antwort)).toBe(true);
    expect(gleich(null, null)).toBe(true);
    expect(gleich(null, { art: 'zahl', wert: 0 })).toBe(false);
  });
});
