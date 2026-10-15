/** Minimal storage contract so saves can be tested without a browser. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Access is deliberately lazy: even reading localStorage can throw in private contexts. */
export const browserStorage: StorageLike = {
  getItem(key) {
    if (typeof localStorage === 'undefined') throw new Error('Local storage is unavailable.');
    return localStorage.getItem(key);
  },
  setItem(key, value) {
    if (typeof localStorage === 'undefined') throw new Error('Local storage is unavailable.');
    localStorage.setItem(key, value);
  },
};
