import { expect, test } from 'vitest';
import { CONFIG } from '../../src/game/GameConfig';
test('simulation and movement settings use valid bounds', () => {
  expect(CONFIG.fixedStep).toBeGreaterThan(0);
  expect(CONFIG.maxSpeed).toBeGreaterThan(CONFIG.initialSpeed);
  expect(CONFIG.jumpVelocity ** 2 / (2 * CONFIG.gravity)).toBeGreaterThan(1);
});
