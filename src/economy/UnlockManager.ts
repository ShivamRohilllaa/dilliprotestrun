import { CHARACTERS } from '../characters/CharacterDefinitions';
import { LOCATIONS } from '../locations/LocationDefinitions';
import type { SaveManager } from './SaveManager';

export type UnlockKind = 'character' | 'location';
export type PurchaseResult = 'unlocked' | 'owned' | 'insufficient' | 'invalid';

export class UnlockManager {
  constructor(private readonly save: SaveManager) {}

  purchase(kind: UnlockKind, id: string): PurchaseResult {
    const definition = (kind === 'character' ? CHARACTERS : LOCATIONS).find(
      (entry) => entry.id === id,
    );
    if (!definition) return 'invalid';
    const unlocked =
      kind === 'character' ? this.save.data.unlockedCharacters : this.save.data.unlockedLocations;
    if (unlocked.includes(id)) return 'owned';
    if (this.save.data.totalCoins < definition.price) return 'insufficient';
    // No await between checking ownership and recording it: rapid clicks cannot buy twice.
    this.save.data.totalCoins -= definition.price;
    unlocked.push(id);
    this.save.save();
    return 'unlocked';
  }

  select(kind: UnlockKind, id: string): boolean {
    const definition = (kind === 'character' ? CHARACTERS : LOCATIONS).find(
      (entry) => entry.id === id,
    );
    if (!definition) return false;
    const unlocked =
      kind === 'character' ? this.save.data.unlockedCharacters : this.save.data.unlockedLocations;
    if (!unlocked.includes(id) && definition.price === 0) unlocked.push(id);
    if (!unlocked.includes(id)) return false;
    if (kind === 'character') this.save.data.selectedCharacter = id;
    else this.save.data.selectedLocation = id;
    this.save.save();
    return true;
  }
}
