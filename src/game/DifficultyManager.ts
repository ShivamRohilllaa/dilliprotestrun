import { CONFIG } from './GameConfig';

/** Distance-based difficulty is independent of frame rate and random generation. */
export class DifficultyManager {
  speed: number = CONFIG.initialSpeed;
  spacing = 48;
  density = 1;

  update(distance: number, locationDifficulty = 1): void {
    const metres = Number.isFinite(distance) ? Math.max(0, distance) : 0;
    const level = Number.isFinite(locationDifficulty)
      ? Math.min(3, Math.max(1, locationDifficulty))
      : 1;
    this.speed = Math.min(CONFIG.maxSpeed, CONFIG.initialSpeed + metres / 160 + (level - 1) * 0.8);
    // At the 24 m/s speed cap, 32 metres gives at least 1.33 s between rows.
    this.spacing = Math.max(32, 48 - metres / 140 - (level - 1) * 2);
    this.density = metres >= 400 - (level - 1) * 100 ? 2 : 1;
  }
}
