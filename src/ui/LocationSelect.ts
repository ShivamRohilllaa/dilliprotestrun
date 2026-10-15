import { LOCATIONS } from '../locations/LocationDefinitions';
import { icon } from './icons';
import { setupProgress } from './SetupProgress';
export function locationSelect(selected: string, unlocked: readonly string[]): string {
  return `<section class="selection panel" data-testid="location-select">${setupProgress(2)}<div class="section-top"><div><span class="eyebrow">PICK YOUR PATCH</span><h2>Choose your streets.</h2></div><button class="icon-button" data-action="menu" aria-label="Back to main menu">${icon('close')}</button></div><p class="muted">Three corners of a fictional Dilli. One very loud adventure.</p>
  <div class="location-grid">${LOCATIONS.map(
    (
      l,
      i,
    ) => `<button class="location-card ${selected === l.id ? 'selected' : ''} ${unlocked.includes(l.id) ? '' : 'locked'}" data-action="location" data-id="${l.id}" data-testid="location-${l.id}" aria-pressed="${selected === l.id}">
  <div class="miniature miniature-${l.id}"><span class="mini-sun"></span><span class="mini-building b1"></span><span class="mini-building b2"></span><span class="mini-monument"></span><span class="mini-road"></span><span class="mini-tree t1"></span><span class="mini-tree t2"></span><span class="number">0${i + 1}</span>${unlocked.includes(l.id) ? `<span class="status-pill">${selected === l.id ? '✓ SELECTED' : 'EXPLORE'}</span>` : `<span class="status-pill">${icon('lock')} ${l.price} TOKENS</span>`}</div>
  <div class="location-info"><small>${l.subtitle}</small><h3>${l.name}</h3><p>${l.description}</p><div class="card-bottom"><span>${'●'.repeat(l.difficulty)}${'○'.repeat(3 - l.difficulty)} <span class="muted">${['Easy streets', 'Finding your feet', 'Full-on chaos'][i]}</span></span>${icon(unlocked.includes(l.id) ? 'arrow' : 'lock')}</div></div></button>`,
  ).join('')}</div>
  <div class="selection-footer setup-footer"><button class="text-button" data-action="characters" data-testid="back-to-avatar">← BACK TO AVATARS</button><button class="primary" data-action="issues" data-testid="choose-issue">CHOOSE YOUR ISSUE ${icon('arrow')}</button></div></section>`;
}
