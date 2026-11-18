import { KIND } from '../i18n/kind';
import { kachelBildSvg } from '../bilder/figuren';

/**
 * Zwischenseiten nach dem Satz, bis Welt (C6) und Start (C1) gebaut sind: das Kind hat selbst gewählt,
 * „Zurück“ führt zum Ende des Satzes. Nichts startet von selbst.
 */
export function renderPlatzhalter(app: HTMLElement, art: 'welt' | 'pause'): void {
  app.innerHTML = `<main class="platzhalter">
    <div class="platzhalter-brett">
      <span class="kachel-bild">${kachelBildSvg(art)}</span>
      <p class="platzhalter-text">${art === 'welt' ? KIND.weltBald : KIND.bisBald}</p>
      <a class="btn leise" href="#/">${KIND.zurueck}</a>
    </div>
  </main>`;
}
