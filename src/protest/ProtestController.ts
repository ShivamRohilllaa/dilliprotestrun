export class ProtestController {
  triggered = false;
  elapsed = 0;
  private duration = 3.1;
  reset(): void {
    this.triggered = false;
    this.elapsed = 0;
    this.duration = 3.1;
  }
  trigger(skip = false): boolean {
    if (this.triggered) return false;
    this.triggered = true;
    this.duration = skip ? 0.3 : 3.1;
    return true;
  }
  update(dt: number): boolean {
    if (!this.triggered) return false;
    this.elapsed += dt;
    return this.elapsed >= this.duration;
  }
  get meter(): number {
    return this.triggered ? Math.min(100, 22 + this.elapsed * 70) : 22;
  }
}
