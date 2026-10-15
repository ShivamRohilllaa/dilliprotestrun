import './styles/global.css';
import { Game } from './game/Game';
import { GraphicsUnavailableError } from './game/createRenderer';
import { startLivePresence } from './presence/LivePresence';
const root = document.querySelector<HTMLElement>('#app')!;
try {
  const game = new Game(document.querySelector<HTMLElement>('#scene')!, root);
  let disposePresence = () => {};
  try {
    disposePresence = startLivePresence();
  } catch (error) {
    console.warn('Live player count could not start:', error);
  }
  const dispose = () => {
    disposePresence();
    game.dispose();
  };
  window.addEventListener('pagehide', (event) => {
    if (!event.persisted) dispose();
  });
  if (import.meta.hot) import.meta.hot.dispose(dispose);
} catch (error) {
  console.error('Game initialization failed:', error);
  document.querySelector('#scene')?.replaceChildren();
  delete document.body.dataset.state;
  const graphicsUnavailable = error instanceof GraphicsUnavailableError;
  root.innerHTML = `<section class="error-card panel" aria-labelledby="startup-error-title" data-testid="startup-error">
    <h1 id="startup-error-title">${graphicsUnavailable ? 'Your browser could not start the 3D game.' : 'The game could not start.'}</h1>
    <p>${graphicsUnavailable ? 'Dilli Protest Run needs WebGL 2. We also tried lighter graphics, but this browser could not open a graphics connection.' : 'Something went wrong while loading the game. Reload to try again. Your saved progress has not been cleared.'}</p>
    ${graphicsUnavailable ? '<ul><li>On desktop Chrome, open Settings → System, turn on “Use graphics acceleration when available”, then relaunch Chrome.</li><li>On mobile, update Chrome and open the link directly in the browser instead of inside another app.</li><li>Close other graphics-heavy tabs, or try Safari, Firefox or another device.</li></ul>' : ''}
    <div class="error-actions"><button class="primary" id="retry-startup">TRY AGAIN</button>${graphicsUnavailable ? '' : '<button class="secondary" id="retry-low-graphics">TRY LOW GRAPHICS</button>'}</div>
    <p><a href="#about-title">Read about the game and controls ↓</a></p>
  </section>`;
  root.querySelector('#retry-startup')?.addEventListener('click', () => location.reload());
  root.querySelector('#retry-low-graphics')?.addEventListener('click', () => {
    const url = new URL(location.href);
    url.searchParams.set('graphics', 'low');
    location.assign(url.href);
  });
}
