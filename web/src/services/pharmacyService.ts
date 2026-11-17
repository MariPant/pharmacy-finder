import { CONFIG } from '../config';
import { AppError } from '../types/errors';
import type { Coordinates } from '../types/geo';
import type { OverpassElement } from '../types/overpass';
import type { PharmacySearchResult } from '../types/pharmacy';
import { sleep } from '../utils/abort';
import { mapOverpassElements } from '../utils/overpass';
import { TtlCache } from '../utils/ttlCache';
import { createOverpassSource, createPostpassSource, type OsmDataSource } from './dataSources';
import { defaultFetch, fetchJson, type FetchFunction } from './http';

export interface PharmacySearchOptions {
  signal?: AbortSignal;
  /** Accept cached data only if it is younger than this. Defaults to the cache TTL. */
  maxCacheAgeMs?: number;
}

export interface PharmacyService {
  search(origin: Coordinates, options?: PharmacySearchOptions): Promise<PharmacySearchResult>;
}

export interface PharmacyServiceDependencies {
  fetchImpl?: FetchFunction;
  /** Tried in order; the first one that answers wins. */
  sources?: readonly OsmDataSource[];
  radiiMeters?: readonly number[];
  requestTimeoutMs?: number;
  retryDelayMs?: number;
  sourceCooldownMs?: number;
  maxResults?: number;
  cache?: TtlCache<OverpassElement[]>;
  now?: () => number;
}

const { pharmacySearch } = CONFIG;

const defaultSources: readonly OsmDataSource[] = [
  createOverpassSource(pharmacySearch.overpassEndpoint, pharmacySearch.overpassQueryTimeoutSeconds),
  createPostpassSource(pharmacySearch.postpassEndpoint),
];

/** ~110 m grid: nearby origins reuse the same response. */
const cacheKey = ({ latitude, longitude }: Coordinates, radiusMeters: number): string =>
  `${radiusMeters}:${latitude.toFixed(3)}:${longitude.toFixed(3)}`;

/**
 * Any API failure should hand over to the next source; only a missing connection
 * (no source can help) and caller cancellation stop immediately.
 */
const shouldTryNextSource = (error: unknown): error is AppError =>
  error instanceof AppError && error.kind !== 'offline';

export function createPharmacyService({
  fetchImpl = defaultFetch,
  sources = defaultSources,
  radiiMeters = pharmacySearch.searchRadiiMeters,
  requestTimeoutMs = pharmacySearch.requestTimeoutMs,
  retryDelayMs = pharmacySearch.retryDelayMs,
  sourceCooldownMs = pharmacySearch.sourceCooldownMs,
  maxResults = pharmacySearch.maxResults,
  cache = new TtlCache<OverpassElement[]>(pharmacySearch.cacheTtlMs),
  now = Date.now,
}: PharmacyServiceDependencies = {}): PharmacyService {
  const unavailableUntil = new Map<string, number>();

  /** Sources that recently failed are skipped, except the last one, which is always tried. */
  const availableSources = (): OsmDataSource[] =>
    sources.filter(
      (source, index) =>
        index === sources.length - 1 || (unavailableUntil.get(source.name) ?? 0) <= now(),
    );

  async function fetchElements(
    center: Coordinates,
    radiusMeters: number,
    signal?: AbortSignal,
  ): Promise<OverpassElement[]> {
    let lastError: AppError | null = null;

    for (const [index, source] of availableSources().entries()) {
      if (index > 0) await sleep(retryDelayMs, signal);
      try {
        const data = await fetchJson(source.endpoint, {
          timeoutMs: requestTimeoutMs,
          signal,
          fetchImpl,
          init: { method: 'POST', body: source.buildBody(center, radiusMeters) },
        });
        const elements = source.parse(data);
        unavailableUntil.delete(source.name);
        return elements;
      } catch (error) {
        if (!shouldTryNextSource(error)) throw error;
        lastError = error;
        unavailableUntil.set(source.name, now() + sourceCooldownMs);
      }
    }

    throw lastError ?? new AppError('server', 'No pharmacy data sources configured');
  }

  async function getElements(
    origin: Coordinates,
    radiusMeters: number,
    { signal, maxCacheAgeMs }: PharmacySearchOptions,
  ): Promise<OverpassElement[]> {
    const key = cacheKey(origin, radiusMeters);
    const cached = cache.get(key, maxCacheAgeMs);
    if (cached) return cached;

    const elements = await fetchElements(origin, radiusMeters, signal);
    cache.set(key, elements);
    return elements;
  }

  return {
    async search(origin, options = {}) {
      // Start small and widen only when nothing is found: dense cities get a fast,
      // light query while rural areas still get results.
      for (const radiusMeters of radiiMeters) {
        const elements = await getElements(origin, radiusMeters, options);
        const pharmacies = mapOverpassElements(elements, origin, maxResults);
        if (pharmacies.length > 0) return { pharmacies, radiusMeters };
      }
      return { pharmacies: [], radiusMeters: radiiMeters.at(-1) ?? 0 };
    },
  };
}
