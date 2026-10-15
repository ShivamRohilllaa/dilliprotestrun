import { CHARACTERS, type CharacterDefinition } from '../characters/CharacterDefinitions';
import abhiteepPortrait from '../assets/avatars/abhiteep-v3.webp';
import germanPortrait from '../assets/avatars/german-v3.webp';
import pappuPortrait from '../assets/avatars/pappu-v3.webp';
import khujliwaalPortrait from '../assets/avatars/khujliwaal-v3.webp';
import { icon } from './icons';
import { setupProgress } from './SetupProgress';

const portraits: Record<string, string> = {
  abhiteep: abhiteepPortrait,
  german: germanPortrait,
  pappu: pappuPortrait,
  khujliwaal: khujliwaalPortrait,
};

export function characterSelect(selected: string, unlocked: readonly string[]): string {
  const card = (c: CharacterDefinition) => {
    const available = c.price === 0 || unlocked.includes(c.id);
    return `<button class="character-card ${selected === c.id ? 'selected' : ''}" data-action="character" data-id="${c.id}" data-testid="character-${c.id}" aria-pressed="${selected === c.id}">
      <div class="parody-portrait"><img src="${portraits[c.id]}" alt="${c.name}" width="640" height="640" decoding="async"></div>
      <h3>${c.name}</h3><p>${c.description}</p>
      <span class="character-price">${available ? (selected === c.id ? '✓ YOUR RUNNER' : c.price === 0 ? 'FREE · SELECT RUNNER' : 'SELECT RUNNER') : `${icon('lock')} ${c.price} CHAI TOKENS`}</span>
    </button>`;
  };
  return `<section class="selection panel" data-testid="avatar-select">${setupProgress(1)}<div class="section-top"><div><span class="eyebrow">CHOOSE YOUR AVATAR</span><h2>Choose your avatar.</h2></div><button class="icon-button" data-action="menu" aria-label="Back to main menu">${icon('close')}</button></div>
    <p class="muted">Four free caricatures, one very unserious chase. Every runner has the same abilities.</p>
    <div class="character-grid parody-grid">${CHARACTERS.map(card).join('')}</div>
    <p class="parody-note">Original caricatures inspired by public appearances. This fictional arcade cast does not imply affiliation, endorsement, or real events.</p>
    <div class="selection-footer setup-footer"><p>${CHARACTERS.find((c) => c.id === selected)?.name ?? CHARACTERS[0].name} selected. Next, choose your streets.</p><button class="primary" data-action="locations" data-testid="choose-location">CHOOSE LOCATION ${icon('arrow')}</button></div>
  </section>`;
}
