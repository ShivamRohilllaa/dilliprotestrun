import { CHARACTERS } from '../characters/CharacterDefinitions';
import { PURSUERS } from '../characters/PursuerDefinitions';
import { ISSUES } from '../protest/IssueDefinitions';
import { LOCATIONS } from '../locations/LocationDefinitions';
import { browserStorage, type StorageLike } from '../utils/storage';

export const SAVE_KEY = 'dilli-protest-run.save';

export interface SaveSettings {
  sound: boolean;
  music: boolean;
  volume: number;
  vibration: boolean;
  reducedMotion: boolean;
  quality: 'low' | 'medium' | 'high';
}

export interface SaveData {
  version: 1;
  bestScore: number;
  totalCoins: number;
  selectedCharacter: string;
  selectedLocation: string;
  selectedPursuer: string;
  selectedIssue: string;
  unlockedCharacters: string[];
  unlockedLocations: string[];
  settings: SaveSettings;
}

export function defaultSave(): SaveData {
  return {
    version: 1,
    bestScore: 0,
    totalCoins: 0,
    selectedCharacter: CHARACTERS[0].id,
    selectedLocation: 'jantar',
    selectedPursuer: 'mobi',
    selectedIssue: 'vote-chori',
    unlockedCharacters: CHARACTERS.map(({ id }) => id),
    unlockedLocations: ['jantar'],
    settings: {
      sound: true,
      music: true,
      volume: 0.5,
      vibration: true,
      reducedMotion: false,
      quality: 'medium',
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonnegativeInteger(value: unknown): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function unlockedIds(value: unknown, allowed: readonly string[], initial: string): string[] {
  const candidates: unknown[] = Array.isArray(value) ? value : [];
  return [
    ...new Set([
      initial,
      ...candidates.filter((id): id is string => typeof id === 'string' && allowed.includes(id)),
    ]),
  ];
}

function normalizeSave(value: Record<string, unknown>): SaveData {
  const result = defaultSave();
  result.bestScore = nonnegativeInteger(value.bestScore);
  result.totalCoins = nonnegativeInteger(value.totalCoins);
  result.unlockedCharacters = unlockedIds(
    value.unlockedCharacters,
    CHARACTERS.map(({ id }) => id),
    CHARACTERS[0].id,
  );
  result.unlockedLocations = unlockedIds(
    value.unlockedLocations,
    LOCATIONS.map(({ id }) => id),
    'jantar',
  );
  if (
    typeof value.selectedCharacter === 'string' &&
    result.unlockedCharacters.includes(value.selectedCharacter)
  ) {
    result.selectedCharacter = value.selectedCharacter;
  }
  if (
    typeof value.selectedLocation === 'string' &&
    result.unlockedLocations.includes(value.selectedLocation)
  ) {
    result.selectedLocation = value.selectedLocation;
  }
  if (isRecord(value.settings)) {
    const settings = value.settings;
    for (const key of ['sound', 'music', 'vibration', 'reducedMotion'] as const) {
      if (typeof settings[key] === 'boolean') result.settings[key] = settings[key];
    }
    if (typeof settings.volume === 'number' && Number.isFinite(settings.volume)) {
      result.settings.volume = Math.min(1, Math.max(0, settings.volume));
    }
    if (
      settings.quality === 'low' ||
      settings.quality === 'medium' ||
      settings.quality === 'high'
    ) {
      result.settings.quality = settings.quality;
    }
  }
  if (
    typeof value.selectedPursuer === 'string' &&
    PURSUERS.some(({ id }) => id === value.selectedPursuer)
  ) {
    result.selectedPursuer = value.selectedPursuer;
  }
  if (
    typeof value.selectedIssue === 'string' &&
    ISSUES.some(({ id }) => id === value.selectedIssue)
  )
    result.selectedIssue = value.selectedIssue;
  return result;
}

export class SaveManager {
  data: SaveData = defaultSave();
  warning: string | null = null;
  private writeProtected = false;
  private readonly settledRuns = new Set<string>();

  constructor(private readonly storage: StorageLike = browserStorage) {
    let saved: string | null;
    try {
      saved = storage.getItem(SAVE_KEY);
    } catch {
      this.writeProtected = true;
      this.warning =
        'Saved progress could not be read. This session will not overwrite it. Reload when browser storage is available.';
      return;
    }
    if (saved === null) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(saved);
    } catch {
      this.warning = 'The local save could not be read. Starting with safe defaults.';
      return;
    }
    if (isRecord(parsed) && typeof parsed.version === 'number' && parsed.version > 1) {
      this.writeProtected = true;
      this.warning =
        'This save belongs to a newer game version. It is protected; this session cannot replace it.';
      return;
    }
    if (!isRecord(parsed) || parsed.version !== 1) {
      this.warning = 'The local save format is unsupported. Starting with safe defaults.';
      return;
    }
    this.data = normalizeSave(parsed);
  }

  /** A failed write keeps session progress intact, allowing a later write to retry. */
  save(): boolean {
    if (this.writeProtected) return false;
    try {
      this.storage.setItem(SAVE_KEY, JSON.stringify(this.data));
      this.warning = null;
      return true;
    } catch {
      this.warning =
        'Progress is available for this session, but could not be saved. Check browser storage space and permissions.';
      return false;
    }
  }

  /** The UI must confirm this action before calling it. */
  reset(): boolean {
    if (this.writeProtected) return false;
    const previous = this.data;
    this.data = defaultSave();
    if (!this.save()) {
      this.data = previous;
      return false;
    }
    this.settledRuns.clear();
    return true;
  }

  /** Run rewards are banked once; retrying a failed disk write uses save(), not a second settlement. */
  settleRun(runId: string, score: number, coins: number): boolean {
    if (
      !runId ||
      this.settledRuns.has(runId) ||
      !Number.isFinite(score) ||
      score < 0 ||
      !Number.isFinite(coins) ||
      coins < 0
    )
      return false;
    this.settledRuns.add(runId);
    this.data.bestScore = Math.min(
      Number.MAX_SAFE_INTEGER,
      Math.max(this.data.bestScore, Math.floor(score)),
    );
    this.data.totalCoins = Math.min(
      Number.MAX_SAFE_INTEGER,
      this.data.totalCoins + Math.floor(coins),
    );
    this.save();
    return true;
  }
}
