import { CONFIG } from '../game/GameConfig';

export class JumpController {
  y = 0;
  velocity = 0;
  grounded = true;
  private bufferRemaining = 0;

  constructor(
    private readonly jumpVelocity: number = CONFIG.jumpVelocity,
    private readonly gravity: number = CONFIG.gravity,
    private readonly bufferDuration = 0.12,
  ) {}

  request(): boolean {
    if (this.grounded) {
      this.velocity = this.jumpVelocity;
      this.grounded = false;
      this.bufferRemaining = 0;
      return true;
    }
    // A late press is remembered until landing; it never adds airborne velocity.
    if (this.velocity < 0 && this.timeToLanding() <= this.bufferDuration) {
      this.bufferRemaining = this.bufferDuration;
    }
    return false;
  }

  update(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0 || this.grounded) return;
    const landingTime = this.timeToLanding();
    const step = Math.min(dt, landingTime);
    this.y += this.velocity * step - 0.5 * this.gravity * step * step;
    this.velocity -= this.gravity * step;
    if (dt + 1e-10 < landingTime) {
      this.bufferRemaining = Math.max(0, this.bufferRemaining - dt);
      return;
    }

    const buffered = this.bufferRemaining > 0 && landingTime <= this.bufferRemaining + 1e-10;
    this.y = 0;
    this.velocity = 0;
    this.grounded = true;
    this.bufferRemaining = 0;
    if (buffered) {
      this.request();
      // Preserve the part of this frame after touchdown for frame-independent motion.
      this.update(Math.max(0, dt - landingTime));
    }
  }

  private timeToLanding(): number {
    return (
      (this.velocity + Math.sqrt(this.velocity ** 2 + 2 * this.gravity * this.y)) / this.gravity
    );
  }

  reset(): void {
    this.y = 0;
    this.velocity = 0;
    this.grounded = true;
    this.bufferRemaining = 0;
  }
}
