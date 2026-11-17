import { describe, expect, it } from 'vitest';
import { distanceInMeters, isValidCoordinates } from './distance';

describe('distanceInMeters', () => {
  it('returns 0 for identical points', () => {
    const point = { latitude: 60.17, longitude: 24.94 };
    expect(distanceInMeters(point, point)).toBe(0);
  });

  it('matches one degree of latitude (~111.195 km)', () => {
    const distance = distanceInMeters({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 });
    expect(Math.abs(distance - 111_195)).toBeLessThan(1);
  });

  it('computes a known city-to-city distance (Helsinki → Tampere ≈ 160 km)', () => {
    const helsinki = { latitude: 60.1699, longitude: 24.9384 };
    const tampere = { latitude: 61.4978, longitude: 23.761 };
    const distance = distanceInMeters(helsinki, tampere);
    expect(distance).toBeGreaterThan(158_000);
    expect(distance).toBeLessThan(162_000);
  });

  it('is symmetric', () => {
    const a = { latitude: 60.9827, longitude: 25.6615 };
    const b = { latitude: 60.99, longitude: 25.67 };
    expect(distanceInMeters(a, b)).toBeCloseTo(distanceInMeters(b, a), 6);
  });

  it('handles the antimeridian', () => {
    const distance = distanceInMeters(
      { latitude: 0, longitude: 179.9 },
      { latitude: 0, longitude: -179.9 },
    );
    expect(distance).toBeLessThan(23_000);
  });
});

describe('isValidCoordinates', () => {
  it.each([
    [{ latitude: 60, longitude: 25 }, true],
    [{ latitude: 90, longitude: 180 }, true],
    [{ latitude: 91, longitude: 0 }, false],
    [{ latitude: 0, longitude: -181 }, false],
    [{ latitude: Number.NaN, longitude: 0 }, false],
  ])('%o → %s', (coordinates, expected) => {
    expect(isValidCoordinates(coordinates)).toBe(expected);
  });
});
