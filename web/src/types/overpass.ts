export type OverpassElementType = 'node' | 'way' | 'relation';

/** Subset of an Overpass element that the app relies on. */
export interface OverpassElement {
  type: OverpassElementType;
  id: number;
  /** Present on nodes. */
  lat?: number;
  lon?: number;
  /** Present on ways and relations when the query uses `out center`. */
  center?: { lat: number; lon: number };
  tags?: Readonly<Record<string, string>>;
}

export interface OverpassResponse {
  elements: OverpassElement[];
  /** Overpass reports server-side problems (e.g. query timeouts) here with HTTP 200. */
  remark?: string;
}
