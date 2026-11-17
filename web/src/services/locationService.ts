import { CONFIG } from '../config';
import { AppError, type AppErrorKind } from '../types/errors';
import type { Coordinates } from '../types/geo';

export interface DevicePosition {
  coordinates: Coordinates;
  accuracyMeters: number;
}

export type PositionProvider = () => Promise<DevicePosition>;

// GeolocationPositionError codes.
const PERMISSION_DENIED = 1;
const POSITION_UNAVAILABLE = 2;

function kindForGeolocationError(code: number): AppErrorKind {
  if (code === PERMISSION_DENIED) return 'permission-denied';
  if (code === POSITION_UNAVAILABLE) return 'position-unavailable';
  return 'location-timeout';
}

/**
 * Promise wrapper around the Geolocation API.
 * Note: browsers only expose geolocation in secure contexts (HTTPS or localhost).
 */
export const getCurrentPosition: PositionProvider = () =>
  new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      reject(new AppError('geolocation-unsupported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          coordinates: { latitude: coords.latitude, longitude: coords.longitude },
          accuracyMeters: coords.accuracy,
        }),
      (error) => reject(new AppError(kindForGeolocationError(error.code), error.message)),
      {
        enableHighAccuracy: CONFIG.geolocation.enableHighAccuracy,
        timeout: CONFIG.geolocation.timeoutMs,
        maximumAge: CONFIG.geolocation.maximumAgeMs,
      },
    );
  });
