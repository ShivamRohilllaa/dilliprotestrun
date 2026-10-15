import { describe, expect, test } from 'vitest';
import { Player } from '../../src/player/Player';
import { JumpController } from '../../src/player/JumpController';
import { LaneController } from '../../src/player/LaneController';
import { SlideController } from '../../src/player/SlideController';

function advance(player: Player, seconds: number, fps: number): void {
  for (let frame = 0; frame < Math.round(seconds * fps); frame += 1) player.update(1 / fps);
}

describe('lane movement', () => {
  test('selects three lanes and cannot move beyond either boundary', () => {
    const lane = new LaneController();
    expect(lane.index).toBe(1);
    expect(lane.move(-1)).toBe(true);
    expect(lane.index).toBe(0);
    expect(lane.move(-1)).toBe(false);
    lane.move(1);
    lane.move(1);
    expect(lane.index).toBe(2);
    expect(lane.move(1)).toBe(false);
    lane.update(1);
    expect(lane.x).toBe(2.5);
  });

  test('eases without teleportation and is independent of frame rate', () => {
    const slow = new Player({ laneWidth: 3 });
    const fast = new Player({ laneWidth: 3 });
    slow.move(-1);
    fast.move(-1);
    expect(slow.x).toBe(0);
    advance(slow, 0.2, 30);
    advance(fast, 0.2, 120);
    expect(slow.x).toBeGreaterThan(-3);
    expect(slow.x).toBeLessThan(0);
    expect(slow.x).toBeCloseTo(fast.x, 10);
  });
});

describe('jump physics', () => {
  test('repeated airborne presses never add upward velocity', () => {
    const jump = new JumpController();
    expect(jump.request()).toBe(true);
    jump.update(0.2);
    const velocity = jump.velocity;
    for (let i = 0; i < 20; i += 1) expect(jump.request()).toBe(false);
    expect(jump.velocity).toBe(velocity);
    jump.update(0.6);
    expect(jump.y).toBe(0);
    expect(jump.grounded).toBe(true);
  });

  test('has a predictable apex and lands exactly at ground level', () => {
    const jump = new JumpController();
    jump.request();
    jump.update(0.4);
    expect(jump.y).toBeCloseTo(2, 10);
    expect(jump.velocity).toBeCloseTo(0, 10);
    expect(jump.grounded).toBe(false);
    jump.update(10);
    expect(jump.y).toBe(0);
    expect(jump.velocity).toBe(0);
    expect(jump.grounded).toBe(true);
  });

  test('matches trajectories at 30 fps and 120 fps', () => {
    const slow = new Player();
    const fast = new Player();
    slow.jumpAction();
    fast.jumpAction();
    advance(slow, 0.6, 30);
    advance(fast, 0.6, 120);
    expect(slow.y).toBeCloseTo(fast.y, 10);
    expect(slow.jump.velocity).toBeCloseTo(fast.jump.velocity, 10);
    advance(slow, 0.2, 30);
    advance(fast, 0.2, 120);
    expect(slow.jump.grounded).toBe(true);
    expect(fast.jump.grounded).toBe(true);
  });

  test('buffers a press shortly before landing, preserving remaining frame time', () => {
    const jump = new JumpController();
    jump.request();
    jump.update(0.72);
    const beforePress = jump.velocity;
    expect(jump.request()).toBe(false);
    expect(jump.velocity).toBe(beforePress);
    jump.update(0.2);
    expect(jump.grounded).toBe(false);
    expect(jump.y).toBeCloseTo(10 * 0.12 - 12.5 * 0.12 ** 2, 10);
    expect(jump.velocity).toBeCloseTo(7, 10);
    jump.update(1);
    expect(jump.grounded).toBe(true);
  });

  test('does not preserve a press more than 120 ms before landing', () => {
    const jump = new JumpController();
    jump.request();
    jump.update(0.65);
    jump.request();
    jump.update(0.2);
    expect(jump.grounded).toBe(true);
  });
});

describe('slide and player lifecycle', () => {
  test('slides only when grounded and repeated requests cannot extend duration', () => {
    const slide = new SlideController(0.8);
    expect(slide.request(false)).toBe(false);
    expect(slide.active).toBe(false);
    expect(slide.request(true)).toBe(true);
    slide.update(0.6);
    expect(slide.request(true)).toBe(false);
    slide.update(0.2);
    expect(slide.active).toBe(false);
  });

  test('prevents overlapping jump/slide and permits the next action after completion', () => {
    const player = new Player();
    expect(player.jumpAction()).toBe(true);
    expect(player.slideAction()).toBe(false);
    player.update(0.8);
    expect(player.slideAction()).toBe(true);
    expect(player.jumpAction()).toBe(false);
    player.update(0.8);
    expect(player.jumpAction()).toBe(true);
  });

  test('reset clears movement, animation state, and buffered input', () => {
    const player = new Player();
    player.move(1);
    player.jumpAction();
    player.update(0.72);
    player.jumpAction();
    player.reset();
    player.update(0.2);
    expect(player.x).toBe(0);
    expect(player.lane.index).toBe(1);
    expect(player.y).toBe(0);
    expect(player.jump.grounded).toBe(true);
    expect(player.slide.active).toBe(false);
    player.slideAction();
    player.reset();
    expect(player.slide.active).toBe(false);
  });

  test('ignores invalid or backwards frame times', () => {
    const player = new Player();
    player.jumpAction();
    player.move(1);
    for (const dt of [-1, Number.NaN, Infinity, 0]) player.update(dt);
    expect(player.x).toBe(0);
    expect(player.y).toBe(0);
    expect(player.jump.velocity).toBe(10);
  });
});
