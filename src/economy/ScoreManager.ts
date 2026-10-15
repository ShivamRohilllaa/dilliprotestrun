/** 2 points per metre; tokens award 25 × streak tier. Every five tokens raises the tier, capped at four. */
export class ScoreManager {
  distance = 0;
  coins = 0;
  combo = 1;
  private coinPoints = 0;
  private streak = 0;
  private readonly collected = new Set<string>();

  get score(): number {
    return Math.floor(this.distance * 2) + this.coinPoints;
  }

  update(distanceDelta: number): void {
    if (Number.isFinite(distanceDelta) && distanceDelta > 0) this.distance += distanceDelta;
  }

  collect(id: string): boolean {
    if (!id || this.collected.has(id)) return false;
    this.collected.add(id);
    this.combo = Math.min(4, 1 + Math.floor(this.streak / 5));
    this.streak += 1;
    this.coins += 1;
    this.coinPoints += 25 * this.combo;
    return true;
  }

  miss(): void {
    this.streak = 0;
    this.combo = 1;
  }

  reset(): void {
    this.distance = 0;
    this.coins = 0;
    this.combo = 1;
    this.coinPoints = 0;
    this.streak = 0;
    this.collected.clear();
  }
}
