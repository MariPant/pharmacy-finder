import { CONFIG } from '../config';
import type { Language } from '../i18n/translations';
import { AppError } from '../types/errors';
import type { Coordinates } from '../types/geo';
import { sleep } from '../utils/abort';
import { isValidCoordinates } from '../utils/distance';
import { defaultFetch, fetchJson, type FetchFunction } from './http';

export interface GeocodedPlace {
  coordinates: Coordinates;
  label: string;
}

export interface GeocodingService {
  /** Address or city → coordinates. Rejects with `address-not-found` if nothing matches. */
  geocode(query: string, language: Language, signal?: AbortSignal): Promise<GeocodedPlace>;
  /** Coordinates → short place label, or null if Nominatim knows nothing useful. */
  reverseGeocode(coordinates: Coordinates, language: Language): Promise<string | null>;
}

interface NominatimPlace {
  lat: string;
  lon: string;
  display_name?: string;
  name?: string;
  address?: Record<string, string>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function toNominatimPlace(value: unknown): NominatimPlace | null {
  if (!isRecord(value) || typeof value.lat !== 'string' || typeof value.lon !== 'string') {
    return null;
  }
  const address = isRecord(value.address)
    ? Object.fromEntries(
        Object.entries(value.address).filter(
          (entry): entry is [string, string] => typeof entry[1] === 'string',
        ),
      )
    : undefined;
  return {
    lat: value.lat,
    lon: value.lon,
    display_name: typeof value.display_name === 'string' ? value.display_name : undefined,
    name: typeof value.name === 'string' ? value.name : undefined,
    address,
  };
}

/** "Aleksanterinkatu 18, Lahti" rather than Nominatim's full administrative chain. */
export function buildPlaceLabel(place: NominatimPlace): string | null {
  const address = place.address ?? {};
  const street = address.road ?? address.pedestrian ?? address.square;
  const streetLine = street ? [street, address.house_number].filter(Boolean).join(' ') : undefined;
  const locality =
    address.city ?? address.town ?? address.village ?? address.municipality ?? address.suburb;

  const parts = [streetLine ?? place.name, locality].filter(
    (part, index, all): part is string => Boolean(part) && all.indexOf(part) === index,
  );
  if (parts.length > 0) return parts.join(', ');

  const shortDisplayName = place.display_name?.split(',').slice(0, 2).join(',').trim();
  return shortDisplayName ? shortDisplayName : null;
}

function toCoordinates(place: NominatimPlace): Coordinates | null {
  const coordinates = { latitude: Number(place.lat), longitude: Number(place.lon) };
  return isValidCoordinates(coordinates) ? coordinates : null;
}

export interface GeocodingServiceDependencies {
  fetchImpl?: FetchFunction;
  baseUrl?: string;
  minIntervalMs?: number;
  timeoutMs?: number;
  now?: () => number;
}

export function createGeocodingService({
  fetchImpl = defaultFetch,
  baseUrl = CONFIG.nominatim.baseUrl,
  minIntervalMs = CONFIG.nominatim.minIntervalMs,
  timeoutMs = CONFIG.nominatim.requestTimeoutMs,
  now = Date.now,
}: GeocodingServiceDependencies = {}): GeocodingService {
  let lastRequestAt = Number.NEGATIVE_INFINITY;

  /** Enforces Nominatim's 1 request/second policy across all calls. */
  async function request(path: string, params: URLSearchParams, signal?: AbortSignal) {
    const waitMs = lastRequestAt + minIntervalMs - now();
    if (waitMs > 0) await sleep(waitMs, signal);
    lastRequestAt = now();
    return fetchJson(`${baseUrl}${path}?${params.toString()}`, {
      timeoutMs,
      signal,
      fetchImpl,
      init: { headers: { Accept: 'application/json' } },
    });
  }

  return {
    async geocode(query, language, signal) {
      const params = new URLSearchParams({
        q: query,
        format: 'jsonv2',
        addressdetails: '1',
        limit: '1',
        'accept-language': language,
      });
      const data = await request('/search', params, signal);
      if (!Array.isArray(data)) {
        throw new AppError('invalid-response', 'Nominatim search did not return an array');
      }

      const place = data.length > 0 ? toNominatimPlace(data[0]) : null;
      const coordinates = place ? toCoordinates(place) : null;
      if (!place || !coordinates) {
        throw new AppError('address-not-found', `No results for "${query}"`);
      }
      return { coordinates, label: buildPlaceLabel(place) ?? query };
    },

    async reverseGeocode({ latitude, longitude }, language) {
      const params = new URLSearchParams({
        lat: latitude.toString(),
        lon: longitude.toString(),
        format: 'jsonv2',
        addressdetails: '1',
        zoom: '18',
        'accept-language': language,
      });
      const place = toNominatimPlace(await request('/reverse', params));
      return place ? buildPlaceLabel(place) : null;
    },
  };
}
