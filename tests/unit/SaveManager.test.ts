import { describe, expect, it } from 'vitest';
import { defaultSave, SAVE_KEY, SaveManager } from '../../src/economy/SaveManager';
import type { StorageLike } from '../../src/utils/storage';

function memoryStorage(
  initial: string | null = null,
): StorageLike & { value: string | null; writes: number } {
  return {
    value: initial,
    writes: 0,
    getItem(key) {
      expect(key).toBe(SAVE_KEY);
      return this.value;
    },
    setItem(key, value) {
      expect(key).toBe(SAVE_KEY);
      this.value = value;
      this.writes += 1;
    },
  };
}

describe('SaveManager', () => {
  it.each(['runner', 'chai', 'metro', 'meme', 'udhar', 'jaleel'])(
    'migrates a formerly selected %s to abhiteep while retaining earned progress',
    (id) => {
      const storage = memoryStorage(
        JSON.stringify({
          version: 1,
          totalCoins: 275,
          bestScore: 12890,
          selectedCharacter: id,
          unlockedCharacters: ['runner', 'chai', 'metro', 'meme', 'udhar', 'jaleel', 'pappu'],
          selectedLocation: 'india',
          unlockedLocations: ['jantar', 'india'],
          selectedPursuer: 'baba',
          selectedIssue: 'gyaanu',
        }),
      );
      const save = new SaveManager(storage);
      expect(save.data).toMatchObject({
        totalCoins: 275,
        bestScore: 12890,
        selectedCharacter: 'abhiteep',
        unlockedCharacters: ['abhiteep', 'pappu'],
        selectedLocation: 'india',
        unlockedLocations: ['jantar', 'india'],
        selectedPursuer: 'baba',
        selectedIssue: 'gyaanu',
      });
      expect(save.save()).toBe(true);
      expect(new SaveManager(storage).data).toEqual(save.data);
    },
  );
  it('migrates old version-one saves without losing progress and validates the new pursuer', () => {
    const oldSave = {
      version: 1,
      totalCoins: 130,
      bestScore: 1200,
      selectedCharacter: 'chai',
      unlockedCharacters: ['runner', 'chai'],
    };
    const migrated = new SaveManager(memoryStorage(JSON.stringify(oldSave)));
    expect(migrated.data).toMatchObject({
      totalCoins: 130,
      bestScore: 1200,
      selectedCharacter: 'abhiteep',
      selectedPursuer: 'mobi',
      selectedIssue: 'vote-chori',
    });
    expect(
      new SaveManager(memoryStorage(JSON.stringify({ ...oldSave, selectedPursuer: 'rss' }))).data
        .selectedPursuer,
    ).toBe('rss');
    expect(
      new SaveManager(memoryStorage(JSON.stringify({ ...oldSave, selectedPursuer: 'invalid' })))
        .data.selectedPursuer,
    ).toBe('mobi');
  });
  it('starts with safe independent defaults when storage is empty', () => {
    const first = new SaveManager(memoryStorage());
    const second = new SaveManager(memoryStorage());
    first.data.unlockedCharacters.pop();
    expect(second.data).toEqual(defaultSave());
    expect(first.warning).toBeNull();
  });

  it('preserves valid progress, selections and settings after reload', () => {
    const storage = memoryStorage();
    const first = new SaveManager(storage);
    first.data.bestScore = 450;
    first.data.totalCoins = 96;
    first.data.selectedCharacter = 'german';
    first.data.unlockedLocations.push('india');
    first.data.selectedLocation = 'india';
    first.data.selectedIssue = 'dharam';
    first.data.settings = {
      sound: false,
      music: false,
      volume: 0.7,
      vibration: false,
      reducedMotion: true,
      quality: 'low',
    };
    expect(first.save()).toBe(true);
    expect(new SaveManager(storage).data).toEqual(first.data);
  });

  it.each(['{invalid', 'null', '[]', '"hello"', '{"version":0}'])(
    'falls back safely for malformed or outdated data: %s',
    (input) => {
      const save = new SaveManager(memoryStorage(input));
      expect(save.data).toEqual(defaultSave());
      expect(save.warning).not.toBeNull();
      expect(save.save()).toBe(true);
    },
  );

  it('rejects invalid values and identifiers while retaining valid progress', () => {
    const save = new SaveManager(
      memoryStorage(
        JSON.stringify({
          version: 1,
          bestScore: -300,
          totalCoins: 80,
          unlockedCharacters: ['german', 'german', 'intruder', null],
          unlockedLocations: ['india', 'nowhere'],
          selectedCharacter: 'metro',
          selectedLocation: 'india',
          selectedIssue: 'unknown-issue',
          settings: {
            sound: 'false',
            music: false,
            volume: 99,
            quality: 'ultra',
            reducedMotion: true,
          },
        }),
      ),
    );
    expect(save.data.bestScore).toBe(0);
    expect(save.data.totalCoins).toBe(80);
    expect(save.data.unlockedCharacters).toEqual(['abhiteep', 'german']);
    expect(save.data.unlockedLocations).toEqual(['jantar', 'india']);
    expect(save.data.selectedCharacter).toBe('abhiteep');
    expect(save.data.selectedLocation).toBe('india');
    expect(save.data.selectedIssue).toBe('vote-chori');
    expect(save.data.settings).toMatchObject({
      sound: true,
      music: false,
      volume: 1,
      quality: 'medium',
      reducedMotion: true,
    });
  });

  it('never overwrites a save from a newer version, even when reset is requested', () => {
    const original = JSON.stringify({ version: 2, totalCoins: 5000 });
    const storage = memoryStorage(original);
    const save = new SaveManager(storage);
    expect(save.save()).toBe(false);
    expect(save.reset()).toBe(false);
    expect(storage.value).toBe(original);
    expect(storage.writes).toBe(0);
    expect(save.warning).toContain('newer');
  });

  it('protects unread progress when the initial read throws', () => {
    let writes = 0;
    const save = new SaveManager({
      getItem() {
        throw new Error('SecurityError');
      },
      setItem() {
        writes += 1;
      },
    });
    expect(save.settleRun('session-run', 300, 12)).toBe(true);
    expect(save.data.totalCoins).toBe(12);
    expect(save.save()).toBe(false);
    expect(save.reset()).toBe(false);
    expect(writes).toBe(0);
    expect(save.warning).toContain('could not be read');
  });

  it('keeps session progress on quota failure and allows a successful later retry', () => {
    const storage = memoryStorage();
    let blocked = true;
    const save = new SaveManager({
      getItem: () => storage.getItem(SAVE_KEY),
      setItem(key, value) {
        if (blocked) throw new Error('QuotaExceededError');
        storage.setItem(key, value);
      },
    });
    expect(save.settleRun('run-1', 250, 9)).toBe(true);
    expect(save.data.totalCoins).toBe(9);
    expect(save.warning).toContain('could not be saved');
    expect(save.settleRun('run-1', 250, 9)).toBe(false);
    blocked = false;
    expect(save.save()).toBe(true);
    expect(new SaveManager(storage).data.totalCoins).toBe(9);
    expect(save.warning).toBeNull();
  });

  it('settles each run once and retains the highest score', () => {
    const save = new SaveManager(memoryStorage());
    expect(save.settleRun('first', 400, 6)).toBe(true);
    expect(save.settleRun('first', 400, 6)).toBe(false);
    expect(save.settleRun('second', 230, 4)).toBe(true);
    expect(save.data.bestScore).toBe(400);
    expect(save.data.totalCoins).toBe(10);
    expect(save.settleRun('bad', Number.NaN, 10)).toBe(false);
    expect(save.settleRun('bad', 100, -5)).toBe(false);
    expect(save.settleRun('', 100, 5)).toBe(false);
  });

  it('resets saved progress and selection to defaults', () => {
    const storage = memoryStorage();
    const save = new SaveManager(storage);
    save.settleRun('first', 400, 6);
    expect(save.reset()).toBe(true);
    expect(save.data).toEqual(defaultSave());
    expect(new SaveManager(storage).data).toEqual(defaultSave());
  });

  it('does not erase the current session if reset cannot be persisted', () => {
    const save = new SaveManager({
      getItem: () => null,
      setItem() {
        throw new Error('QuotaExceededError');
      },
    });
    save.data.totalCoins = 80;
    expect(save.reset()).toBe(false);
    expect(save.data.totalCoins).toBe(80);
  });
});
