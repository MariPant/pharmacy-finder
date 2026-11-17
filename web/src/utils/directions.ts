import type { Coordinates } from '../types/geo';

export type DirectionsProvider = 'apple' | 'google';

const formatPoint = ({ latitude, longitude }: Coordinates): string => `${latitude},${longitude}`;

/**
 * Builds a universal link that opens the native Maps app when installed and the web
 * version otherwise. Without an explicit origin both providers route from the
 * device's current location.
 */
export function buildDirectionsUrl(
  provider: DirectionsProvider,
  destination: Coordinates,
  origin?: Coordinates,
): string {
  if (provider === 'apple') {
    const params = new URLSearchParams({ daddr: formatPoint(destination) });
    if (origin) params.set('saddr', formatPoint(origin));
    return `https://maps.apple.com/?${params.toString()}`;
  }

  const params = new URLSearchParams({ api: '1', destination: formatPoint(destination) });
  if (origin) params.set('origin', formatPoint(origin));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
