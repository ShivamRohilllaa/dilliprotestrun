import { PURSUERS } from '../characters/PursuerDefinitions';
import { characterPortrait } from '../characters/CharacterPortrait';
import { icon } from './icons';
import { setupProgress } from './SetupProgress';

export function pursuerSelect(selected: string): string {
  return `<section class="selection panel pursuer-selection" data-testid="pursuer-select" aria-labelledby="pursuer-title">${setupProgress(4)}<div class="section-top"><div><span class="eyebrow">CHOOSE WHO CHASES YOU</span><h2 id="pursuer-title">A familiar face on your heels.</h2></div><button class="icon-button" data-action="menu" aria-label="Back to main menu">${icon('close')}</button></div><p class="muted">Choose your challenge. Keep your feet moving.</p><div class="pursuer-grid">${PURSUERS.map((p) => `<button class="pursuer-card ${p.id === selected ? 'selected' : ''}" data-action="pursuer" data-id="${p.id}" data-testid="pursuer-${p.id}" aria-pressed="${p.id === selected}"><div class="pursuer-portrait">${characterPortrait(p)}</div><div><span class="difficulty-badge difficulty-${p.difficulty.toLowerCase()}">${p.difficulty.toUpperCase()}</span><h3>${p.name}</h3><p>${p.description}</p><span class="character-price">${p.id === selected ? '✓ YOUR PURSUER' : 'SELECT PURSUER'}</span></div></button>`).join('')}</div><div class="selection-footer setup-footer"><button class="text-button" data-action="issues" data-testid="back-to-issue">← BACK TO ISSUES</button><button class="primary" data-action="start" data-testid="start">HIT THE STREETS ${icon('arrow')}</button></div></section>`;
}
