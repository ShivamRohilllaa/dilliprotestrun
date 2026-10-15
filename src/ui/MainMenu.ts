import { icon } from './icons';
export function mainMenu(best: number, location: string, character: string): string {
  return `<section class="home" data-testid="main-menu">
    <div class="eyebrow"><span class="live-dot"></span> DILLI KI SADKON SE <span class="edition">VOL. 01</span></div>
    <h1 class="game-title"><span>DILLI</span><span>PROTEST</span><span class="outline">RUN<span class="title-arrow">↗</span></span></h1>
    <p class="tagline">Big city. Bigger <em>awaaz.</em></p>
    <p class="home-copy">Raise your voice. Rally the crowd.<br>Run 1,000 metres. Win a meme & 100 chai tokens.</p>
    <div class="live-presence" data-live-presence data-available="false" role="status" aria-live="polite"><span class="presence-dot" aria-hidden="true"></span><strong>—</strong><span data-presence-label>checking live players…</span></div>
    <button class="primary play-button" data-action="play" data-testid="play">LET’S MAKE SOME NOISE ${icon('arrow')}</button>
    <div class="home-options"><button data-action="locations">${icon('pin')}<span><small>YOUR STREETS</small>${location}</span><span class="chevron">↗</span></button><button data-action="characters" data-testid="characters">${icon('person')}<span><small>YOUR RUNNER</small>${character}</span><span class="chevron">↗</span></button></div>
    <div class="personal-best">${icon('trophy')} PERSONAL BEST <strong>${best.toLocaleString()}</strong> <span>PTS</span></div>
  </section>
  <div class="world-caption"><span class="coordinates">28.6271° N &nbsp; 77.2166° E</span><div><span class="live-dot"></span> ${location.toUpperCase()} <span class="caption-tag">STYLIZED WORLD</span></div></div>
  <aside class="world-sticker"><span>100% FICTIONAL.</span><strong>FULL DILLI<br>ENERGY.</strong><span>चाय, चर्चा और चेज़!</span></aside>`;
}
