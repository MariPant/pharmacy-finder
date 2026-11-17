import type { Coordinates } from '../types/geo';

/** Mean Earth radius (IUGG), metres. */
const EARTH_RADIUS_METERS = 6_371_008.8;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/** Great-circle distance between two points using the haversine formula. */
export function distanceInMeters(from: Coordinates, to: Coordinates): number {
  const deltaLatitude = toRadians(to.latitude - from.latitude);
  const deltaLongitude = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);

  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(deltaLongitude / 2) ** 2;

  // Clamp guards against floating-point values slightly above 1.
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

export function isValidCoordinates({ latitude, longitude }: Coordinates): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  );
}
