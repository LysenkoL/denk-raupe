import de from '../i18n/de.json';
import { FORMATE } from '../aufgaben';
import { STANDARD_EINSTELLUNG, type FormatId } from '../aufgaben/format';
import { neuerSamen } from '../core/zufall';
import { ladeGeschuetzt, schreiben } from '../core/speicher';
import { knopfTon } from '../app/ton';
import { ladeProfil, naechsteSitzung, neueSitzung, neuesProfil, SATZ_LAENGE, type PlanEintrag } from '../satz/sitzung';

/**
 * Probe – „Alle Aufgaben“ (#/alle): eine vorläufige Seite für die Autorin, um jedes Format im Satz anzusehen.
 * Nicht die Regalseite C4 und nicht für das Kind gedacht: Texte stehen deshalb hier und nicht in kind.ts.
 * Ein Tipp auf ein Format startet einen Satz aus 5 Aufgaben nur dieses Formats, die Stufen steigen 1 → 2 → 3;
 * „Gemischter Satz“ startet einen gewöhnlichen gemischten Satz. Ein offener Satz wird dabei ersetzt.
 * Kommt weg, wenn es die Regalseite gibt.
 */

const PROBE_TEXT = {
  titel: 'Alle Aufgaben',
  hinweis: 'Probe für die Autorin: ein Format antippen – 5 Aufgaben nur dieses Formats, Stufe 1 bis 3.',
  gemischt: 'Gemischter Satz',
  zurueck: 'Zum Satz',
};

/** Stufen eines Probesatzes aus einem Format: von 1 bis zur höchsten, gleichmäßig verteilt (bei 3 Stufen: 1, 1, 2, 2, 3) */
export function probeStufen(stufen: number, n = SATZ_LAENGE): number[] {
  return Array.from({ length: n }, (_, k) => 1 + Math.floor((k * stufen) / n));
}

/** Plan eines Probesatzes nur aus dem Format `id` */
export function probeSatzPlan(id: FormatId): PlanEintrag[] {
  return probeStufen(FORMATE[id].stufen).map((stufe) => ({ format: id, stufe }));
}

const name = (id: FormatId) => (de as Record<string, string>)[`format.${id}.name`] ?? id;

export function renderAlle(app: HTMLElement): void {
  const ids = (Object.keys(FORMATE) as FormatId[]).sort((a, b) => FORMATE[a].nr - FORMATE[b].nr);
  app.innerHTML = `<main class="alle">
    <div class="alle-kopf">
      <h1>${PROBE_TEXT.titel}</h1>
      <a class="leise-knopf" href="#/">${PROBE_TEXT.zurueck}</a>
    </div>
    <p class="alle-hinweis">${PROBE_TEXT.hinweis}</p>
    <button class="btn haupt gemischt" type="button">${PROBE_TEXT.gemischt}</button>
    <ul class="alle-liste">${ids
      .map((id) => {
        const f = FORMATE[id];
        return `<li><button class="btn leise alle-format" type="button" data-format="${id}"><span class="alle-nr">${f.nr}</span><span class="alle-name">${name(id)}</span><span class="alle-pass">${f.faehigkeit}</span></button></li>`;
      })
      .join('')}</ul>
  </main>`;

  const starten = async (sitzung: unknown) => {
    knopfTon();
    await schreiben('sitzung', sitzung);
    location.hash = '#/';
  };
  app.querySelector('.gemischt')!.addEventListener('click', async () => {
    const profil = (await ladeGeschuetzt('profil', ladeProfil)) ?? neuesProfil();
    await starten(naechsteSitzung(neuerSamen(), profil));
  });
  app.querySelector('.alle-liste')!.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-format]');
    if (!b) return;
    void starten(neueSitzung(neuerSamen(), STANDARD_EINSTELLUNG, probeSatzPlan(b.dataset.format as FormatId)));
  });
}
