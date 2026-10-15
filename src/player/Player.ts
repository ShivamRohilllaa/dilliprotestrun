import { CONFIG } from '../game/GameConfig';
import { JumpController } from './JumpController';
import { LaneController } from './LaneController';
import { SlideController } from './SlideController';

export interface PlayerConfiguration {
  laneWidth: number;
  jumpVelocity: number;
  gravity: number;
  slideDuration: number;
}

/** Simulation state lives independently of the rendered character and input devices. */
export class Player {
  readonly lane: LaneController;
  readonly jump: JumpController;
  readonly slide: SlideController;

  constructor(configuration: Partial<PlayerConfiguration> = {}) {
    const settings = { ...CONFIG, ...configuration };
    this.lane = new LaneController(settings.laneWidth);
    this.jump = new JumpController(settings.jumpVelocity, settings.gravity);
    this.slide = new SlideController(settings.slideDuration);
  }

  get x(): number {
    return this.lane.x;
  }
  get y(): number {
    return this.jump.y;
  }

  move(direction: -1 | 1): boolean {
    return this.lane.move(direction);
  }
  jumpAction(): boolean {
    return this.slide.active ? false : this.jump.request();
  }
  slideAction(): boolean {
    return this.slide.request(this.jump.grounded);
  }

  update(dt: number): void {
    this.lane.update(dt);
    this.jump.update(dt);
    this.slide.update(dt);
  }

  reset(): void {
    this.lane.reset();
    this.jump.reset();
    this.slide.reset();
  }
}
