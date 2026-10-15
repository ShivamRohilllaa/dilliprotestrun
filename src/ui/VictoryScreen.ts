import { REWARD_CHARACTERS } from '../characters/CharacterDefinitions';
import { characterPortrait } from '../characters/CharacterPortrait';

const number = (value: number): string => Math.max(0, Math.floor(value)).toLocaleString('en-IN');

/** An original visual gag. Reward settlement belongs to Game/SaveManager. */
export function victoryScreen(
  distance: number,
  score: number,
  coins: number,
  bonus: number,
  best: number,
  reveal: boolean,
): string {
  const portraits = REWARD_CHARACTERS.map((character) => {
    return `<figure class="victory-cell">
      <div class="victory-cell-art">${characterPortrait(character)}
        ${reveal ? '<div class="victory-bars" aria-hidden="true"><i></i><i></i><i></i><b></b></div>' : ''}
      </div>
      <figcaption>${character.name}</figcaption>
    </figure>`;
  }).join('');

  return `<section class="overlay victory-overlay" aria-label="Run completed">
    <div class="victory-panel panel ${reveal ? 'victory-revealed' : ''}" data-testid="victory-screen">
      <div class="victory-story" ${reveal ? 'data-testid="bail-meme"' : ''}>
      <header class="victory-heading">
        <span class="eyebrow">${reveal ? 'ARCADE COURT · FICTIONAL MEME' : 'FINISH LINE · 1,000 METRES'}</span>
        <h2>${reveal ? 'RELEASE REWARD?' : 'You won.<br><span>Time for a release?</span>'}</h2>
        <p>${reveal ? 'Arcade CJI: bail not approved.' : 'A finish-line bonus. And one very ambitious release voucher.'}</p>
      </header>

      <div class="victory-meme" role="img" aria-label="${reveal ? 'Fictional meme: Udhar Galib and Jaleel Imaan remain behind arcade jail bars.' : 'Original caricatures of Udhar Galib and Jaleel Imaan on an arcade release voucher.'}">
        <div class="victory-meme-stamp">${reveal ? 'RELEASE REQUEST: PENDING' : 'TWO NAMES. ONE RELEASE VOUCHER.'}</div>
        <div class="victory-cast">${portraits}</div>
        <div class="victory-meme-caption">${reveal ? 'Your chai reward: approved.' : 'Redeem at the Arcade Court.'}</div>
      </div>
      </div>

      <div class="victory-bonus" data-testid="victory-bonus">
        <span>FINISH-LINE BONUS <small>Added to your wallet</small></span>
        <strong>+${number(bonus)} <span>CHAI</span></strong>
      </div>
      <dl class="victory-stats">
        <div><dt>DISTANCE</dt><dd data-testid="victory-distance">${number(distance)}<small>m</small></dd></div>
        <div><dt>SCORE</dt><dd data-testid="victory-score">${number(score)}</dd></div>
        <div><dt>CHAI COLLECTED</dt><dd data-testid="victory-coins">${number(coins)}</dd></div>
        <div><dt>PERSONAL BEST</dt><dd data-testid="victory-best">${number(best)}</dd></div>
      </dl>

      ${reveal ? '' : '<button class="primary victory-release" data-action="reveal-reward" data-testid="release-reward">RELEASE UDHAR &amp; JALEEL <span aria-hidden="true">→</span></button>'}
      <div class="victory-actions">
        <button class="${reveal ? 'primary' : 'secondary'}" data-action="retry" data-testid="retry">RUN AGAIN</button>
        <button class="secondary" data-action="menu" data-testid="victory-menu">BACK TO DILLI</button>
      </div>
      <p class="victory-fiction">Fictional arcade gag. No real court ruling or release status is depicted.</p>
    </div>
  </section>`;
}
