import type { Coordinates } from './types/geo';

export const CONFIG = {
  pharmacySearch: {
    // Primary source: the public Overpass API (required by the assignment).
    overpassEndpoint: 'https://overpass-api.de/api/interpreter',
    // A short declared timeout gets scheduled sooner by busy Overpass servers;
    // a pharmacy lookup normally finishes in well under a second.
    overpassQueryTimeoutSeconds: 8,
    // Fallback source with the same OpenStreetMap data (Geofabrik's SQL API).
    postpassEndpoint: 'https://postpass.geofabrik.de/api/interpreter',
    // Searched in order until at least one pharmacy is found.
    searchRadiiMeters: [2_000, 5_000, 10_000],
    // Client-side limit per request.
    requestTimeoutMs: 10_000,
    retryDelayMs: 300,
    // A source that just failed is skipped for a while, so every search doesn't
    // wait for the same timeout again.
    sourceCooldownMs: 5 * 60_000,
    maxResults: 50,
    cacheTtlMs: 5 * 60_000,
  },
  // "Refresh results" bypasses the cache only if the cached data is older than this,
  // which keeps repeated taps from hammering the public API.
  refreshMinAgeMs: 30_000,
  nominatim: {
    baseUrl: 'https://nominatim.openstreetmap.org',
    // Nominatim usage policy: max. 1 request per second.
    minIntervalMs: 1_100,
    requestTimeoutMs: 10_000,
  },
  geolocation: {
    enableHighAccuracy: true,
    timeoutMs: 15_000,
    maximumAgeMs: 60_000,
  },
  map: {
    // Shown before the user's location is known (centre of Finland).
    initialCenter: { latitude: 64.5, longitude: 26.0 } satisfies Coordinates,
    initialZoom: 5,
    // How many nearest results the map zooms to fit.
    fitNearestCount: 8,
    // Accuracy circles larger than this are noise rather than information.
    maxAccuracyCircleMeters: 2_000,
  },
} as const;
