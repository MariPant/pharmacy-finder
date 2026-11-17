import { AppError } from '../types/errors';
import type { Coordinates } from '../types/geo';
import type { OverpassElement, OverpassElementType } from '../types/overpass';

// Postpass (https://postpass.geofabrik.de) exposes OpenStreetMap data through SQL/PostGIS.
// Its results are converted to the same element shape as Overpass results, so the rest
// of the app doesn't know which source answered.

const METERS_PER_DEGREE_LATITUDE = 111_320;

/** Bounding box around a circle, used so PostGIS can use its spatial index. */
function boundingBox({ latitude, longitude }: Coordinates, radiusMeters: number) {
  const deltaLatitude = radiusMeters / METERS_PER_DEGREE_LATITUDE;
  const cosLatitude = Math.max(Math.cos((latitude * Math.PI) / 180), 0.01);
  const deltaLongitude = radiusMeters / (METERS_PER_DEGREE_LATITUDE * cosLatitude);
  return {
    minLongitude: longitude - deltaLongitude,
    minLatitude: latitude - deltaLatitude,
    maxLongitude: longitude + deltaLongitude,
    maxLatitude: latitude + deltaLatitude,
  };
}

/**
 * Same filter as the Overpass query: `amenity=pharmacy` or `healthcare=pharmacy` on points
 * and building outlines. `ST_PointOnSurface` turns outlines into a single point.
 * All values are numbers formatted by the app, so no user input reaches the SQL.
 */
export function buildPostpassQuery(center: Coordinates, radiusMeters: number): string {
  const box = boundingBox(center, radiusMeters);
  const point = `ST_SetSRID(ST_MakePoint(${center.longitude.toFixed(6)}, ${center.latitude.toFixed(6)}), 4326)`;
  return [
    'SELECT osm_type, osm_id, tags, ST_PointOnSurface(geom) AS geom',
    'FROM postpass_pointpolygon',
    "WHERE (tags->>'amenity' = 'pharmacy' OR tags->>'healthcare' = 'pharmacy')",
    `  AND geom && ST_MakeEnvelope(${box.minLongitude.toFixed(6)}, ${box.minLatitude.toFixed(6)}, ${box.maxLongitude.toFixed(6)}, ${box.maxLatitude.toFixed(6)}, 4326)`,
    `  AND ST_DWithin(geom::geography, ${point}::geography, ${Math.round(radiusMeters)})`,
    'LIMIT 200',
  ].join('\n');
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const OSM_TYPES: Record<string, OverpassElementType> = { N: 'node', W: 'way', R: 'relation' };

function toStringTags(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) return undefined;
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
}

function toElement(feature: unknown): OverpassElement | null {
  if (!isRecord(feature) || !isRecord(feature.properties) || !isRecord(feature.geometry)) {
    return null;
  }
  const { osm_type: osmType, osm_id: osmId, tags } = feature.properties;
  const { type: geometryType, coordinates } = feature.geometry;
  const type = typeof osmType === 'string' ? OSM_TYPES[osmType] : undefined;

  if (!type || typeof osmId !== 'number' || geometryType !== 'Point') return null;
  if (!Array.isArray(coordinates)) return null;
  const [lon, lat] = coordinates as unknown[];
  if (typeof lat !== 'number' || typeof lon !== 'number') return null;

  return { type, id: osmId, lat, lon, tags: toStringTags(tags) };
}

/** Validates the GeoJSON FeatureCollection; malformed features are dropped, not fatal. */
export function parsePostpassResponse(data: unknown): OverpassElement[] {
  if (!isRecord(data) || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
    throw new AppError('invalid-response', 'Postpass response is not a GeoJSON FeatureCollection');
  }
  return data.features
    .map(toElement)
    .filter((element): element is OverpassElement => element !== null);
}
