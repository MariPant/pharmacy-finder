import type { Coordinates } from './geo';

export interface Pharmacy {
  /** Stable OSM identifier, e.g. "node/123456". */
  id: string;
  /** Null when OSM has no name, brand or operator for the object. */
  name: string | null;
  /** Null when OSM has no address tags for the object. */
  address: string | null;
  coordinates: Coordinates;
  /** Great-circle distance from the search origin. */
  distanceMeters: number;
  openingHours: string | null;
  phone: string | null;
}

export interface PharmacySearchResult {
  pharmacies: Pharmacy[];
  /** The radius that produced the results (the largest one if nothing was found). */
  radiusMeters: number;
}
