import { describe, expect, it } from 'vitest';
import { seededRandom } from '../../src/utils/random';
import { CONFIG } from '../../src/game/GameConfig';
import { DifficultyManager } from '../../src/game/DifficultyManager';
import { ObjectPool } from '../../src/game/ObjectPool';
import { ObstacleSpawner, type ObstacleKind } from '../../src/game/ObstacleSpawner';
import { hitsObstacle } from '../../src/game/CollisionSystem';

describe('deterministic track generation', () => {
  it('produces repeatable randomness inside [0, 1)', () => {
    const first = seededRandom(241);
    const second = seededRandom(241);
    const different = seededRandom(242);
    const generated = Array.from({ length: 1000 }, first);
    expect(generated).toEqual(Array.from({ length: 1000 }, second));
    expect(generated).not.toEqual(Array.from({ length: 1000 }, different));
    expect(generated.every((value) => value >= 0 && value < 1)).toBe(true);
  });

  it('replays identical patterns from the same seed and distance sequence', () => {
    const first = new ObstacleSpawner(602);
    const second = new ObstacleSpawner(602);
    for (let index = 0; index < 100; index += 1) {
      expect(first.next(index * 40, 2)).toEqual(second.next(index * 40, 2));
    }
  });

  it('leaves a continuous reachable escape route through 12,000 generated rows', () => {
    const kinds = new Set<ObstacleKind>();
    for (let seed = 0; seed < 40; seed += 1) {
      const spawner = new ObstacleSpawner(seed);
      let previousSafe = 1;
      for (let row = 0; row < 300; row += 1) {
        const pattern = spawner.next(row * 40, (seed % 3) + 1);
        expect(pattern.id).toBe(row);
        expect([0, 1, 2]).toContain(pattern.safeLane);
        expect(Math.abs(pattern.safeLane - previousSafe)).toBeLessThanOrEqual(1);
        expect(pattern.obstacles.length).toBeGreaterThanOrEqual(1);
        expect(pattern.obstacles.length).toBeLessThanOrEqual(2);
        expect(new Set(pattern.obstacles.map(({ lane }) => lane)).size).toBe(
          pattern.obstacles.length,
        );
        expect(
          pattern.obstacles.every(
            ({ lane }) => lane !== pattern.safeLane && [0, 1, 2].includes(lane),
          ),
        ).toBe(true);
        expect(pattern.coins.length).toBeGreaterThanOrEqual(3);
        expect(pattern.coins.length).toBeLessThanOrEqual(5);
        expect(
          pattern.coins.every(
            ({ lane, y, offset }, index) =>
              lane === pattern.safeLane && y === 1 && offset === index * 2,
          ),
        ).toBe(true);
        pattern.obstacles.forEach(({ kind }) => kinds.add(kind));
        previousSafe = pattern.safeLane;
      }
    }
    expect(kinds.size).toBe(7);
  });
});

describe('DifficultyManager', () => {
  it('starts gently and increases speed and density within configured limits', () => {
    const difficulty = new DifficultyManager();
    difficulty.update(0);
    expect(difficulty.speed).toBe(CONFIG.initialSpeed);
    expect(difficulty.density).toBe(1);
    let previousSpeed = difficulty.speed;
    let previousSpacing = difficulty.spacing;
    for (let distance = 0; distance <= 10_000; distance += 10) {
      difficulty.update(distance);
      expect(difficulty.speed).toBeGreaterThanOrEqual(previousSpeed);
      expect(difficulty.speed).toBeLessThanOrEqual(CONFIG.maxSpeed);
      expect(difficulty.spacing).toBeLessThanOrEqual(previousSpacing);
      expect(difficulty.spacing).toBeGreaterThanOrEqual(32);
      expect(difficulty.spacing / difficulty.speed).toBeGreaterThanOrEqual(4 / 3);
      expect(difficulty.density).toBeLessThanOrEqual(2);
      previousSpeed = difficulty.speed;
      previousSpacing = difficulty.spacing;
    }
    expect(difficulty.speed).toBe(CONFIG.maxSpeed);
    expect(difficulty.density).toBe(2);
  });

  it('remains bounded for every location and resets when distance resets', () => {
    const difficulty = new DifficultyManager();
    for (const location of [1, 2, 3, 99]) {
      difficulty.update(100_000, location);
      expect(difficulty.speed).toBe(CONFIG.maxSpeed);
      expect(difficulty.spacing).toBe(32);
      expect(difficulty.density).toBe(2);
    }
    difficulty.update(-10, Number.NaN);
    expect(difficulty.speed).toBe(CONFIG.initialSpeed);
    expect(difficulty.spacing).toBe(48);
    expect(difficulty.density).toBe(1);
  });
});

describe('CollisionSystem', () => {
  it.each<ObstacleKind>(['barricade', 'divider', 'rickshaw', 'bus', 'pothole', 'banner', 'sign'])(
    'allows a lane dodge past %s',
    (kind) => {
      expect(hitsObstacle(0.81, 0, false, 0, kind)).toBe(false);
      expect(hitsObstacle(0.79, 0, false, 0, kind)).toBe(true);
    },
  );

  it.each<ObstacleKind>(['barricade', 'divider', 'sign'])(
    'requires enough jump height to clear %s',
    (kind) => {
      expect(hitsObstacle(0, 1.05, false, 0, kind)).toBe(true);
      expect(hitsObstacle(0, 1.06, false, 0, kind)).toBe(false);
      expect(hitsObstacle(0, 0, true, 0, kind)).toBe(true);
    },
  );

  it('allows jumping potholes and requires sliding beneath banners', () => {
    expect(hitsObstacle(0, 0.55, false, 0, 'pothole')).toBe(true);
    expect(hitsObstacle(0, 0.56, false, 0, 'pothole')).toBe(false);
    expect(hitsObstacle(0, 0, true, 0, 'banner')).toBe(false);
    expect(hitsObstacle(0, 2, false, 0, 'banner')).toBe(true);
    expect(hitsObstacle(0, 3.1, false, 0, 'banner')).toBe(false);
  });

  it.each<ObstacleKind>(['rickshaw', 'bus'])(
    'requires dodging %s instead of jumping or sliding',
    (kind) => {
      expect(hitsObstacle(0, 2, false, 0, kind)).toBe(true);
      expect(hitsObstacle(0, 0, true, 0, kind)).toBe(true);
    },
  );
});

describe('ObjectPool', () => {
  it('reuses released objects, resets them and enforces a hard allocation cap', () => {
    let created = 0;
    const pool = new ObjectPool(
      () => ({ id: created++, value: 0 }),
      (item) => {
        item.value = 0;
      },
      2,
    );
    const first = pool.acquire();
    const second = pool.acquire();
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    if (first === null || second === null) throw new Error('Expected two pool slots');
    first.value = 8;
    expect(pool.acquire()).toBeNull();
    expect(pool.activeCount).toBe(2);
    expect(pool.release(first)).toBe(true);
    expect(first.value).toBe(0);
    expect(pool.release(first)).toBe(false);
    expect(pool.release({ id: 99, value: 0 })).toBe(false);
    expect(pool.availableCount).toBe(1);
    expect(pool.acquire()).toBe(first);
    expect(created).toBe(2);
    pool.reset();
    expect(pool.activeCount).toBe(0);
    expect(pool.availableCount).toBe(2);
    expect(pool.size).toBe(2);
  });

  it('keeps allocations stable across many restart and recycle cycles', () => {
    let created = 0;
    const pool = new ObjectPool(() => ({ id: created++ }), undefined, 16);
    for (let run = 0; run < 100; run += 1) {
      for (let frame = 0; frame < 100; frame += 1) {
        const item = pool.acquire();
        expect(item).not.toBeNull();
        if (item !== null) pool.release(item);
      }
      pool.reset();
    }
    expect(created).toBe(1);
    expect(pool.size).toBe(1);
  });
});
