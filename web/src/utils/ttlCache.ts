interface CacheEntry<V> {
  value: V;
  storedAt: number;
}

/** Small in-memory cache with time-to-live and a size cap (oldest entry evicted first). */
export class TtlCache<V> {
  private readonly entries = new Map<string, CacheEntry<V>>();
  private readonly ttlMs: number;
  private readonly now: () => number;
  private readonly maxEntries: number;

  constructor(ttlMs: number, now: () => number = Date.now, maxEntries = 50) {
    this.ttlMs = ttlMs;
    this.now = now;
    this.maxEntries = maxEntries;
  }

  /** @param maxAgeMs Optional stricter freshness requirement for this read. */
  get(key: string, maxAgeMs: number = this.ttlMs): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;

    const age = this.now() - entry.storedAt;
    if (age > this.ttlMs) {
      this.entries.delete(key);
      return undefined;
    }
    return age > maxAgeMs ? undefined : entry.value;
  }

  set(key: string, value: V): void {
    this.entries.delete(key);
    if (this.entries.size >= this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey !== undefined) this.entries.delete(oldestKey);
    }
    this.entries.set(key, { value, storedAt: this.now() });
  }

  clear(): void {
    this.entries.clear();
  }
}
