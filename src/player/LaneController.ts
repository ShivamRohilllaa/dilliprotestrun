import { CONFIG } from '../game/GameConfig';

/** Lane selection is discrete; the visible position eases toward it in world units. */
export class LaneController {
  index = 1;
  x = 0;

  constructor(
    readonly laneWidth: number = CONFIG.laneWidth,
    private readonly response = 18,
  ) {}

  move(direction: -1 | 1): boolean {
    const next = Math.max(0, Math.min(2, this.index + direction));
    if (next === this.index) return false;
    this.index = next;
    return true;
  }

  update(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    const target = (this.index - 1) * this.laneWidth;
    // Exponential smoothing gives the same result at different render frame rates.
    this.x += (target - this.x) * (1 - Math.exp(-this.response * dt));
    if (Math.abs(target - this.x) < 0.00001) this.x = target;
  }

  reset(): void {
    this.index = 1;
    this.x = 0;
  }
}
