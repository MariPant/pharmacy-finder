import { describe, expect, it } from 'vitest';
import { overpassPayload, TEST_ORIGIN } from '../test/fixtures';
import { AppError } from '../types/errors';
import {
  buildPharmacyQuery,
  extractAddress,
  extractName,
  isOverpassRuntimeError,
  mapOverpassElements,
  parseOverpassResponse,
} from './overpass';

describe('buildPharmacyQuery', () => {
  it('searches both pharmacy tags around the origin and requests centres', () => {
    const query = buildPharmacyQuery(TEST_ORIGIN, 2_000, 25);
    expect(query).toContain('[out:json][timeout:25];');
    expect(query).toContain('nwr["amenity"="pharmacy"](around:2000,60.982700,25.661500);');
    expect(query).toContain('nwr["healthcare"="pharmacy"](around:2000,60.982700,25.661500);');
    expect(query).toContain('out center;');
  });
});

describe('parseOverpassResponse', () => {
  it('keeps valid elements and drops malformed ones', () => {
    const { elements } = parseOverpassResponse(overpassPayload);
    expect(elements).toHaveLength(5);
    expect(elements.some(({ id }) => id === 5)).toBe(false);
  });

  it.each([null, 'text', [], { foo: 1 }, { elements: 'nope' }])(
    'rejects an invalid payload: %o',
    (payload) => {
      expect(() => parseOverpassResponse(payload)).toThrow(AppError);
      try {
        parseOverpassResponse(payload);
      } catch (error) {
        expect((error as AppError).kind).toBe('invalid-response');
      }
    },
  );

  it('detects server-side runtime errors reported in the remark', () => {
    const response = parseOverpassResponse({
      elements: [],
      remark: 'runtime error: Query timed out in "query" at line 3 after 26 seconds.',
    });
    expect(isOverpassRuntimeError(response)).toBe(true);
    expect(isOverpassRuntimeError({ elements: [] })).toBe(false);
  });
});

describe('extractName', () => {
  it('prefers name, then brand, then operator', () => {
    expect(extractName({ name: 'A', brand: 'B', operator: 'C' })).toBe('A');
    expect(extractName({ brand: 'B', operator: 'C' })).toBe('B');
    expect(extractName({ operator: 'C' })).toBe('C');
  });

  it('returns null instead of inventing a name', () => {
    expect(extractName({ amenity: 'pharmacy' })).toBeNull();
    expect(extractName({ name: '   ' })).toBeNull();
    expect(extractName(undefined)).toBeNull();
  });
});

describe('extractAddress', () => {
  it('formats street, house number, postcode and city', () => {
    expect(
      extractAddress({
        'addr:street': 'Testikatu',
        'addr:housenumber': '1',
        'addr:postcode': '15100',
        'addr:city': 'Lahti',
      }),
    ).toBe('Testikatu 1, 15100 Lahti');
  });

  it('uses addr:full when present', () => {
    expect(extractAddress({ 'addr:full': 'Testikatu 5 B, Lahti' })).toBe('Testikatu 5 B, Lahti');
  });

  it('handles partial addresses', () => {
    expect(extractAddress({ 'addr:street': 'Testikatu' })).toBe('Testikatu');
    expect(extractAddress({ 'addr:city': 'Lahti' })).toBe('Lahti');
    expect(extractAddress({ 'addr:housenumber': '7' })).toBeNull();
  });

  it('returns null when there is no address', () => {
    expect(extractAddress({ amenity: 'pharmacy' })).toBeNull();
    expect(extractAddress(undefined)).toBeNull();
  });
});

describe('mapOverpassElements', () => {
  const { elements } = parseOverpassResponse(overpassPayload);
  const pharmacies = mapOverpassElements(elements, TEST_ORIGIN);

  it('de-duplicates, skips elements without coordinates and sorts by distance', () => {
    expect(pharmacies.map(({ id }) => id)).toEqual(['node/1', 'way/2', 'node/3']);
    const distances = pharmacies.map(({ distanceMeters }) => distanceMeters);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
  });

  it('keeps the first occurrence of a duplicate', () => {
    expect(pharmacies[0]?.name).toBe('Test Pharmacy North');
  });

  it('maps all available fields', () => {
    expect(pharmacies[0]).toMatchObject({
      address: 'Testikatu 1, 15100 Lahti',
      openingHours: 'Mo-Fr 09:00-18:00',
      phone: '+358 3 000 0000',
      coordinates: { latitude: 60.984, longitude: 25.66 },
    });
    expect(pharmacies[0]?.distanceMeters).toBeGreaterThan(150);
    expect(pharmacies[0]?.distanceMeters).toBeLessThan(180);
  });

  it('uses the centre of ways', () => {
    expect(pharmacies[1]?.coordinates).toEqual({ latitude: 60.98, longitude: 25.665 });
    expect(pharmacies[1]?.name).toBe('Test Brand');
  });

  it('keeps missing name and address as null', () => {
    expect(pharmacies[2]).toMatchObject({ name: null, address: null, openingHours: null });
  });

  it('applies the result limit after sorting', () => {
    expect(mapOverpassElements(elements, TEST_ORIGIN, 1).map(({ id }) => id)).toEqual(['node/1']);
  });
});
