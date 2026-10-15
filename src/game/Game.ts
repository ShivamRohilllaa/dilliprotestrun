import { Vector3 } from 'three';
import { ChaseController } from '../protest/ChaseController';
import { ISSUES, issueById } from '../protest/IssueDefinitions';
import { DifficultyManager } from './DifficultyManager';
import { TrackManager } from './TrackManager';
import { Effects } from './Effects';
import { Player } from '../player/Player';
import { PlayerAnimation } from '../player/PlayerAnimation';
import { InputManager, type InputAction } from './InputManager';
import { ScoreManager } from '../economy/ScoreManager';
import { CrowdManager } from './CrowdManager';
import { PursuerCrowd } from './PursuerCrowd';
import { CONFIG } from './GameConfig';
import { AudioManager } from './AudioManager';
import { ProtestController } from '../protest/ProtestController';
import { SceneFactory } from './SceneFactory';
import { GameLoop } from './GameLoop';
import { StateMachine } from './GameState';
import { SaveManager, type SaveSettings } from '../economy/SaveManager';
import { UnlockManager, type UnlockKind } from '../economy/UnlockManager';
import { AppUI } from '../ui/AppUI';
import { CHARACTERS, characterById } from '../characters/CharacterDefinitions';
import { PURSUERS, pursuerById } from '../characters/PursuerDefinitions';
import { LOCATIONS, locationById } from '../locations/LocationDefinitions';

export class Game {
  readonly player = new Player();
  readonly score = new ScoreManager();
  readonly state = new StateMachine();
  readonly save = new SaveManager();
  readonly unlocks = new UnlockManager(this.save);
  readonly world: SceneFactory;
  readonly ui: AppUI;
  private loop: GameLoop;
  private input: InputManager;
  private animation: PlayerAnimation | null = null;
  private hudTime = 0;
  private track: TrackManager;
  private effects: Effects;
  private chase = new ChaseController();
  private difficulty = new DifficultyManager();
  private policeAnimation: PlayerAnimation;
  private runId = '';
  private crashTime = 0;
  private rewardRevealed = false;
  private reinforcementsJoined = false;
  private chantTime = 0;
  private lastChant = -1;
  private readonly chantPosition = new Vector3();
  private manualSimulation = false;
  private contextLost = false;
  private callbacks = { coin: (id: string) => this.collect(id), hit: () => this.hit() };
  private crowd: CrowdManager;
  private pursuerCrowd: PursuerCrowd;
  private protest = new ProtestController();
  private audio = new AudioManager(() => this.save.data.settings);
  private abort = new AbortController();
  private pendingPurchase: { kind: UnlockKind; id: string } | null = null;
  constructor(container: HTMLElement, root: HTMLElement) {
    const preferLowGraphics =
      this.save.data.settings.quality === 'low' ||
      new URLSearchParams(window.location.search).get('graphics') === 'low';
    this.world = new SceneFactory(container, preferLowGraphics);
    if (this.world.compatibilityMode) this.save.data.settings.quality = 'low';
    this.world.setLocation(locationById(this.save.data.selectedLocation));
    this.world.setCharacter(characterById(this.save.data.selectedCharacter));
    this.world.setPursuer(pursuerById(this.save.data.selectedPursuer));
    this.world.player.rotation.y = Math.PI * 0.8;
    this.world.setQuality(this.save.data.settings.quality);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches)
      this.save.data.settings.reducedMotion = true;
    this.crowd = new CrowdManager(this.world.scene, 42, 1, this.save.data.settings.quality);
    this.pursuerCrowd = new PursuerCrowd(this.world.scene, this.save.data.settings.quality);
    this.track = new TrackManager(this.world.scene, this.world.environment);
    this.effects = new Effects(this.world.scene);
    this.policeAnimation = new PlayerAnimation(this.world.police);
    this.ui = new AppUI(root, (action, id, value) => this.action(action, id, value));
    this.renderUI();
    if (this.save.warning) this.ui.toast(this.save.warning);
    this.loop = new GameLoop(
      (dt) => {
        if (!this.manualSimulation && !this.contextLost) this.update(dt);
      },
      (dt) => this.draw(dt),
    );
    window.addEventListener('resize', () => this.world.resize(), { signal: this.abort.signal });
    this.input = new InputManager(
      container,
      (action) => this.control(action),
      () => this.state.state === 'PLAYING',
    );
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden && this.state.state === 'PLAYING') this.control('pause');
      },
      { signal: this.abort.signal },
    );
    this.world.renderer.domElement.addEventListener(
      'webglcontextlost',
      (event) => {
        event.preventDefault();
        if (this.state.state === 'PLAYING') this.control('pause');
        this.contextLost = true;
        this.ui.modal(
          'The graphics took a break.',
          '<p>Your game is paused while the graphics connection recovers. If this persists, reload the page.</p><button class="primary" data-action="reload">RELOAD GAME</button>',
        );
      },
      { signal: this.abort.signal },
    );
    this.world.renderer.domElement.addEventListener(
      'webglcontextrestored',
      () => {
        this.contextLost = false;
        this.ui.closeModal();
        this.ui.toast('Graphics restored. Resume when you’re ready.');
      },
      { signal: this.abort.signal },
    );
    if (import.meta.env.DEV && import.meta.env.VITE_E2E === 'true') {
      void import('./TestHarness').then(({ installTestHarness }) =>
        installTestHarness({
          snapshot: () => ({
            state: this.state.state,
            lane: this.player.lane.index,
            x: this.player.x,
            y: this.player.y,
            sliding: this.player.slide.active,
            distance: this.score.distance,
            coins: this.score.coins,
            score: this.score.score,
            pressure: this.chase.pressure,
            pursuer: this.save.data.selectedPursuer,
            speed: this.difficulty.speed,
            crowdCount: this.crowd.stats.total,
            chaserCount: this.pursuerCrowd.stats.total,
            crowdStyle: this.pursuerCrowd.stats.style,
            reinforcements: this.reinforcementsJoined,
            objects: this.world.scene.children.length,
            geometryCount: this.world.renderer.info.memory.geometries,
            drawCalls: this.world.renderer.info.render.calls,
          }),
          advance: (seconds) => {
            for (let i = 0; i < Math.ceil(Math.min(600, seconds) * 60); i++) this.update(1 / 60);
          },
          manual: (enabled) => {
            this.manualSimulation = enabled;
          },
          crash: () => {
            if (this.state.state === 'PLAYING') {
              this.gameOver();
              this.update(1);
            }
          },
          grantCoins: (amount) => {
            this.save.data.totalCoins += Math.max(0, Math.floor(amount));
            this.save.save();
            this.renderUI();
          },
          unlockAll: () => {
            this.save.data.unlockedCharacters = CHARACTERS.map((c) => c.id);
            this.save.data.unlockedLocations = LOCATIONS.map((l) => l.id);
            this.save.save();
            this.renderUI();
          },
        }),
      );
    }
    this.loop.start();
  }
  private renderUI(): void {
    this.ui.render(this.state.state, this.save.data);
    this.ui.updateHUD(
      this.score.distance,
      this.score.score,
      this.score.coins,
      this.score.combo,
      this.chase.pressure,
    );
    if (this.state.state === 'GAME_OVER' && this.crashTime <= 0)
      this.ui.gameOver(
        this.score.distance,
        this.score.score,
        this.score.coins,
        this.save.data.bestScore,
        this.save.data.selectedPursuer,
      );
    if (this.state.state === 'VICTORY')
      this.ui.victory(
        this.score.distance,
        this.score.score,
        this.score.coins,
        CONFIG.victoryBonus,
        this.save.data.bestScore,
        this.rewardRevealed,
      );
  }
  private action(action: string, id?: string, value?: string): void {
    this.audio.unlock();
    if (action !== 'setting') this.audio.play('button');
    switch (action) {
      case 'pause':
      case 'left':
      case 'right':
      case 'jump':
      case 'slide':
        this.control(action);
        break;
      case 'resume':
        this.control('pause');
        break;
      case 'quit':
        this.bankRun();
        this.goMenu();
        break;
      case 'retry':
        this.startIntro();
        break;
      case 'reveal-reward':
        if (this.state.state === 'VICTORY' && !this.rewardRevealed) {
          this.rewardRevealed = true;
          this.renderUI();
        }
        break;
      case 'reload':
        window.location.reload();
        break;
      case 'slogan':
      case 'skip':
        this.slogan(action === 'skip');
        break;
      case 'play':
      case 'characters':
        this.state.transition('CHARACTER_SELECT');
        this.renderUI();
        break;
      case 'locations':
        this.state.transition('LOCATION_SELECT');
        this.renderUI();
        break;
      case 'pursuers':
        this.state.transition('PURSUER_SELECT');
        this.renderUI();
        break;
      case 'issues':
        this.state.transition('ISSUE_SELECT');
        this.renderUI();
        break;
      case 'issue':
        if (this.state.state === 'ISSUE_SELECT' && id && ISSUES.some((issue) => issue.id === id)) {
          this.save.data.selectedIssue = id;
          this.save.save();
          this.renderUI();
        }
        break;
      case 'menu':
        this.goMenu();
        break;
      case 'location':
        if (id) this.choose('location', id);
        break;
      case 'character':
        if (id) this.choose('character', id);
        break;
      case 'pursuer':
        if (id && this.state.state === 'PURSUER_SELECT' && PURSUERS.some((p) => p.id === id)) {
          this.save.data.selectedPursuer = id;
          this.save.save();
          this.world.setPursuer(pursuerById(id));
          this.policeAnimation = new PlayerAnimation(this.world.police);
          this.renderUI();
        }
        break;
      case 'confirm-purchase':
        this.purchase();
        break;
      case 'start':
        this.startIntro();
        break;
      case 'settings':
        this.ui.settings(this.save.data);
        break;
      case 'setting':
        if (id && value) this.setting(id, value);
        break;
      case 'mute':
        this.save.data.settings.sound = !this.save.data.settings.sound;
        this.save.save();
        this.renderUI();
        break;
      case 'close-modal':
        this.pendingPurchase = null;
        this.ui.closeModal();
        break;
      case 'help':
        this.ui.modal(
          'A crash course. Literally.',
          '<p>Start a fictional chant, rally the crowd, then keep moving through three lanes.</p><div class="help-grid"><div><strong>← → / A D</strong>Switch lanes</div><div><strong>↑ / W / SPACE</strong>Jump low obstacles</div><div><strong>↓ / S</strong>Slide under banners</div><div><strong>P / ESC</strong>Pause & resume</div></div><p>On touchscreens, swipe in any direction or use the four arrow buttons. Pick up golden chai tokens. At 80 collected chai, both extra crews join the chase: the crowd grows, the pace picks up and stumbles cost more. A clear lane is always available. Dodge tall vehicles, jump barricades and potholes, slide beneath banners.</p><p>Stumbles bring your selected pursuer closer. Reach 1,000 metres to win 100 bonus chai tokens and a fictional meme reward. Normal modes let you recover with clean running. In extreme crowd modes, pressure builds continuously; chai tokens restore your lead.</p>',
        );
        break;
      case 'credits':
        this.ui.modal(
          'Built with full Dilli energy.',
          '<p>An original arcade game with procedural 3D artwork, AI-illustrated avatar portraits, public-figure caricatures and synthesized sounds. Built with Three.js, TypeScript and Vite.</p><p>Every gathering, slogan and chase is fictional. Public-figure aliases and group-inspired clothing are used for parody, with no affiliation, endorsement, or claim about real events. Visual research credits are in docs/CHARACTER_REFERENCES.md; issue research is in docs/ISSUE_REFERENCES.md.</p><p>Game source and original artwork: MIT license. Three.js: MIT license. No paid assets or external recordings. The four avatar portraits are generated illustrations informed by appearance references; source photographs are not bundled.</p>',
        );
        break;
      case 'reset':
        this.ui.modal(
          'A fresh start?',
          '<p>This removes your saved tokens, personal best, unlocks and settings in this browser.</p><button class="primary" data-action="confirm-reset">YES, RESET MY PROGRESS</button><button class="text-button" data-action="close-modal">Keep my progress</button>',
        );
        break;
      case 'confirm-reset':
        if (this.save.reset()) {
          this.runId = '';
          this.score.reset();
          this.player.reset();
          this.chase.reset();
          if (this.state.state === 'PAUSED') this.goMenu();
          this.world.setLocation(LOCATIONS[0]);
          this.world.setCharacter(CHARACTERS[0]);
          this.world.setPursuer(PURSUERS[0]);
          this.policeAnimation = new PlayerAnimation(this.world.police);
          this.world.setQuality(this.save.data.settings.quality);
          this.crowd.setQuality(this.save.data.settings.quality);
          this.pursuerCrowd.configure(null);
          this.pursuerCrowd.setQuality(this.save.data.settings.quality);
          this.track.setEnvironment(this.world.environment);
          this.renderUI();
          this.ui.toast('Fresh streets. Fresh start.');
        } else this.ui.toast(this.save.warning ?? 'Reset could not be saved.');
        break;
    }
  }
  private choose(kind: UnlockKind, id: string): void {
    if (this.unlocks.select(kind, id)) {
      if (kind === 'location') {
        this.world.setLocation(locationById(id));
        this.track.setEnvironment(this.world.environment);
      } else this.world.setCharacter(characterById(id));
      this.renderUI();
      return;
    }
    const definition =
      kind === 'location'
        ? LOCATIONS.find((l) => l.id === id)
        : CHARACTERS.find((c) => c.id === id);
    if (!definition) return;
    if (this.save.data.totalCoins < definition.price) {
      this.ui.toast(
        `Earn ${definition.price - this.save.data.totalCoins} more chai tokens to unlock ${definition.name}.`,
      );
      return;
    }
    this.pendingPurchase = { kind, id };
    this.ui.modal(
      `Unlock ${definition.name}?`,
      `<p>Spend ${definition.price} chai tokens? You have ${this.save.data.totalCoins} tokens.</p><button class="primary" data-action="confirm-purchase" data-testid="confirm-purchase">UNLOCK FOR ${definition.price} TOKENS</button><button class="text-button" data-action="close-modal">Maybe later</button>`,
    );
  }
  private purchase(): void {
    const pending = this.pendingPurchase;
    this.pendingPurchase = null;
    if (!pending) return;
    const result = this.unlocks.purchase(pending.kind, pending.id);
    this.ui.closeModal();
    if (result === 'unlocked' || result === 'owned') {
      this.choose(pending.kind, pending.id);
      this.ui.toast(this.save.warning ?? 'Unlocked. Bring your own kind of josh.');
    } else this.ui.toast('Not enough chai tokens yet.');
  }
  private setting(key: string, value: string): void {
    const s = this.save.data.settings;
    if (['sound', 'music', 'vibration', 'reducedMotion'].includes(key))
      s[key as 'sound' | 'music' | 'vibration' | 'reducedMotion'] = value === 'true';
    if (key === 'volume') s.volume = Math.min(1, Math.max(0, Number(value)));
    if (key === 'quality' && ['low', 'medium', 'high'].includes(value)) {
      s.quality = value as SaveSettings['quality'];
      this.world.setQuality(s.quality);
      this.crowd.setQuality(s.quality);
      this.pursuerCrowd.setQuality(s.quality);
    }
    document.body.classList.toggle('reduced-motion', s.reducedMotion);
    this.save.save();
    if (this.save.warning) this.ui.toast(this.save.warning);
  }
  private startIntro(): void {
    if (!this.state.transition('PROTEST_INTRO')) return;
    this.player.reset();
    this.score.reset();
    const pursuer = pursuerById(this.save.data.selectedPursuer);
    this.chase.reset(pursuer);
    this.world.setPursuer(pursuer);
    this.policeAnimation = new PlayerAnimation(this.world.police);
    this.pursuerCrowd.configure(pursuer.squad ?? null);
    this.pursuerCrowd.reset();
    this.pursuerCrowd.group.visible = false;
    this.world.cameraController.crowdChase = Boolean(pursuer.squad);
    this.effects.reset();
    this.runId = crypto.randomUUID();
    this.crashTime = 0;
    this.rewardRevealed = false;
    this.reinforcementsJoined = false;
    this.chantTime = 0;
    this.lastChant = -1;
    this.world.setLocation(locationById(this.save.data.selectedLocation));
    this.track.setEnvironment(this.world.environment);
    let seed = crypto.getRandomValues(new Uint32Array(1))[0];
    if (import.meta.env.DEV && import.meta.env.VITE_E2E === 'true')
      seed = Number(new URLSearchParams(location.search).get('seed') ?? 20261014);
    this.track.reset(seed, this.runDifficulty);
    this.world.player.position.set(0, 0, 0);
    this.world.player.scale.setScalar(1);
    this.world.player.visible = true;
    this.protest.reset();
    this.crowd.dispose();
    this.crowd = new CrowdManager(
      this.world.scene,
      seed,
      locationById(this.save.data.selectedLocation).difficulty,
      this.save.data.settings.quality,
    );
    this.crowd.reset();
    this.world.police.visible = false;
    this.world.player.rotation.set(0, 0, 0);
    this.animation = new PlayerAnimation(this.world.player);
    this.world.cameraController.setMode('intro');
    this.renderUI();
  }
  private control(action: InputAction): void {
    if (this.contextLost || document.querySelector('[role="dialog"]')) return;
    this.audio.unlock();
    if (action === 'pause') {
      if (this.state.state === 'PLAYING') this.state.transition('PAUSED');
      else if (this.state.state === 'PAUSED') this.state.transition('PLAYING');
      else return;
      this.renderUI();
      this.ui.updateHUD(
        this.score.distance,
        this.score.score,
        this.score.coins,
        this.score.combo,
        this.chase.pressure,
      );
      return;
    }
    if (this.state.state !== 'PLAYING') return;
    if (action === 'left') this.player.move(-1);
    if (action === 'right') this.player.move(1);
    if (action === 'jump' && this.player.jumpAction()) this.audio.play('jump');
    if (action === 'slide' && this.player.slideAction()) this.audio.play('slide');
  }
  private slogan(skip: boolean): void {
    if (this.state.state !== 'PROTEST_INTRO' || !this.protest.trigger(skip)) return;
    this.state.transition('CHASE_TRANSITION');
    this.crowd.cheer();
    this.audio.play('slogan');
    this.world.police.visible = true;
    this.world.police.position.set(2.5, 0, 5);
    this.pursuerCrowd.group.visible = Boolean(pursuerById(this.save.data.selectedPursuer).squad);
    this.renderUI();
  }
  private update(dt: number): void {
    if (this.contextLost) return;
    if (this.state.state === 'PLAYING') {
      this.player.update(dt);
      this.difficulty.update(this.score.distance, this.runDifficulty);
      this.difficulty.speed = Math.min(
        CONFIG.maxSpeed,
        this.difficulty.speed +
          pursuerById(this.save.data.selectedPursuer).speedBonus +
          (this.reinforcementsJoined ? 1.2 : 0),
      );
      this.score.update(
        Math.min(this.difficulty.speed * dt, CONFIG.winDistance - this.score.distance),
      );
      this.chase.update(dt);
      if (this.chase.caught) {
        this.gameOver();
        return;
      }
      this.track.update(
        dt,
        this.difficulty.speed,
        this.score.distance,
        this.player,
        this.callbacks,
      );
      if (this.state.state !== 'PLAYING') return;
      if (this.score.distance >= CONFIG.winDistance) {
        this.win();
        return;
      }
      this.crowd.group.position.z = this.score.distance;
      this.crowd.group.visible = this.score.distance < 60;
      this.world.player.position.set(this.player.x, this.player.y, 0);
      this.chantTime += dt;
      const chant = Math.floor(this.chantTime / 6);
      if (chant !== this.lastChant) {
        this.lastChant = chant;
        this.audio.play('slogan');
      }
      this.animation?.update(
        dt,
        true,
        this.player.y,
        this.player.slide.active,
        this.save.data.settings.reducedMotion,
        false,
        this.chanting,
      );
      this.world.player.visible =
        this.chase.invulnerable <= 0 ||
        this.save.data.settings.reducedMotion ||
        Math.floor(this.chase.invulnerable * 5) % 2 === 0;
      this.world.police.position.x +=
        (this.player.x - this.world.police.position.x) * (1 - Math.exp(-dt * 3));
      this.world.police.position.z = 6 - this.chase.pressure * 4.6;
      this.policeAnimation.update(dt, true, 0, false, this.save.data.settings.reducedMotion);
      this.pursuerCrowd.update(
        dt,
        this.chase.pressure,
        this.player.x,
        this.save.data.settings.reducedMotion,
      );
      this.effects.update(dt);
      this.hudTime += dt;
      if (this.hudTime >= 0.1) {
        this.hudTime = 0;
        this.ui.updateHUD(
          this.score.distance,
          this.score.score,
          this.score.coins,
          this.score.combo,
          this.chase.pressure,
        );
      }
    }
    if (this.state.state === 'GAME_OVER' && this.crashTime > 0) {
      this.crashTime -= dt;
      this.animation?.update(
        dt,
        false,
        this.player.y,
        false,
        this.save.data.settings.reducedMotion,
        true,
      );
      this.effects.update(dt);
      if (this.crashTime <= 0) this.renderUI();
    }
    if (this.state.state === 'CHASE_TRANSITION') {
      this.pursuerCrowd.update(dt, this.chase.pressure, 0, this.save.data.settings.reducedMotion);
      this.world.police.position.x += (0 - this.world.police.position.x) * dt * 2;
      this.hudTime += dt;
      if (this.hudTime >= 0.1) {
        this.ui.updateCrowd(this.protest.meter);
        this.hudTime = 0;
      }
      if (this.protest.elapsed > 1.1) this.world.cameraController.setMode('playing');
      if (this.protest.update(dt)) {
        this.state.transition('PLAYING');
        this.world.cameraController.setMode('playing');
        this.renderUI();
      }
    }
    if (this.state.state !== 'PAUSED') this.crowd.update(dt, this.save.data.settings.reducedMotion);
    this.audio.update(dt, this.state.state === 'PLAYING');
  }
  private collect(id: string): void {
    if (this.state.state !== 'PLAYING' || !this.score.collect(id)) return;
    this.audio.play('coin');
    this.chase.collectToken();
    this.effects.burst(this.player.x, this.player.y + 1, this.save.data.settings.reducedMotion);
    if (this.score.coins % 5 === 0) this.ui.feedback(`+5 CHAI TOKENS · ×${this.score.combo}`);
    if (!this.reinforcementsJoined && this.score.coins >= CONFIG.reinforcementCoins) {
      this.reinforcementsJoined = true;
      this.pursuerCrowd.configure('mixed');
      this.pursuerCrowd.group.visible = true;
      this.world.cameraController.crowdChase = true;
      this.chase.reinforce();
      this.ui.feedback('80 CHAI! THE BHEED HAS JOINED');
      this.ui.toast('RSS + Bajrang crews are on your heels. Keep moving!');
    }
  }
  private hit(): void {
    if (this.state.state !== 'PLAYING' || !this.chase.hit()) return;
    this.score.miss();
    this.audio.play('hit');
    this.effects.burst(this.player.x, 0.9, this.save.data.settings.reducedMotion);
    if (this.save.data.settings.vibration && navigator.vibrate) navigator.vibrate(60);
    this.ui.feedback(this.chase.caught ? 'CHAI BREAK!' : 'STUMBLE! KEEP MOVING');
    if (this.chase.caught) this.gameOver();
  }
  private bankRun(bonus = 0): void {
    if (this.runId) this.save.settleRun(this.runId, this.score.score, this.score.coins + bonus);
  }
  private win(): void {
    if (!this.state.transition('VICTORY')) return;
    this.rewardRevealed = false;
    this.world.player.visible = true;
    this.bankRun(CONFIG.victoryBonus);
    this.audio.play('slogan');
    this.renderUI();
    if (this.save.warning) this.ui.toast(this.save.warning);
  }
  private gameOver(): void {
    if (!this.state.transition('GAME_OVER')) return;
    this.crashTime = 0.65;
    this.world.player.visible = true;
    this.bankRun();
    this.renderUI();
    if (this.save.warning) this.ui.toast(this.save.warning);
  }
  private goMenu(): void {
    if (!this.state.transition('MENU') && this.state.state !== 'MENU') return;
    this.track.reset(42, 1);
    this.effects.reset();
    this.world.player.visible = true;
    this.world.setLocation(locationById(this.save.data.selectedLocation));
    this.track.setEnvironment(this.world.environment);
    this.crowd.reset();
    this.pursuerCrowd.configure(null);
    this.reinforcementsJoined = false;
    this.world.cameraController.crowdChase = false;
    this.world.police.visible = false;
    this.world.player.position.set(0, 0, 0);
    this.world.player.rotation.set(0, Math.PI * 0.8, 0);
    this.world.cameraController.setMode('menu');
    this.renderUI();
  }
  private draw(dt: number): void {
    if (this.contextLost) return;
    if (this.state.state !== 'PAUSED')
      this.world.cameraController.update(
        dt,
        this.world.player.position.x,
        this.save.data.settings.reducedMotion,
      );
    this.world.render();
    if (this.state.state === 'PLAYING') {
      const slogans = issueById(this.save.data.selectedIssue).slogans;
      const slogan = slogans[Math.floor(this.chantTime / 6) % slogans.length];
      this.chantPosition.copy(this.world.player.position);
      this.chantPosition.y += this.player.slide.active ? 1.3 : 2.65;
      this.chantPosition.project(this.world.camera);
      const bounds = this.world.renderer.domElement.getBoundingClientRect();
      const x = bounds.left + ((this.chantPosition.x + 1) * bounds.width) / 2;
      const y = bounds.top + ((1 - this.chantPosition.y) * bounds.height) / 2;
      this.ui.updateChant(
        slogan.roman,
        this.chanting,
        Math.max(130, Math.min(window.innerWidth - 130, x)),
        y,
      );
    } else this.ui.updateChant('', false);
  }
  private get chanting(): boolean {
    return this.state.state === 'PLAYING' && this.chantTime % 6 < 2.4;
  }
  private get runDifficulty(): number {
    return Math.min(
      3,
      locationById(this.save.data.selectedLocation).difficulty +
        pursuerById(this.save.data.selectedPursuer).levelBonus,
    );
  }
  dispose(): void {
    this.loop.stop();
    this.abort.abort();
    this.ui.dispose();
    this.input.dispose();
    this.crowd.dispose();
    this.pursuerCrowd.dispose();
    this.audio.dispose();
    this.track.dispose();
    this.effects.dispose();
    this.world.dispose();
  }
}
