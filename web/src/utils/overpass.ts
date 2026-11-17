import { AppError } from '../types/errors';
import type { Coordinates } from '../types/geo';
import type { OverpassElement, OverpassResponse } from '../types/overpass';
import type { Pharmacy } from '../types/pharmacy';
import { distanceInMeters, isValidCoordinates } from './distance';
import { sortByDistance } from './sortPharmacies';

type Tags = OverpassElement['tags'];

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

/**
 * `nwr` covers nodes, ways and relations: many pharmacies are mapped as building
 * outlines, not points. `out center` gives those a single coordinate. A union of
 * sets in Overpass QL is already de-duplicated.
 */
export function buildPharmacyQuery(
  center: Coordinates,
  radiusMeters: number,
  timeoutSeconds: number,
): string {
  const around = `around:${Math.round(radiusMeters)},${center.latitude.toFixed(6)},${center.longitude.toFixed(6)}`;
  return [
    `[out:json][timeout:${timeoutSeconds}];`,
    '(',
    `  nwr["amenity"="pharmacy"](${around});`,
    `  nwr["healthcare"="pharmacy"](${around});`,
    ');',
    'out center;',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Response validation (the payload is untrusted JSON)
// ---------------------------------------------------------------------------

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isOptionalNumber = (value: unknown): boolean =>
  value === undefined || typeof value === 'number';

const isStringRecord = (value: unknown): value is Record<string, string> =>
  isRecord(value) && Object.values(value).every((item) => typeof item === 'string');

function isOverpassElement(value: unknown): value is OverpassElement {
  if (!isRecord(value)) return false;
  const { type, id, lat, lon, center, tags } = value;
  if (type !== 'node' && type !== 'way' && type !== 'relation') return false;
  if (typeof id !== 'number') return false;
  if (!isOptionalNumber(lat) || !isOptionalNumber(lon)) return false;
  if (
    center !== undefined &&
    !(isRecord(center) && typeof center.lat === 'number' && typeof center.lon === 'number')
  ) {
    return false;
  }
  return tags === undefined || isStringRecord(tags);
}

/** Validates the response shape; malformed elements are dropped, not fatal. */
export function parseOverpassResponse(data: unknown): OverpassResponse {
  if (!isRecord(data) || !Array.isArray(data.elements)) {
    throw new AppError('invalid-response', 'Overpass response has no "elements" array');
  }
  const elements = data.elements.filter(isOverpassElement);
  return typeof data.remark === 'string' ? { elements, remark: data.remark } : { elements };
}

/** Overpass returns HTTP 200 with a remark when the query hit its server-side limits. */
export function isOverpassRuntimeError(response: OverpassResponse): boolean {
  return response.remark !== undefined && /runtime error/i.test(response.remark);
}

// ---------------------------------------------------------------------------
// Mapping to the domain model
// ---------------------------------------------------------------------------

function readTag(tags: Tags, key: string): string | null {
  const value = tags?.[key]?.trim();
  return value ? value : null;
}

export function extractCoordinates(element: OverpassElement): Coordinates | null {
  const latitude = element.lat ?? element.center?.lat;
  const longitude = element.lon ?? element.center?.lon;
  if (latitude === undefined || longitude === undefined) return null;

  const coordinates = { latitude, longitude };
  return isValidCoordinates(coordinates) ? coordinates : null;
}

/** Uses only what OSM provides; never invents a name. */
export function extractName(tags: Tags): string | null {
  return readTag(tags, 'name') ?? readTag(tags, 'brand') ?? readTag(tags, 'operator');
}

/** Formats an address as "Street 1, 00100 City"; returns null if OSM has none. */
export function extractAddress(tags: Tags): string | null {
  const fullAddress = readTag(tags, 'addr:full');
  if (fullAddress) return fullAddress;

  const street = readTag(tags, 'addr:street') ?? readTag(tags, 'addr:place');
  const houseNumber = readTag(tags, 'addr:housenumber');
  const streetLine = street ? [street, houseNumber].filter(Boolean).join(' ') : null;

  const cityLine = [readTag(tags, 'addr:postcode'), readTag(tags, 'addr:city')]
    .filter(Boolean)
    .join(' ');

  const parts = [streetLine, cityLine].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(', ') : null;
}

export function toPharmacy(element: OverpassElement, origin: Coordinates): Pharmacy | null {
  const coordinates = extractCoordinates(element);
  if (!coordinates) return null;

  return {
    id: `${element.type}/${element.id}`,
    name: extractName(element.tags),
    address: extractAddress(element.tags),
    coordinates,
    distanceMeters: distanceInMeters(origin, coordinates),
    openingHours: readTag(element.tags, 'opening_hours'),
    phone: readTag(element.tags, 'phone') ?? readTag(element.tags, 'contact:phone'),
  };
}

/** Maps, de-duplicates and sorts elements by distance from the origin. */
export function mapOverpassElements(
  elements: readonly OverpassElement[],
  origin: Coordinates,
  limit?: number,
): Pharmacy[] {
  const seenIds = new Set<string>();
  const pharmacies: Pharmacy[] = [];

  for (const element of elements) {
    const pharmacy = toPharmacy(element, origin);
    if (!pharmacy || seenIds.has(pharmacy.id)) continue;
    seenIds.add(pharmacy.id);
    pharmacies.push(pharmacy);
  }

  const sorted = sortByDistance(pharmacies);
  return limit === undefined ? sorted : sorted.slice(0, limit);
}
