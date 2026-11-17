export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** Where the search point came from: the device GPS or a geocoded address. */
export type OriginSource = 'device' | 'address';

export interface SearchOrigin {
  coordinates: Coordinates;
  source: OriginSource;
  /** Human-readable place name; null until (or if) it can be resolved. */
  label: string | null;
  /** Only available for device locations. */
  accuracyMeters: number | null;
}
