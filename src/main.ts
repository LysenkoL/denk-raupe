import './styles/fonts.css';
import './styles/tokens.css';
import './styles/app.css';
import './styles/stil.css';
import { renderSatz } from './screens/satz';
import { renderStil } from './screens/stil';

const app = document.getElementById('app')!;

function route(): void {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, query = ''] = raw.split('?');
  const params = new URLSearchParams(query);
  window.scrollTo(0, 0);
  // vorerst zwei Bildschirme: der Satz und die Musterseite des Designsystems
  if (path === '/stil') return renderStil(app, params);
  void renderSatz(app);
}

window.addEventListener('hashchange', route);
route();
