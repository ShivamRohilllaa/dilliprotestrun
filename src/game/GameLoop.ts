import { CONFIG } from './GameConfig';
export class GameLoop {
  private frame = 0;
  private last = 0;
  private accumulator = 0;
  private alive = false;
  constructor(
    private simulate: (dt: number) => void,
    private render: (dt: number) => void,
  ) {}
  start(): void {
    if (this.alive) return;
    this.alive = true;
    this.last = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }
  private tick = (now: number): void => {
    if (!this.alive) return;
    const dt = Math.min(CONFIG.maxDelta, (now - this.last) / 1000);
    this.last = now;
    if (!document.hidden) {
      this.accumulator += dt;
      while (this.accumulator >= CONFIG.fixedStep) {
        this.simulate(CONFIG.fixedStep);
        this.accumulator -= CONFIG.fixedStep;
      }
      this.render(dt);
    } else this.accumulator = 0;
    this.frame = requestAnimationFrame(this.tick);
  };
  stop(): void {
    this.alive = false;
    cancelAnimationFrame(this.frame);
    this.accumulator = 0;
  }
}
