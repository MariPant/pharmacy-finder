import { describe, expect, it } from 'vitest';
import { makePharmacy } from '../test/fixtures';
import { AppError } from '../types/errors';
import type { SearchOrigin } from '../types/geo';
import { finderReducer, initialFinderState, type FinderState } from './finderReducer';

const origin: SearchOrigin = {
  coordinates: { latitude: 60.98, longitude: 25.66 },
  source: 'device',
  label: null,
  accuracyMeters: 12,
};

const withResults: FinderState = {
  ...initialFinderState,
  status: { kind: 'success' },
  origin,
  pharmacies: [makePharmacy({ id: 'node/1' }), makePharmacy({ id: 'node/2' })],
  radiusMeters: 2_000,
  selectedId: 'node/2',
  updatedAt: 1,
};

describe('finderReducer', () => {
  it('clears results that belong to the previous origin', () => {
    const next = finderReducer(withResults, {
      type: 'origin/changed',
      origin: { ...origin, coordinates: { latitude: 61, longitude: 25 } },
    });
    expect(next.pharmacies).toEqual([]);
    expect(next.selectedId).toBeNull();
    expect(next.radiusMeters).toBeNull();
  });

  it('keeps the selection when it survives a refresh', () => {
    const next = finderReducer(withResults, {
      type: 'search/succeeded',
      result: { pharmacies: [makePharmacy({ id: 'node/2' })], radiusMeters: 2_000 },
      at: 2,
    });
    expect(next.selectedId).toBe('node/2');
    expect(next.status).toEqual({ kind: 'success' });
  });

  it('drops the selection when the pharmacy disappears', () => {
    const next = finderReducer(withResults, {
      type: 'search/succeeded',
      result: { pharmacies: [makePharmacy({ id: 'node/1' })], radiusMeters: 2_000 },
      at: 2,
    });
    expect(next.selectedId).toBeNull();
  });

  it('keeps previous results visible when a refresh fails', () => {
    const error = new AppError('timeout');
    const next = finderReducer(withResults, { type: 'failed', error, stage: 'search' });
    expect(next.status).toEqual({ kind: 'error', error, stage: 'search' });
    expect(next.pharmacies).toHaveLength(2);
  });

  it('ignores a place label that arrives for an outdated origin', () => {
    const next = finderReducer(withResults, {
      type: 'origin/labelResolved',
      coordinates: { latitude: 1, longitude: 1 },
      label: 'Somewhere else',
    });
    expect(next).toBe(withResults);

    const updated = finderReducer(withResults, {
      type: 'origin/labelResolved',
      coordinates: origin.coordinates,
      label: 'Testikatu, Lahti',
    });
    expect(updated.origin?.label).toBe('Testikatu, Lahti');
  });
});
