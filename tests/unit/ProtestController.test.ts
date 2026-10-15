import { expect, test } from 'vitest';
import { ProtestController } from '../../src/protest/ProtestController';

test('a crowd can only trigger one chase per introduction', () => {
  const intro = new ProtestController();
  expect(intro.trigger()).toBe(true);
  for (let i = 0; i < 100; i++) expect(intro.trigger()).toBe(false);
  expect(intro.update(2)).toBe(false);
  expect(intro.update(1.2)).toBe(true);
  expect(intro.meter).toBe(100);
  intro.reset();
  expect(intro.trigger(true)).toBe(true);
  expect(intro.update(0.3)).toBe(true);
});
