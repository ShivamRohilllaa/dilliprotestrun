/** A hard-bounded pool. Exhaustion returns null instead of allocating beyond the budget. */
export class ObjectPool<T> {
  private readonly active = new Set<T>();
  private readonly available: T[] = [];
  private readonly created = new Set<T>();

  constructor(
    private readonly create: () => T,
    private readonly resetItem: (item: T) => void = () => {},
    readonly capacity = 128,
  ) {
    if (!Number.isSafeInteger(capacity) || capacity < 0)
      throw new RangeError('Pool capacity must be a nonnegative integer.');
  }

  get activeCount(): number {
    return this.active.size;
  }
  get availableCount(): number {
    return this.available.length;
  }
  get size(): number {
    return this.created.size;
  }

  acquire(): T | null {
    let item: T;
    if (this.available.length > 0) item = this.available.pop() as T;
    else {
      if (this.created.size >= this.capacity) return null;
      item = this.create();
      if (this.created.has(item)) throw new Error('Pool factories must create distinct items.');
      this.created.add(item);
    }
    this.active.add(item);
    return item;
  }

  release(item: T): boolean {
    if (!this.active.delete(item)) return false;
    try {
      this.resetItem(item);
    } finally {
      this.available.push(item);
    }
    return true;
  }

  /** Reclaim every active item when restarting a run; allocations remain reusable. */
  reset(): void {
    for (const item of this.active) this.release(item);
  }
}
