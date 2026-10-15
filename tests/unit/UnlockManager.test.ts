import { describe, expect, it } from 'vitest';
import { SaveManager } from '../../src/economy/SaveManager';
import { UnlockManager } from '../../src/economy/UnlockManager';
import { CHARACTERS, characterById } from '../../src/characters/CharacterDefinitions';

function setup(coins = 0) {
  let value: string | null = null;
  const storage = {
    getItem: () => value,
    setItem(_key: string, next: string) {
      value = next;
    },
  };
  const save = new SaveManager(storage);
  save.data.totalCoins = coins;
  return { save, unlock: new UnlockManager(save), storage };
}

describe('UnlockManager', () => {
  it('selects all four free parody runners at zero balance and keeps the selection on reload', () => {
    const { save, unlock, storage } = setup();
    for (const id of ['abhiteep', 'german', 'pappu', 'khujliwaal']) {
      expect(unlock.select('character', id)).toBe(true);
      expect(new SaveManager(storage).data.selectedCharacter).toBe(id);
    }
    expect(save.data.totalCoins).toBe(0);
    expect(save.data.unlockedCharacters).toHaveLength(4);
    expect(unlock.select('character', 'chai')).toBe(false);
  });
  it.each(['runner', 'chai', 'metro', 'meme', 'udhar', 'jaleel'])(
    'rejects removed %s as a selectable or purchasable avatar',
    (id) => {
      const { save, unlock } = setup(80);
      expect(CHARACTERS.some((character) => character.id === id)).toBe(false);
      expect(characterById(id).id).toBe('abhiteep');
      expect(unlock.select('character', id)).toBe(false);
      expect(unlock.purchase('character', id)).toBe('invalid');
      expect(save.data.selectedCharacter).toBe('abhiteep');
      expect(save.data.unlockedCharacters).toEqual(['abhiteep', 'german', 'pappu', 'khujliwaal']);
      expect(save.data.totalCoins).toBe(80);
    },
  );
  it('deducts a location price once despite repeated purchase attempts', () => {
    const { save, unlock, storage } = setup(200);
    expect(unlock.purchase('location', 'ramlila')).toBe('unlocked');
    expect(unlock.purchase('location', 'ramlila')).toBe('owned');
    expect(save.data.totalCoins).toBe(40);
    expect(save.data.unlockedLocations).toEqual(['jantar', 'ramlila']);
    expect(new SaveManager(storage).data.totalCoins).toBe(40);
  });

  it('leaves insufficient funds and ownership unchanged', () => {
    const { save, unlock } = setup(159);
    expect(unlock.purchase('location', 'ramlila')).toBe('insufficient');
    expect(save.data.totalCoins).toBe(159);
    expect(save.data.unlockedLocations).toEqual(['jantar']);
  });

  it('unlocks and selects a location with an exact price balance', () => {
    const { save, unlock, storage } = setup(80);
    expect(unlock.select('location', 'india')).toBe(false);
    expect(unlock.purchase('location', 'india')).toBe('unlocked');
    expect(unlock.select('location', 'india')).toBe(true);
    expect(save.data.totalCoins).toBe(0);
    expect(new SaveManager(storage).data.selectedLocation).toBe('india');
  });

  it('selects owned characters and rejects unknown content', () => {
    const { save, unlock, storage } = setup(80);
    expect(unlock.purchase('character', 'unknown')).toBe('invalid');
    expect(unlock.purchase('location', 'unknown')).toBe('invalid');
    expect(unlock.select('character', 'unknown')).toBe(false);
    expect(unlock.purchase('character', 'abhiteep')).toBe('owned');
    expect(unlock.purchase('character', 'pappu')).toBe('owned');
    expect(unlock.select('character', 'pappu')).toBe(true);
    expect(new SaveManager(storage).data.selectedCharacter).toBe('pappu');
    expect(save.data.totalCoins).toBe(80);
  });
});
