import { describe, expect, it } from 'vitest';
import { formatCoordinates, formatDistance } from './format';

describe('formatDistance', () => {
  it.each([
    [0, 'en', '0 m'],
    [42.4, 'en', '42 m'],
    [349.6, 'en', '350 m'],
    [999.4, 'en', '999 m'],
    [999.6, 'en', '1.0 km'],
    [1_234, 'en', '1.2 km'],
    [1_234, 'fi', '1,2 km'],
    [9_949, 'en', '9.9 km'],
    [12_345, 'en', '12 km'],
  ] as const)('%d m in %s → %s', (meters, language, expected) => {
    expect(formatDistance(meters, language)).toBe(expected);
  });

  it('treats negative input as zero and non-finite input as unknown', () => {
    expect(formatDistance(-5, 'en')).toBe('0 m');
    expect(formatDistance(Number.NaN, 'en')).toBe('—');
  });
});

describe('formatCoordinates', () => {
  it('uses five decimal places', () => {
    expect(formatCoordinates({ latitude: 60.9827123, longitude: 25.6615 })).toBe(
      '60.98271, 25.66150',
    );
  });
});
