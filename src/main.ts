import './styles/fonts.css';
import './styles/tokens.css';
import './styles/app.css';
import './styles/stil.css';
import { renderSatz } from './screens/satz';
import { renderStil } from './screens/stil';
import { renderPlatzhalter } from './screens/platzhalter';

const app = document.getElementById('app')!;

function route(): void {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, query = ''] = raw.split('?');
  const params = new URLSearchParams(query);
  window.scrollTo(0, 0);
  // vorerst: der Satz, die Musterseite des Designsystems und zwei Zwischenseiten nach dem Satz (bis C1 und C6)
  if (path === '/stil') return renderStil(app, params);
  if (path === '/welt' || path === '/pause') return renderPlatzhalter(app, path === '/welt' ? 'welt' : 'pause');
  void renderSatz(app);
}

window.addEventListener('hashchange', route);
route();
