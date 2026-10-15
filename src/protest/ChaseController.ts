export interface ChaseProfile {
  startingPressure: number;
  hitPressure: number;
  recovery: number;
  pressureRise?: number;
}

const CLASSIC: ChaseProfile = { startingPressure: 0.2, hitPressure: 0.4, recovery: 0.012 };

export class ChaseController {
  pressure = 0.2;
  invulnerable = 0;
  hitCount = 0;
  private profile: ChaseProfile = CLASSIC;
  update(dt: number): void {
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    if (!this.invulnerable)
      this.pressure = Math.min(
        1,
        Math.max(
          this.profile.startingPressure,
          this.pressure + dt * ((this.profile.pressureRise ?? 0) - this.profile.recovery),
        ),
      );
  }
  collectToken(): void {
    if (this.profile.pressureRise)
      this.pressure = Math.max(this.profile.startingPressure, this.pressure - 0.012);
  }
  reinforce(): void {
    this.profile = {
      ...this.profile,
      hitPressure: this.profile.hitPressure + 0.05,
      recovery: this.profile.recovery * 0.6,
    };
    this.pressure = Math.min(0.95, this.pressure + 0.08);
  }
  hit(): boolean {
    if (this.invulnerable > 0) return false;
    this.pressure = Math.min(1, this.pressure + this.profile.hitPressure);
    this.hitCount++;
    this.invulnerable = 1.25;
    return true;
  }
  get caught(): boolean {
    return this.pressure >= 0.999;
  }
  reset(profile: ChaseProfile = CLASSIC): void {
    this.profile = profile;
    this.pressure = profile.startingPressure;
    this.invulnerable = 0;
    this.hitCount = 0;
  }
}
