import { AppError } from '../types/errors';
import type { Coordinates } from '../types/geo';
import type { OverpassElement } from '../types/overpass';
import {
  buildPharmacyQuery,
  isOverpassRuntimeError,
  parseOverpassResponse,
} from '../utils/overpass';
import { buildPostpassQuery, parsePostpassResponse } from '../utils/postpass';

/** A service that can answer "OpenStreetMap pharmacies within a radius". */
export interface OsmDataSource {
  /** Identifies the source for logging and cool-down bookkeeping. */
  readonly name: string;
  readonly endpoint: string;
  /** Form body for a POST request (`data=<query>`). */
  buildBody(center: Coordinates, radiusMeters: number): URLSearchParams;
  /** Turns the JSON response into elements; throws AppError on invalid data. */
  parse(data: unknown): OverpassElement[];
}

export function createOverpassSource(endpoint: string, queryTimeoutSeconds: number): OsmDataSource {
  return {
    name: 'overpass',
    endpoint,
    buildBody: (center, radiusMeters) =>
      new URLSearchParams({ data: buildPharmacyQuery(center, radiusMeters, queryTimeoutSeconds) }),
    parse(data) {
      const response = parseOverpassResponse(data);
      if (isOverpassRuntimeError(response)) {
        throw new AppError('timeout', response.remark);
      }
      return response.elements;
    },
  };
}

export function createPostpassSource(endpoint: string): OsmDataSource {
  return {
    name: 'postpass',
    endpoint,
    buildBody: (center, radiusMeters) =>
      new URLSearchParams({ data: buildPostpassQuery(center, radiusMeters) }),
    parse: parsePostpassResponse,
  };
}
