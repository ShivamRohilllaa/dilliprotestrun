import { describe, expect, it } from 'vitest';
import { ScoreManager } from '../../src/economy/ScoreManager';
import { SaveManager } from '../../src/economy/SaveManager';

describe('ScoreManager', () => {
  it('awards two points per metre and ignores invalid backwards distance', () => {
    const score = new ScoreManager();
    score.update(10.75);
    score.update(-5);
    score.update(Number.NaN);
    score.update(Number.POSITIVE_INFINITY);
    expect(score.distance).toBe(10.75);
    expect(score.score).toBe(21);
  });

  it('counts a collectible exactly once', () => {
    const score = new ScoreManager();
    expect(score.collect('token-1')).toBe(true);
    expect(score.collect('token-1')).toBe(false);
    expect(score.collect('')).toBe(false);
    expect(score.coins).toBe(1);
    expect(score.score).toBe(25);
  });

  it('raises the multiplier every five consecutive coins and caps it at four', () => {
    const score = new ScoreManager();
    for (let index = 0; index < 20; index += 1) score.collect(`token-${index}`);
    expect(score.coins).toBe(20);
    expect(score.combo).toBe(4);
    expect(score.score).toBe(1250);
    score.collect('extra');
    expect(score.score).toBe(1350);
  });

  it('a miss resets the streak without changing previously awarded points', () => {
    const score = new ScoreManager();
    for (let index = 0; index < 6; index += 1) score.collect(`token-${index}`);
    expect(score.combo).toBe(2);
    expect(score.score).toBe(175);
    score.miss();
    expect(score.combo).toBe(1);
    expect(score.score).toBe(175);
    score.collect('next');
    expect(score.score).toBe(200);
  });

  it('restart clears temporary state while banked progress stays intact', () => {
    const score = new ScoreManager();
    const save = new SaveManager({ getItem: () => null, setItem() {} });
    score.update(100);
    score.collect('token');
    save.settleRun('run', score.score, score.coins);
    score.reset();
    expect(score.distance).toBe(0);
    expect(score.coins).toBe(0);
    expect(score.score).toBe(0);
    expect(score.combo).toBe(1);
    expect(save.data.totalCoins).toBe(1);
    expect(save.data.bestScore).toBe(225);
    expect(score.collect('token')).toBe(true);
  });
});
