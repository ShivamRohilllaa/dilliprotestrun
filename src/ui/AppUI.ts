import { issueById } from '../protest/IssueDefinitions';
import { issueSelect } from './IssueSelect';
import { mainMenu } from './MainMenu';
import { locationSelect } from './LocationSelect';
import { pursuerSelect } from './PursuerSelect';
import { characterSelect } from './CharacterSelect';
import { icon } from './icons';
import { characterById } from '../characters/CharacterDefinitions';
import { pursuerById } from '../characters/PursuerDefinitions';
import { characterPortrait } from '../characters/CharacterPortrait';
import { catchEndingFor } from '../protest/CatchEndings';
import { victoryScreen } from './VictoryScreen';
import { CONFIG } from '../game/GameConfig';
import { locationById } from '../locations/LocationDefinitions';
import type { GameState } from '../game/GameState';
import type { SaveData } from '../economy/SaveManager';

export type UIAction = (action: string, id?: string, value?: string) => void;
export class AppUI {
  private abort = new AbortController();
  private lastFocus: HTMLElement | null = null;
  private toastTimeout = 0;
  constructor(
    private root: HTMLElement,
    private onAction: UIAction,
  ) {
    root.addEventListener(
      'click',
      (event) => {
        const button = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
        if (button) this.onAction(button.dataset.action!, button.dataset.id);
      },
      { signal: this.abort.signal },
    );
    root.addEventListener(
      'change',
      (event) => {
        const input = event.target as HTMLInputElement;
        if (input.dataset.setting)
          this.onAction(
            'setting',
            input.dataset.setting,
            input.type === 'checkbox' ? String(input.checked) : input.value,
          );
      },
      { signal: this.abort.signal },
    );
    root.addEventListener(
      'keydown',
      (event) => {
        if (
          event.repeat &&
          (event.key === 'Enter' || event.key === ' ') &&
          (event.target as HTMLElement).closest('button')
        ) {
          event.preventDefault();
          return;
        }
        const dialog = root.querySelector<HTMLElement>('[role="dialog"]');
        if (!dialog) return;
        if (event.key === 'Escape') {
          event.stopPropagation();
          this.closeModal();
        }
        if (event.key !== 'Tab') return;
        const controls = [
          ...dialog.querySelectorAll<HTMLElement>('button, input, select, [tabindex="0"]'),
        ];
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      },
      { signal: this.abort.signal },
    );
  }
  render(state: GameState, save: SaveData): void {
    const previousState = document.body.dataset.state;
    const issue = issueById(save.selectedIssue);
    const slogan = issue.slogans[0];
    document.body.dataset.state = state;
    document.body.classList.toggle('reduced-motion', save.settings.reducedMotion);
    const canPause = state === 'PLAYING' || state === 'PAUSED';
    const active = [
      'PLAYING',
      'PAUSED',
      'GAME_OVER',
      'VICTORY',
      'CHASE_TRANSITION',
      'PROTEST_INTRO',
    ].includes(state);
    const header = `<header class="topbar"><button class="brand" data-action="${canPause ? 'pause' : 'menu'}" aria-label="${canPause ? 'Pause game' : 'Dilli Protest Run home'}"><span class="brand-mark">D<span>↗</span></span><span>DILLI<span>PROTEST RUN</span></span></button><div class="topbar-right">${!active ? '<span class="local-badge"><span class="live-dot"></span> MADE OF DILLI</span>' : ''}<div class="wallet" title="Saved chai tokens">${icon('coin')}<strong data-testid="wallet">${save.totalCoins}</strong><span>CHAI TOKENS</span></div><button class="icon-button" data-action="mute" aria-label="${save.settings.sound ? 'Mute sound' : 'Enable sound'}">${icon(save.settings.sound ? 'sound' : 'mute')}</button><button class="icon-button" data-action="${active ? (canPause ? 'pause' : 'menu') : 'settings'}" aria-label="${active ? (canPause ? 'Pause game' : 'Back to menu') : 'Settings'}" data-testid="${active ? (canPause ? 'pause' : 'menu') : 'settings'}">${icon(active ? (canPause ? 'pause' : 'close') : 'gear')}</button></div></header>`;
    let content = '';
    if (state === 'MENU')
      content = mainMenu(
        save.bestScore,
        locationById(save.selectedLocation).name,
        characterById(save.selectedCharacter).name,
      );
    if (state === 'LOCATION_SELECT')
      content = locationSelect(save.selectedLocation, save.unlockedLocations);
    if (state === 'ISSUE_SELECT') content = issueSelect(save.selectedIssue);
    if (state === 'PURSUER_SELECT') content = pursuerSelect(save.selectedPursuer);
    if (state === 'CHARACTER_SELECT')
      content = characterSelect(save.selectedCharacter, save.unlockedCharacters);
    if (state === 'PROTEST_INTRO')
      content = `<section class="intro-panel panel" data-testid="protest-intro"><span class="eyebrow">${locationById(save.selectedLocation).name.toUpperCase()} · ${issue.name.toUpperCase()}</span><h2>A little chai.<br>A lot of <em>awaaz.</em></h2><div class="start-objective" data-testid="start-objective"><span class="eyebrow">YOUR MISSION</span><strong>Win 100 chai to try releasing Udhar Galib &amp; Jaleel Imaan.</strong><p>Finish 1,000m to earn 100 bonus chai and a fictional release voucher.</p></div><div class="crowd-meter"><span>CROWD JOSH</span><div><i style="width:22%"></i></div><strong>22%</strong></div><button class="primary" data-action="slogan" data-testid="slogan">${icon('bolt')} ${slogan.roman.toUpperCase()} <span lang="hi">${slogan.hindi}</span></button><button class="text-button" data-action="skip" data-testid="skip-intro">Skip intro & start running →</button></section>`;
    if (state === 'CHASE_TRANSITION')
      content = `<section class="chase-caption" data-testid="chase-transition"><span class="eyebrow">THAT GOT THEIR ATTENTION.</span><h2 lang="hi">${slogan.hindi}</h2><p>${pursuerById(save.selectedPursuer).name} ${pursuerById(save.selectedPursuer).squad ? 'and the bheed are' : 'is'} on your heels. Time to move.</p><span class="countdown">GET READY TO RUN</span><div class="crowd-meter chase-crowd"><span>CROWD JOSH</span><div><i data-testid="crowd-meter-fill" style="width:22%"></i></div><strong data-testid="crowd-meter-value">22%</strong></div></section>`;
    if (state === 'PLAYING' || state === 'PAUSED' || state === 'GAME_OVER')
      content = `<div class="run-hud" data-testid="game-hud"><div class="run-stats"><div><span>DISTANCE · GOAL 1,000m</span><strong data-testid="distance">0<span>m</span></strong></div><div><span>SCORE</span><strong data-testid="score">0</strong></div><div class="token-stat">${icon('coin')}<strong data-testid="run-coins">0</strong><small data-testid="combo">×1</small></div></div><div class="goal-progress" role="progressbar" aria-label="Distance to victory" aria-valuemin="0" aria-valuemax="1000" aria-valuenow="0"><i data-testid="goal-fill"></i></div><div class="chase-meter"><small class="pursuer-hud" data-testid="active-pursuer">${pursuerById(save.selectedPursuer).name.toUpperCase()} · ${pursuerById(save.selectedPursuer).difficulty.toUpperCase()}${pursuerById(save.selectedPursuer).squad ? ' · TOKENS RESTORE YOUR LEAD' : ''}</small><span data-testid="chase-label">COMFORTABLE LEAD</span><div><i data-testid="chase-fill"></i></div></div></div><div class="run-objective" data-testid="run-objective"><strong>WIN 100 CHAI</strong><span>Finish 1,000m to try releasing Udhar Galib &amp; Jaleel Imaan.</span></div><div class="runner-chant" data-testid="runner-chant" hidden><small>${characterById(save.selectedCharacter).name}</small><strong></strong></div><div class="runner-guide"><span>← → MOVE</span><span>↑ JUMP</span><span>↓ SLIDE</span><span>P PAUSE</span></div><div class="touch-controls"><button data-action="left" aria-label="Move left">←</button><button data-action="jump" aria-label="Jump">↑</button><button data-action="slide" aria-label="Slide">↓</button><button data-action="right" aria-label="Move right">→</button></div><div class="feedback" aria-live="polite"></div>`;
    if (state === 'PAUSED')
      content += `<section class="overlay"><div class="compact-panel panel" data-testid="pause-menu"><span class="eyebrow">TAKE A CHAI BREAK</span><h2>Catch your breath.</h2><p>Your run will be right here.</p><button class="primary" data-action="resume" data-testid="resume">BACK TO THE STREETS ${icon('arrow')}</button><button class="secondary" data-action="settings">Settings</button><button class="text-button" data-action="quit">End run & main menu</button></div></section>`;
    const footer = !active
      ? `<footer class="footer"><span>A FICTIONAL CITY. A REAL GOOD TIME.</span><nav><button data-action="help">How to play <span>↗</span></button><button data-action="credits">Credits <span>↗</span></button><a href="${import.meta.env.BASE_URL}privacy.html">Privacy Policy</a><a href="${import.meta.env.BASE_URL}terms.html">Terms &amp; Conditions</a><a href="${import.meta.env.BASE_URL}faq.html">FAQ</a></nav><span class="version">DILLI ARCADE &nbsp; / &nbsp; V1.2</span></footer>`
      : '';
    this.root.innerHTML = `${header}<main>${content}</main>${footer}<div id="modal-root"></div><div class="toast" role="status"></div>`;
    document.dispatchEvent(new Event('dilli:statechange'));
    if (previousState !== state) window.scrollTo(0, 0);
    if (state === 'PAUSED')
      this.root
        .querySelector<HTMLElement>('[data-testid="resume"]')
        ?.focus({ preventScroll: true });
    else if (!active && state !== 'MENU')
      this.root.querySelector<HTMLElement>('main button')?.focus({ preventScroll: true });
  }
  updateChant(text: string, visible: boolean, x?: number, y?: number): void {
    const bubble = this.root.querySelector<HTMLElement>('[data-testid="runner-chant"]');
    if (!bubble) return;
    bubble.hidden = !visible;
    const words = bubble.querySelector('strong')!;
    if (words.textContent !== text) words.textContent = text;
    if (x !== undefined && y !== undefined) {
      bubble.style.left = `${x}px`;
      bubble.style.top = `${y}px`;
    }
  }
  updateCrowd(value: number): void {
    const text = this.root.querySelector('[data-testid="crowd-meter-value"]');
    const fill = this.root.querySelector<HTMLElement>('[data-testid="crowd-meter-fill"]');
    if (text) text.textContent = `${Math.floor(value)}%`;
    if (fill) fill.style.width = `${value}%`;
  }
  updateHUD(distance: number, score: number, coins: number, combo: number, pressure: number): void {
    const set = (id: string, value: string) => {
      const el = this.root.querySelector(`[data-testid="${id}"]`);
      if (el && el.textContent !== value) el.textContent = value;
    };
    const objective = this.root.querySelector<HTMLElement>('[data-testid="run-objective"]');
    if (objective) objective.hidden = distance >= 80;
    set('distance', `${Math.floor(distance)}m`);
    set('score', score.toLocaleString());
    set('run-coins', String(coins));
    set('combo', `×${combo}`);
    set(
      'chase-label',
      pressure > 0.65
        ? 'RIGHT ON YOUR HEELS!'
        : pressure > 0.4
          ? 'KEEP YOUR FEET MOVING'
          : 'COMFORTABLE LEAD',
    );
    const goal = this.root.querySelector<HTMLElement>('[data-testid="goal-fill"]');
    if (goal) {
      goal.style.width = `${Math.min(100, (distance / CONFIG.winDistance) * 100)}%`;
      goal.parentElement?.setAttribute('aria-valuenow', String(Math.floor(distance)));
    }
    const fill = this.root.querySelector<HTMLElement>('[data-testid="chase-fill"]');
    if (fill) fill.style.width = `${pressure * 100}%`;
  }
  gameOver(distance: number, score: number, coins: number, best: number, pursuerId = 'mobi'): void {
    const pursuer = pursuerById(pursuerId);
    const ending = catchEndingFor(pursuer.id);
    this.root
      .querySelector('main')!
      .insertAdjacentHTML(
        'beforeend',
        `<section class="overlay"><div class="compact-panel panel result" data-testid="game-over"><span class="eyebrow">FICTIONAL ARCADE ENDING</span><div class="ending-portrait">${characterPortrait(pursuer)}</div><h2>${ending.title}</h2><p class="catch-message" data-testid="catch-message">${ending.message}</p><p class="ending-extra">${ending.extra}</p><div class="final-score"><span>YOUR SCORE</span><strong>${score.toLocaleString()}</strong></div><div class="result-grid"><div><strong>${Math.floor(distance)}m</strong><span>DISTANCE</span></div><div><strong>+${coins}</strong><span>CHAI TOKENS</span></div><div><strong>${best.toLocaleString()}</strong><span>PERSONAL BEST</span></div></div><button class="primary" data-action="retry" data-testid="retry">ONE MORE RUN ${icon('arrow')}</button><button class="text-button" data-action="menu">Back to main menu</button></div></section>`,
      );
    this.root.querySelector<HTMLElement>('[data-testid="retry"]')?.focus();
  }
  victory(
    distance: number,
    score: number,
    coins: number,
    bonus: number,
    best: number,
    reveal: boolean,
  ): void {
    this.root
      .querySelector('main')!
      .insertAdjacentHTML('beforeend', victoryScreen(distance, score, coins, bonus, best, reveal));
    this.root
      .querySelector<HTMLElement>(
        reveal ? '[data-testid="retry"]' : '[data-testid="release-reward"]',
      )
      ?.focus({ preventScroll: true });
  }
  modal(title: string, body: string): void {
    this.lastFocus = document.activeElement as HTMLElement;
    this.root.querySelector('#modal-root')!.innerHTML =
      `<div class="overlay modal-overlay"><section class="modal panel" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="section-top"><h2 id="modal-title">${title}</h2><button class="icon-button" data-action="close-modal" aria-label="Close dialog">${icon('close')}</button></div>${body}</section></div>`;
    this.root.querySelector<HTMLElement>('[role="dialog"] button')?.focus();
    this.root
      .querySelectorAll<HTMLElement>(':scope > header, :scope > main, :scope > footer')
      .forEach((el) => (el.inert = true));
  }
  closeModal(): void {
    this.root.querySelector('#modal-root')!.innerHTML = '';
    this.root.querySelectorAll<HTMLElement>('[inert]').forEach((el) => (el.inert = false));
    this.lastFocus?.focus();
  }
  settings(save: SaveData): void {
    const s = save.settings;
    this.modal(
      'Your kind of volume.',
      `<p class="muted">Fine-tune your time on the streets.</p><div class="settings-list">${[
        ['sound', 'Master sound'],
        ['music', 'Original chase beat'],
        ['vibration', 'Vibration'],
        ['reducedMotion', 'Reduced motion'],
      ]
        .map(
          ([key, label]) =>
            `<label>${label}<input type="checkbox" data-setting="${key}" ${s[key as keyof typeof s] ? 'checked' : ''}></label>`,
        )
        .join(
          '',
        )}<label>Volume<input type="range" min="0" max="1" step="0.05" value="${s.volume}" data-setting="volume" aria-label="Volume"></label><label>Graphics quality<select data-setting="quality" aria-label="Graphics quality">${['low', 'medium', 'high'].map((q) => `<option ${s.quality === q ? 'selected' : ''}>${q}</option>`).join('')}</select></label></div><p class="save-note">Progress is saved in this browser only. Clearing browser data removes it.</p><button class="danger-button" data-action="reset">Reset local progress</button>`,
    );
  }
  toast(message: string): void {
    const el = this.root.querySelector<HTMLElement>('.toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('visible');
    clearTimeout(this.toastTimeout);
    this.toastTimeout = window.setTimeout(() => el.classList.remove('visible'), 3000);
  }
  feedback(message: string): void {
    const el = this.root.querySelector<HTMLElement>('.feedback');
    if (el) {
      el.textContent = message;
      el.classList.remove('pop');
      void el.offsetWidth;
      el.classList.add('pop');
    }
  }
  dispose(): void {
    this.abort.abort();
    clearTimeout(this.toastTimeout);
  }
}
