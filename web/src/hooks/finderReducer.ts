import type { AppError } from '../types/errors';
import type { Coordinates, SearchOrigin } from '../types/geo';
import type { Pharmacy, PharmacySearchResult } from '../types/pharmacy';

export type FinderStage = 'location' | 'geocoding' | 'search';

/** A discriminated union makes impossible states (e.g. "loading with an error") unrepresentable. */
export type FinderStatus =
  | { kind: 'idle' }
  | { kind: 'locating' }
  | { kind: 'geocoding' }
  | { kind: 'searching' }
  | { kind: 'success' }
  | { kind: 'error'; error: AppError; stage: FinderStage };

export interface FinderState {
  status: FinderStatus;
  origin: SearchOrigin | null;
  pharmacies: Pharmacy[];
  radiusMeters: number | null;
  selectedId: string | null;
  updatedAt: number | null;
}

export type FinderAction =
  | { type: 'locate/started' }
  | { type: 'geocode/started' }
  | { type: 'origin/changed'; origin: SearchOrigin }
  | { type: 'origin/labelResolved'; coordinates: Coordinates; label: string }
  | { type: 'search/started' }
  | { type: 'search/succeeded'; result: PharmacySearchResult; at: number }
  | { type: 'failed'; error: AppError; stage: FinderStage }
  | { type: 'pharmacy/selected'; id: string | null };

export const initialFinderState: FinderState = {
  status: { kind: 'idle' },
  origin: null,
  pharmacies: [],
  radiusMeters: null,
  selectedId: null,
  updatedAt: null,
};

const sameCoordinates = (a: Coordinates, b: Coordinates): boolean =>
  a.latitude === b.latitude && a.longitude === b.longitude;

export function finderReducer(state: FinderState, action: FinderAction): FinderState {
  switch (action.type) {
    case 'locate/started':
      return { ...state, status: { kind: 'locating' } };

    case 'geocode/started':
      return { ...state, status: { kind: 'geocoding' } };

    case 'origin/changed':
      // Distances of old results are relative to the old origin, so they are dropped.
      return {
        ...state,
        origin: action.origin,
        pharmacies: [],
        radiusMeters: null,
        selectedId: null,
        updatedAt: null,
      };

    case 'origin/labelResolved':
      // Reverse geocoding is asynchronous; ignore answers for an origin that has since changed.
      if (!state.origin || !sameCoordinates(state.origin.coordinates, action.coordinates)) {
        return state;
      }
      return { ...state, origin: { ...state.origin, label: action.label } };

    case 'search/started':
      return { ...state, status: { kind: 'searching' } };

    case 'search/succeeded': {
      const { pharmacies, radiusMeters } = action.result;
      const selectionStillExists = pharmacies.some(({ id }) => id === state.selectedId);
      return {
        ...state,
        status: { kind: 'success' },
        pharmacies,
        radiusMeters,
        selectedId: selectionStillExists ? state.selectedId : null,
        updatedAt: action.at,
      };
    }

    case 'failed':
      // Previous results stay visible so a failed refresh doesn't wipe the list.
      return { ...state, status: { kind: 'error', error: action.error, stage: action.stage } };

    case 'pharmacy/selected':
      return { ...state, selectedId: action.id };
  }
}

export const isBusy = (status: FinderStatus): boolean =>
  status.kind === 'locating' || status.kind === 'geocoding' || status.kind === 'searching';
