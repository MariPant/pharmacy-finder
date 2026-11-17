import { describe, expect, it } from 'vitest';
import { makePharmacy } from '../test/fixtures';
import { sortByDistance } from './sortPharmacies';

describe('sortByDistance', () => {
  it('orders pharmacies from nearest to farthest', () => {
    const far = makePharmacy({ id: 'node/1', distanceMeters: 2_000 });
    const near = makePharmacy({ id: 'node/2', distanceMeters: 150 });
    const middle = makePharmacy({ id: 'node/3', distanceMeters: 900 });

    expect(sortByDistance([far, near, middle]).map(({ id }) => id)).toEqual([
      'node/2',
      'node/3',
      'node/1',
    ]);
  });

  it('does not mutate the input array', () => {
    const input = [
      makePharmacy({ id: 'node/1', distanceMeters: 500 }),
      makePharmacy({ id: 'node/2', distanceMeters: 100 }),
    ];
    const snapshot = [...input];
    sortByDistance(input);
    expect(input).toEqual(snapshot);
  });

  it('breaks distance ties by name, unnamed last, then by id', () => {
    const unnamed = makePharmacy({ id: 'node/1', name: null, distanceMeters: 300 });
    const beta = makePharmacy({ id: 'node/2', name: 'Beta', distanceMeters: 300 });
    const alpha = makePharmacy({ id: 'node/3', name: 'Alpha', distanceMeters: 300 });
    const alphaTwin = makePharmacy({ id: 'node/0', name: 'Alpha', distanceMeters: 300 });

    expect(sortByDistance([unnamed, beta, alpha, alphaTwin]).map(({ id }) => id)).toEqual([
      'node/0',
      'node/3',
      'node/2',
      'node/1',
    ]);
  });

  it('handles an empty list', () => {
    expect(sortByDistance([])).toEqual([]);
  });
});
