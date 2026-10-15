export interface TestSnapshot {
  state: string;
  lane: number;
  x: number;
  y: number;
  sliding: boolean;
  distance: number;
  coins: number;
  score: number;
  pressure: number;
  pursuer: string;
  speed: number;
  crowdCount: number;
  chaserCount: number;
  crowdStyle: string | null;
  reinforcements: boolean;
  objects: number;
  geometryCount: number;
  drawCalls: number;
}
export interface TestHarness {
  snapshot: () => TestSnapshot;
  advance: (seconds: number) => void;
  crash: () => void;
  grantCoins: (amount: number) => void;
  unlockAll: () => void;
  manual: (enabled: boolean) => void;
}
declare global {
  interface Window {
    __DILLI_TEST__?: TestHarness;
  }
}
export function installTestHarness(harness: TestHarness): void {
  if (import.meta.env.DEV && import.meta.env.VITE_E2E === 'true') window.__DILLI_TEST__ = harness;
}
