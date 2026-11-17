import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { CONFIG } from '../config';
import type { Language } from '../i18n/translations';
import { createGeocodingService, type GeocodingService } from '../services/geocodingService';
import { getCurrentPosition, type PositionProvider } from '../services/locationService';
import { createPharmacyService, type PharmacyService } from '../services/pharmacyService';
import { toAppError } from '../types/errors';
import type { SearchOrigin } from '../types/geo';
import { isAbortError } from '../utils/abort';
import { finderReducer, initialFinderState, type FinderStage } from './finderReducer';

export interface PharmacyFinderDependencies {
  pharmacyService: PharmacyService;
  geocodingService: GeocodingService;
  getPosition: PositionProvider;
  now: () => number;
}

// Module-level singletons keep the caches alive across re-renders.
const defaultDependencies: PharmacyFinderDependencies = {
  pharmacyService: createPharmacyService(),
  geocodingService: createGeocodingService(),
  getPosition: getCurrentPosition,
  now: Date.now,
};

/**
 * Orchestrates the whole flow: location / address → Overpass search → results.
 * Every user action starts a new "operation"; responses from superseded operations
 * are dropped so a slow request can never overwrite a newer one.
 */
export function usePharmacyFinder(
  language: Language,
  dependencies: PharmacyFinderDependencies = defaultDependencies,
) {
  const { pharmacyService, geocodingService, getPosition, now } = dependencies;
  const [state, dispatch] = useReducer(finderReducer, initialFinderState);

  const controllerRef = useRef<AbortController | null>(null);
  const operationIdRef = useRef(0);
  const lastQueryRef = useRef<string | null>(null);

  const startOperation = useCallback(() => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    operationIdRef.current += 1;
    const id = operationIdRef.current;
    return { signal: controller.signal, isCurrent: () => id === operationIdRef.current };
  }, []);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const fail = useCallback((error: unknown, stage: FinderStage) => {
    dispatch({ type: 'failed', error: toAppError(error), stage });
  }, []);

  const runSearch = useCallback(
    async (
      origin: SearchOrigin,
      operation: { signal: AbortSignal; isCurrent: () => boolean },
      maxCacheAgeMs?: number,
    ) => {
      dispatch({ type: 'search/started' });
      try {
        const result = await pharmacyService.search(origin.coordinates, {
          signal: operation.signal,
          maxCacheAgeMs,
        });
        if (operation.isCurrent()) dispatch({ type: 'search/succeeded', result, at: now() });
      } catch (error) {
        if (!isAbortError(error) && operation.isCurrent()) fail(error, 'search');
      }
    },
    [pharmacyService, now, fail],
  );

  const locate = useCallback(async () => {
    const operation = startOperation();
    dispatch({ type: 'locate/started' });

    const origin = await getPosition().then(
      (position): SearchOrigin => ({
        coordinates: position.coordinates,
        source: 'device',
        label: null,
        accuracyMeters: position.accuracyMeters,
      }),
      (error: unknown) => {
        if (operation.isCurrent()) fail(error, 'location');
        return null;
      },
    );
    if (!origin || !operation.isCurrent()) return;

    dispatch({ type: 'origin/changed', origin });

    // The place name is a nice-to-have: it runs in parallel and failures are ignored.
    geocodingService
      .reverseGeocode(origin.coordinates, language)
      .then((label) => {
        if (label)
          dispatch({ type: 'origin/labelResolved', coordinates: origin.coordinates, label });
      })
      .catch(() => undefined);

    await runSearch(origin, operation);
  }, [startOperation, getPosition, geocodingService, language, runSearch, fail]);

  const searchAddress = useCallback(
    async (rawQuery: string) => {
      const query = rawQuery.trim();
      if (!query) return;
      lastQueryRef.current = query;

      const operation = startOperation();
      dispatch({ type: 'geocode/started' });

      const origin = await geocodingService.geocode(query, language, operation.signal).then(
        (place): SearchOrigin => ({
          coordinates: place.coordinates,
          source: 'address',
          label: place.label,
          accuracyMeters: null,
        }),
        (error: unknown) => {
          if (!isAbortError(error) && operation.isCurrent()) fail(error, 'geocoding');
          return null;
        },
      );
      if (!origin || !operation.isCurrent()) return;

      dispatch({ type: 'origin/changed', origin });
      await runSearch(origin, operation);
    },
    [startOperation, geocodingService, language, runSearch, fail],
  );

  const { origin, status } = state;

  const refresh = useCallback(async () => {
    if (!origin) return;
    await runSearch(origin, startOperation(), CONFIG.refreshMinAgeMs);
  }, [origin, runSearch, startOperation]);

  /** Repeats whatever step failed last. */
  const retry = useCallback(async () => {
    if (status.kind !== 'error') return;
    if (status.stage === 'location') return locate();
    if (status.stage === 'geocoding' && lastQueryRef.current) {
      return searchAddress(lastQueryRef.current);
    }
    return refresh();
  }, [status, locate, searchAddress, refresh]);

  const select = useCallback((id: string | null) => {
    dispatch({ type: 'pharmacy/selected', id });
  }, []);

  const selectedPharmacy = useMemo(
    () => state.pharmacies.find(({ id }) => id === state.selectedId) ?? null,
    [state.pharmacies, state.selectedId],
  );

  return { state, selectedPharmacy, locate, searchAddress, refresh, retry, select };
}
