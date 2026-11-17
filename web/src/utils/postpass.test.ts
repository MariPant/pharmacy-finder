import { describe, expect, it } from 'vitest';
import { postpassPayload, TEST_ORIGIN } from '../test/fixtures';
import { AppError } from '../types/errors';
import { buildPostpassQuery, parsePostpassResponse } from './postpass';

describe('buildPostpassQuery', () => {
  const query = buildPostpassQuery(TEST_ORIGIN, 2_000);

  it('filters the same pharmacy tags as the Overpass query', () => {
    expect(query).toContain("tags->>'amenity' = 'pharmacy' OR tags->>'healthcare' = 'pharmacy'");
    expect(query).toContain('FROM postpass_pointpolygon');
    expect(query).toContain('ST_PointOnSurface(geom)');
  });

  it('limits results to the radius around the origin', () => {
    expect(query).toContain('ST_MakePoint(25.661500, 60.982700)');
    expect(query).toContain('::geography, 2000)');
  });

  it('adds a bounding box wide enough for the radius', () => {
    const envelope = /ST_MakeEnvelope\(([-\d.]+), ([-\d.]+), ([-\d.]+), ([-\d.]+), 4326\)/.exec(
      query,
    );
    expect(envelope).not.toBeNull();
    const [minLon, minLat, maxLon, maxLat] = (envelope ?? []).slice(1).map(Number);
    // 2 km ≈ 0.018° of latitude; longitude degrees are shorter at 61° N, so the box is wider.
    expect((maxLat ?? 0) - (minLat ?? 0)).toBeCloseTo(0.0359, 3);
    expect((maxLon ?? 0) - (minLon ?? 0)).toBeGreaterThan((maxLat ?? 0) - (minLat ?? 0));
  });
});

describe('parsePostpassResponse', () => {
  it('converts GeoJSON features into OSM elements and skips malformed ones', () => {
    expect(parsePostpassResponse(postpassPayload)).toEqual([
      {
        type: 'node',
        id: 1,
        lat: 60.984,
        lon: 25.66,
        tags: { amenity: 'pharmacy', name: 'Test Pharmacy North', 'addr:street': 'Testikatu' },
      },
      {
        type: 'way',
        id: 2,
        lat: 60.98,
        lon: 25.665,
        tags: { healthcare: 'pharmacy', brand: 'Test Brand' },
      },
    ]);
  });

  it.each([null, [], { type: 'Feature' }, { type: 'FeatureCollection', features: 'nope' }])(
    'rejects an invalid payload: %o',
    (payload) => {
      expect(() => parsePostpassResponse(payload)).toThrow(AppError);
    },
  );
});
