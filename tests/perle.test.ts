import { describe, expect, it } from 'vitest';
import { HUNDERT_FARBE, HUNDERT_KANTE, NEUTRAL_KANTE, NEUTRAL_PERLE, TINTE, WEISS, ZIFFER_FARBEN, ZIFFER_KANTEN, kontrast } from '../src/design/farbe';
import { perlenBild, zahlFarben, geld } from '../src/perlen/perle';
import { perleInhalt, perlenMasse, R, SAUM, TRENNRING_PX } from '../src/perlen/maler';
import { gleich, type Antwort } from '../src/perlen/antwort';
import { deltaE2000 } from './helpers/farbabstand';
import { inSchrift, textUmriss } from './helpers/glyphen';

describe('Ziffernfarben (docs/TZ.md)', () => {
  it('zehn feste Farben für 0–9, alle verschieden', () => {
    expect(ZIFFER_FARBEN).toEqual(['#EEF1F4', '#EC003F', '#FE8100', '#FFFD4F', '#71E053', '#068846', '#42C4FF', '#2B289F', '#F598C6', '#7A3004']);
    expect(new Set(ZIFFER_FARBEN).size).toBe(10);
  });

  it('je zwei Ziffern gut zu unterscheiden, auch als dünner Ring (ΔE2000 ≥ 20)', () => {
    for (let i = 0; i < 10; i++)
      for (let j = i + 1; j < 10; j++)
        expect(deltaE2000(ZIFFER_FARBEN[i], ZIFFER_FARBEN[j]), `${i} und ${j}`).toBeGreaterThanOrEqual(20);
  });

  it('die 100 hebt sich von jeder Ziffer ab (wie die Ziffern untereinander, ΔE2000 ≥ 20)', () => {
    for (const c of ZIFFER_FARBEN) expect(deltaE2000(c, HUNDERT_FARBE), c).toBeGreaterThanOrEqual(20);
  });

  it('einstellig: Perle in der Farbe der Ziffer, ohne Ring', () => {
    for (let n = 0; n <= 9; n++) expect(zahlFarben(n)).toEqual({ fuellung: ZIFFER_FARBEN[n], ring: null });
  });

  it('zweistellig: Füllung = Einer, Ring = Zehner (Beispiele aus dem Brief)', () => {
    expect(zahlFarben(14)).toEqual({ fuellung: '#71E053', ring: '#EC003F' }); // hellgrün, roter Ring
    expect(zahlFarben(10)).toEqual({ fuellung: '#EEF1F4', ring: '#EC003F' }); // hell, roter Ring
    expect(zahlFarben(47)).toEqual({ fuellung: '#2B289F', ring: '#71E053' }); // dunkelblau, hellgrüner Ring
    expect(zahlFarben(99)).toEqual({ fuellung: '#7A3004', ring: '#7A3004' });
  });

  it('100 ist lila, mehr gibt es nicht', () => {
    expect(zahlFarben(100)).toEqual({ fuellung: HUNDERT_FARBE, ring: null });
    expect(HUNDERT_FARBE).toBe('#983AF1');
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
    { art: 'ausdruck', links: 7, zeichen: 'plus', rechts: 3 },
    { art: 'ausdruck', links: 10, zeichen: 'minus', rechts: 7 },
    { art: 'ausdruck', links: 3, zeichen: 'mal', rechts: 5 },
    { art: 'ausdruck', links: 15, zeichen: 'geteilt', rechts: 5 },
    { art: 'groesse', wert: 15, einheit: 'cm' },
    { art: 'groesse', wert: 15, einheit: 'kg' },
    { art: 'stelle', nr: 3 },
    { art: 'stelle', nr: 12 },
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

  it('Schrift ist auf jeder Füllung lesbar (Kontrast ≥ 4,5, mit Saum ≥ 7)', () => {
    for (const a of alle) {
      const p = perlenBild(a);
      if (p.inhalt.typ !== 'text') continue;
      expect(kontrast(p.inhalt.schrift, p.fuellung), `${p.name} auf ${p.fuellung}`).toBeGreaterThanOrEqual(4.5);
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
      { art: 'ausdruck', links: 7, zeichen: 'plus', rechts: 3 },
      { art: 'groesse', wert: 15, einheit: 'cm' },
      { art: 'stelle', nr: 3 },
    ];
    for (const a of neutral) expect(perlenBild(a).fuellung).toBe(NEUTRAL_PERLE);
    // nicht zu verwechseln mit der hellen Null
    expect(NEUTRAL_PERLE).not.toBe(ZIFFER_FARBEN[0]);
  });

  it('Form behält ihre eigene Farbe und Größe', () => {
    const gross = perlenBild({ art: 'form', form: 'kreis', farbe: 'rot' });
    const klein = perlenBild({ art: 'form', form: 'kreis', farbe: 'rot', klein: true });
    expect(gross.inhalt).toMatchObject({ typ: 'form', form: 'kreis', farbe: '#EC003F', klein: false });
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

  it('Text in Tinte mit weißem Saum, wo es lesbar ist, sonst weiß mit Saum in Tinte', () => {
    expect(TINTE).toBe('#182218');
    expect(perlenBild({ art: 'zahl', wert: 3 }).inhalt).toMatchObject({ schrift: TINTE, saum: WEISS });
    expect(perlenBild({ art: 'zahl', wert: 7 }).inhalt).toMatchObject({ schrift: WEISS, saum: TINTE });
  });

  it('Aufgabe, Größe und Platz: kurzer Text auf der neutralen Perle (docs/FORMATE.md, Abschnitt 3, Regel 10)', () => {
    const text = (a: Antwort) => {
      const p = perlenBild(a);
      return p.inhalt.typ === 'text' ? p.inhalt.text : null;
    };
    expect(text({ art: 'ausdruck', links: 7, zeichen: 'plus', rechts: 3 })).toBe('7 + 3');
    expect(text({ art: 'ausdruck', links: 10, zeichen: 'minus', rechts: 7 })).toBe('10 − 7');
    expect(text({ art: 'ausdruck', links: 3, zeichen: 'mal', rechts: 5 })).toBe('3 · 5');
    expect(text({ art: 'ausdruck', links: 15, zeichen: 'geteilt', rechts: 5 })).toBe('15 : 5');
    expect(text({ art: 'groesse', wert: 15, einheit: 'cm' })).toBe('15 cm');
    // Platz: vorerst die Nummer des Platzes
    expect(text({ art: 'stelle', nr: 3 })).toBe('3.');
    expect(perlenBild({ art: 'stelle', nr: 3 }).fuellung).not.toBe(perlenBild({ art: 'zahl', wert: 3 }).fuellung);
  });

  it('Geld in deutscher Schreibweise', () => {
    expect(geld(250)).toBe('2,50 €');
    expect(geld(300)).toBe('3 €');
    expect(geld(5)).toBe('0,05 €');
  });
});

describe('Perle aus fünf Schichten (docs/STIL.md, Abschnitt 7)', () => {
  /** Rechtecke (Kapseln) einer Perle mit ihren Attributen, in Zeichenreihenfolge */
  const kapseln = (svg: string) =>
    [...svg.matchAll(/<rect ([^>]*)\/>/g)].map((m) => {
      const a = Object.fromEntries([...m[1].matchAll(/([\w-]+)="([^"]*)"/g)].map((x) => [x[1], x[2]]));
      return { ...a, x: +a.x, y: +a.y, width: +a.width, height: +a.height } as Record<string, string> & { x: number; y: number; width: number; height: number };
    });

  it('Kante: Kreis in Kantenfarbe, tiefer als die Perle; darunter ein warmer Schatten', () => {
    for (const [n, kante] of [[3, ZIFFER_KANTEN[3]], [47, ZIFFER_KANTEN[4]], [100, HUNDERT_KANTE]] as const) {
      const p = perlenBild({ art: 'zahl', wert: n });
      expect(p.kante).toBe(kante);
      const r = kapseln(perleInhalt(p));
      const k = r.find((x) => x.fill === kante)!;
      const koerper = perlenMasse(p).koerper;
      expect(k.y).toBeGreaterThan(koerper.y);
      expect(k.width).toBe(koerper.w);
      expect(r.indexOf(k)).toBeGreaterThan(0);
      expect(r.slice(0, r.indexOf(k)).every((x) => x.fill === 'rgb(70, 50, 20)')).toBe(true);
    }
    expect(perlenBild({ art: 'wort', wert: 'Haus' }).kante).toBe(NEUTRAL_KANTE);
  });

  it('kein dunkler Umriss: einstellige Zahlen, Wörter, Formen haben keine Kontur um die Perle', () => {
    const ohne: Antwort[] = [
      ...Array.from({ length: 10 }, (_, n) => ({ art: 'zahl', wert: n }) as Antwort),
      { art: 'zahl', wert: 100 },
      { art: 'wort', wert: 'Schmetterling' },
      { art: 'form', form: 'stern', farbe: 'gelb' },
    ];
    for (const a of ohne) for (const r of kapseln(perleInhalt(perlenBild(a)))) expect(r.stroke, JSON.stringify(a)).toBeUndefined();
  });

  it('zweistellig: Ring in Zehnerfarbe mit hellem Bogen, Trennring in Tinte 2,5 px um den Kern in Einerfarbe', () => {
    for (let n = 10; n <= 99; n++) {
      const p = perlenBild({ art: 'zahl', wert: n });
      const svg = perleInhalt(p);
      const r = kapseln(svg);
      const m = perlenMasse(p);
      const ring = r.find((x) => x.fill === p.ring && x.y === m.koerper.y)!;
      expect(ring, `${n}`).toBeDefined();
      expect(svg).toMatch(/<path d="M[^"]*A[^"]*" fill="none" stroke="#FFFFFF"/);
      const trenn = r.filter((x) => x.stroke);
      expect(trenn).toHaveLength(1);
      expect(trenn[0]).toMatchObject({ fill: 'none', stroke: TINTE, 'stroke-width': String(TRENNRING_PX), 'vector-effect': 'non-scaling-stroke' });
      expect([trenn[0].x, trenn[0].y, trenn[0].width]).toEqual([m.kern.x, m.kern.y, m.kern.w]);
      // Kern in Einerfarbe liegt innerhalb des Rings und wird nach ihm gezeichnet
      const kern = r.find((x) => x.fill === p.fuellung && x.width < ring.width && x.y === m.kern.y)!;
      expect(kern, `${n}`).toBeDefined();
      expect(r.indexOf(kern)).toBeGreaterThan(r.indexOf(ring));
      expect(r.indexOf(trenn[0])).toBeGreaterThan(r.indexOf(kern));
    }
  });

  it('Kern: Sichelschatten unten im Kantenton, Glanzlicht oben links', () => {
    for (const n of [0, 5, 47, 100]) {
      const p = perlenBild({ art: 'zahl', wert: n });
      const m = perlenMasse(p);
      // heller Kern oben bündig, unten kürzer: darunter bleibt die Sichel
      expect(m.hell.y).toBe(m.kern.y);
      expect(m.hell.y + m.hell.h).toBeLessThan(m.kern.y + m.kern.h);
      const mitteX = m.kern.x + m.kern.h / 2;
      const mitteY = m.kern.y + m.kern.h / 2;
      expect(m.glanz.cx).toBeLessThan(mitteX);
      expect(m.glanz.cy).toBeLessThan(mitteY);
      expect(perleInhalt(p)).toMatch(/<ellipse [^>]*fill="#FFFFFF"/);
    }
  });

  // alles, was als Text in einer Perle stehen kann – auch breite Buchstaben und Umlaute
  const texte: Antwort[] = [
    ...Array.from({ length: 101 }, (_, n) => ({ art: 'zahl', wert: n }) as Antwort),
    ...[...'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜabcdefghijklmnopqrstuvwxyzäöüß'].map((w) => ({ art: 'buchstabe', wert: w }) as Antwort),
    ...(['der', 'die', 'das'] as const).map((w) => ({ art: 'artikel', wert: w }) as Antwort),
    ...['Haus', 'Maus', 'Äpfel', 'Wolke', 'Schmetterling'].map((w) => ({ art: 'wort', wert: w }) as Antwort),
    { art: 'zeit', stunde: 12, minute: 45 },
    { art: 'geld', cent: 1250 },
    { art: 'laenge', cm: 18 },
    { art: 'ausdruck', links: 7, zeichen: 'plus', rechts: 3 },
    { art: 'ausdruck', links: 10, zeichen: 'minus', rechts: 7 },
    { art: 'ausdruck', links: 3, zeichen: 'mal', rechts: 5 },
    { art: 'ausdruck', links: 15, zeichen: 'geteilt', rechts: 5 },
    { art: 'groesse', wert: 15, einheit: 'cm' },
    { art: 'groesse', wert: 15, einheit: 'kg' },
    { art: 'stelle', nr: 3 },
    { art: 'stelle', nr: 12 },
  ];

  it('Glanzlicht berührt die Schrift nicht (echte Umrisse aus Inter ExtraBold, mit Saum)', () => {
    // Prüfung der Prüfung: ein Punkt im Strich der 8 liegt in der Schrift, die Mitte der 0 nicht
    const acht = textUmriss('8', 50, 0, 0);
    expect(inSchrift(acht, [0, -18])).toBe(true);
    expect(inSchrift(textUmriss('0', 50, 0, 0), [0, -18])).toBe(false);
    for (const a of texte) {
      const p = perlenBild(a);
      if (p.inhalt.typ !== 'text') continue;
      const m = perlenMasse(p);
      const fs = R * p.inhalt.groesse;
      const umriss = textUmriss(p.inhalt.text, fs, m.textX, m.textY, p.inhalt.maxBreite ? p.inhalt.maxBreite * R : null);
      const g = m.glanz;
      const w = (g.winkel * Math.PI) / 180;
      const rand: [number, number][] = Array.from({ length: 720 }, (_, t) => {
        const u = (t * Math.PI) / 360;
        const ex = g.rx * Math.cos(u);
        const ey = g.ry * Math.sin(u);
        return [g.cx + ex * Math.cos(w) - ey * Math.sin(w), g.cy + ex * Math.sin(w) + ey * Math.cos(w)];
      });
      // Abstand jedes Umrisspunktes zum Glanz muss größer sein als der halbe Saum
      let abstand = Infinity;
      for (const l of umriss)
        for (const [px, py] of l) {
          if (Math.hypot(px - g.cx, py - g.cy) > g.rx + 20) continue;
          const lx = (px - g.cx) * Math.cos(w) + (py - g.cy) * Math.sin(w);
          const ly = -(px - g.cx) * Math.sin(w) + (py - g.cy) * Math.cos(w);
          if ((lx / g.rx) ** 2 + (ly / g.ry) ** 2 <= 1) abstand = -1;
          else for (const [qx, qy] of rand) abstand = Math.min(abstand, Math.hypot(px - qx, py - qy));
        }
      expect(inSchrift(umriss, [g.cx, g.cy]), p.name).toBe(false);
      expect(abstand, p.name).toBeGreaterThan((fs * SAUM) / 2);
    }
  });

  it('Schrift steht auf der einfarbigen Fläche: über dem Sichelschatten', () => {
    for (const a of texte) {
      const p = perlenBild(a);
      if (p.inhalt.typ !== 'text') continue;
      const m = perlenMasse(p);
      const fs = R * p.inhalt.groesse;
      const umriss = textUmriss(p.inhalt.text, fs, m.textX, m.textY, p.inhalt.maxBreite ? p.inhalt.maxBreite * R : null);
      const unten = Math.max(...umriss.flat().map(([, y]) => y)) + (fs * SAUM) / 2;
      // tiefster Punkt der Schrift liegt über dem tiefsten Punkt des hellen Kerns (in der Mitte)
      expect(unten, p.name).toBeLessThan(m.hell.y + m.hell.h);
    }
  });

  it('dieselbe Perle überall: das Bild hängt nur von der Antwort ab', () => {
    const a: Antwort = { art: 'zahl', wert: 47 };
    expect(perleInhalt(perlenBild(a))).toBe(perleInhalt(perlenBild(a)));
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

  it('gleich für Aufgabe, Größe und Platz', () => {
    const plus: Antwort = { art: 'ausdruck', links: 7, zeichen: 'plus', rechts: 3 };
    expect(gleich(plus, { rechts: 3, zeichen: 'plus', links: 7, art: 'ausdruck' } as Antwort)).toBe(true);
    // Tauschaufgabe ist eine andere Antwort
    expect(gleich(plus, { art: 'ausdruck', links: 3, zeichen: 'plus', rechts: 7 })).toBe(false);
    expect(gleich(plus, { art: 'ausdruck', links: 7, zeichen: 'minus', rechts: 3 })).toBe(false);
    const cm: Antwort = { art: 'groesse', wert: 15, einheit: 'cm' };
    expect(gleich(cm, { einheit: 'cm', wert: 15, art: 'groesse' } as Antwort)).toBe(true);
    expect(gleich(cm, { art: 'groesse', wert: 15, einheit: 'm' })).toBe(false);
    expect(gleich(cm, { art: 'groesse', wert: 16, einheit: 'cm' })).toBe(false);
    // Größe 15 cm ist nicht die Länge 15 cm eines anderen Formats
    expect(gleich(cm, { art: 'laenge', cm: 15 })).toBe(false);
    expect(gleich({ art: 'stelle', nr: 3 }, { art: 'stelle', nr: 3 })).toBe(true);
    expect(gleich({ art: 'stelle', nr: 3 }, { art: 'stelle', nr: 4 })).toBe(false);
    expect(gleich({ art: 'stelle', nr: 3 }, { art: 'zahl', wert: 3 })).toBe(false);
  });
});
