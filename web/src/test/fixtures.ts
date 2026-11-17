// Demonstration data for tests only. Names and addresses are deliberately fictional.
import type { Coordinates } from '../types/geo';
import type { Pharmacy } from '../types/pharmacy';

export const TEST_ORIGIN: Coordinates = { latitude: 60.9827, longitude: 25.6615 };

/** Raw Overpass payload covering the edge cases the mapper must handle. */
export const overpassPayload = {
  version: 0.6,
  generator: 'Overpass API (test fixture)',
  elements: [
    {
      type: 'node',
      id: 1,
      lat: 60.984,
      lon: 25.66,
      tags: {
        amenity: 'pharmacy',
        name: 'Test Pharmacy North',
        'addr:street': 'Testikatu',
        'addr:housenumber': '1',
        'addr:postcode': '15100',
        'addr:city': 'Lahti',
        opening_hours: 'Mo-Fr 09:00-18:00',
        phone: '+358 3 000 0000',
      },
    },
    // Building outline: coordinates come from `center`.
    {
      type: 'way',
      id: 2,
      center: { lat: 60.98, lon: 25.665 },
      nodes: [10, 11, 12],
      tags: { healthcare: 'pharmacy', brand: 'Test Brand' },
    },
    // No name, no address.
    { type: 'node', id: 3, lat: 60.99, lon: 25.67, tags: { amenity: 'pharmacy' } },
    // Duplicate of node/1: must be ignored.
    {
      type: 'node',
      id: 1,
      lat: 60.984,
      lon: 25.66,
      tags: { amenity: 'pharmacy', name: 'Duplicate' },
    },
    // No coordinates at all: must be skipped.
    { type: 'node', id: 4, tags: { amenity: 'pharmacy', name: 'Nowhere' } },
    // Malformed element: must be filtered out by validation.
    { type: 'node', id: 5, lat: 'not-a-number', lon: 25.6 },
  ],
} as const;

export const emptyOverpassPayload = { version: 0.6, elements: [] } as const;

/** Postpass (GeoJSON) payload with the same pharmacies as the Overpass fixture. */
export const postpassPayload = {
  postpass_properties: { generator: 'Postpass API (test fixture)' },
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [25.66, 60.984] },
      properties: {
        osm_type: 'N',
        osm_id: 1,
        tags: { amenity: 'pharmacy', name: 'Test Pharmacy North', 'addr:street': 'Testikatu' },
      },
    },
    // Building outline, already reduced to a point by the query.
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [25.665, 60.98] },
      properties: {
        osm_type: 'W',
        osm_id: 2,
        tags: { healthcare: 'pharmacy', brand: 'Test Brand' },
      },
    },
    // Unknown OSM type: must be skipped.
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [25.67, 60.99] },
      properties: { osm_type: 'X', osm_id: 3, tags: {} },
    },
    // Missing geometry: must be skipped.
    { type: 'Feature', geometry: null, properties: { osm_type: 'N', osm_id: 4, tags: {} } },
  ],
} as const;

export const emptyPostpassPayload = { type: 'FeatureCollection', features: [] } as const;

export function makePharmacy(overrides: Partial<Pharmacy> = {}): Pharmacy {
  return {
    id: 'node/100',
    name: 'Test Pharmacy',
    address: 'Testikatu 1, 15100 Lahti',
    coordinates: { latitude: 60.98, longitude: 25.66 },
    distanceMeters: 250,
    openingHours: null,
    phone: null,
    ...overrides,
  };
}
