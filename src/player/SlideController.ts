import { CONFIG } from '../game/GameConfig';

export class SlideController {
  private remaining = 0;

  constructor(readonly duration: number = CONFIG.slideDuration) {}

  get active(): boolean {
    return this.remaining > 0;
  }

  request(grounded: boolean): boolean {
    if (!grounded || this.active) return false;
    this.remaining = this.duration;
    return true;
  }

  update(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    this.remaining = Math.max(0, this.remaining - dt);
    if (this.remaining < 1e-10) this.remaining = 0;
  }

  reset(): void {
    this.remaining = 0;
  }
}
