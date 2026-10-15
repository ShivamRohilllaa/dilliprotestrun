import { seededRandom } from '../utils/random';
import { DifficultyManager } from './DifficultyManager';

export type ObstacleKind =
  'barricade' | 'divider' | 'rickshaw' | 'bus' | 'pothole' | 'banner' | 'sign';
export interface ObstaclePlacement {
  lane: number;
  kind: ObstacleKind;
}
export interface CoinPlacement {
  lane: number;
  offset: number;
  y: number;
}
export interface ObstaclePattern {
  id: number;
  safeLane: number;
  obstacles: ObstaclePlacement[];
  coins: CoinPlacement[];
}

const KINDS: readonly ObstacleKind[] = [
  'barricade',
  'divider',
  'rickshaw',
  'bus',
  'pothole',
  'banner',
  'sign',
];

/** Lanes are 0 (left), 1 (centre), 2 (right). The caller places each row along Z. */
export class ObstacleSpawner {
  private readonly random: () => number;
  private readonly difficulty = new DifficultyManager();
  private safeLane = 1;
  private nextId = 0;

  constructor(seed: number) {
    this.random = seededRandom(seed);
  }

  next(distance: number, locationDifficulty = 1): ObstaclePattern {
    this.difficulty.update(distance, locationDifficulty);
    // A continuous route never requires crossing two lanes between consecutive rows.
    const shift = this.random();
    if (shift < 0.24) this.safeLane = Math.max(0, this.safeLane - 1);
    else if (shift > 0.76) this.safeLane = Math.min(2, this.safeLane + 1);
    const occupied = [0, 1, 2].filter((lane) => lane !== this.safeLane);
    if (this.random() > 0.5) occupied.reverse();
    const count = this.difficulty.density === 2 && this.random() > 0.25 ? 2 : 1;
    const obstacles = occupied
      .slice(0, count)
      .map((lane) => ({ lane, kind: KINDS[Math.floor(this.random() * KINDS.length)] }));
    const coinCount = 3 + Math.floor(this.random() * 3);
    const coins = Array.from({ length: coinCount }, (_, index) => ({
      lane: this.safeLane,
      offset: index * 2,
      y: 1,
    }));
    return { id: this.nextId++, safeLane: this.safeLane, obstacles, coins };
  }
}
