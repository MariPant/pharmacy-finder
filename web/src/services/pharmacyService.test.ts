import { describe, expect, it, vi } from 'vitest';
import {
  emptyOverpassPayload,
  overpassPayload,
  postpassPayload,
  TEST_ORIGIN,
} from '../test/fixtures';
import type { OverpassElement } from '../types/overpass';
import { createAbortError, isAbortError } from '../utils/abort';
import { TtlCache } from '../utils/ttlCache';
import { createOverpassSource, createPostpassSource } from './dataSources';
import type { FetchFunction } from './http';
import { createPharmacyService, type PharmacyServiceDependencies } from './pharmacyService';

const OVERPASS_URL = 'https://overpass.test/api/interpreter';
const POSTPASS_URL = 'https://postpass.test/api/interpreter';
const SOURCES = [createOverpassSource(OVERPASS_URL, 8), createPostpassSource(POSTPASS_URL)];
const ANOTHER_ORIGIN = { latitude: 60.17, longitude: 24.94 };

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Fake fetch that returns the queued responses in order. */
function queuedFetch(...responses: Array<() => Response | Promise<Response>>) {
  const queue = [...responses];
  return vi.fn<FetchFunction>(async () => {
    const next = queue.shift();
    if (!next) throw new Error('Unexpected extra request');
    return next();
  });
}

function createService(fetchImpl: FetchFunction, overrides: PharmacyServiceDependencies = {}) {
  return createPharmacyService({
    fetchImpl,
    sources: SOURCES,
    radiiMeters: [1_000, 3_000],
    retryDelayMs: 0,
    requestTimeoutMs: 1_000,
    ...overrides,
  });
}

type FetchMock = ReturnType<typeof queuedFetch>;

const requestedUrl = (fetchMock: FetchMock, callIndex: number) =>
  fetchMock.mock.calls[callIndex]?.[0];

const sentQuery = (fetchMock: FetchMock, callIndex: number): string => {
  const body = fetchMock.mock.calls[callIndex]?.[1]?.body;
  return body instanceof URLSearchParams ? (body.get('data') ?? '') : '';
};

const hangingFetch = () =>
  vi.fn<FetchFunction>(
    (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(createAbortError()));
      }),
  );

describe('pharmacyService.search', () => {
  it('queries Overpass first and returns sorted pharmacies', async () => {
    const fetchMock = queuedFetch(() => jsonResponse(overpassPayload));
    const result = await createService(fetchMock).search(TEST_ORIGIN);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(requestedUrl(fetchMock, 0)).toBe(OVERPASS_URL);
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('POST');
    expect(sentQuery(fetchMock, 0)).toContain('around:1000,');
    expect(result.radiusMeters).toBe(1_000);
    expect(result.pharmacies.map(({ id }) => id)).toEqual(['node/1', 'way/2', 'node/3']);
  });

  it('widens the radius when nothing is found nearby', async () => {
    const fetchMock = queuedFetch(
      () => jsonResponse(emptyOverpassPayload),
      () => jsonResponse(overpassPayload),
    );
    const result = await createService(fetchMock).search(TEST_ORIGIN);

    expect(sentQuery(fetchMock, 1)).toContain('around:3000,');
    expect(result.radiusMeters).toBe(3_000);
    expect(result.pharmacies).toHaveLength(3);
  });

  it('returns an empty result with the largest radius when nothing exists', async () => {
    const fetchMock = queuedFetch(
      () => jsonResponse(emptyOverpassPayload),
      () => jsonResponse(emptyOverpassPayload),
    );
    await expect(createService(fetchMock).search(TEST_ORIGIN)).resolves.toEqual({
      pharmacies: [],
      radiusMeters: 3_000,
    });
  });

  it.each([
    ['rate-limited (429)', () => jsonResponse({}, 429)],
    ['unavailable (502)', () => jsonResponse({}, 502)],
    ['returning an error page', () => new Response('<html>Bad gateway</html>', { status: 200 })],
    ['reporting a runtime error', () => jsonResponse({ elements: [], remark: 'runtime error' })],
  ])('falls back to Postpass when Overpass is %s', async (_label, overpassReply) => {
    const fetchMock = queuedFetch(overpassReply, () => jsonResponse(postpassPayload));
    const result = await createService(fetchMock).search(TEST_ORIGIN);

    expect(requestedUrl(fetchMock, 1)).toBe(POSTPASS_URL);
    expect(sentQuery(fetchMock, 1)).toContain('FROM postpass_pointpolygon');
    expect(result.pharmacies.map(({ id }) => id)).toEqual(['node/1', 'way/2']);
  });

  it('skips a failed source until its cool-down has passed', async () => {
    let now = 0;
    const fetchMock = queuedFetch(
      () => jsonResponse({}, 502), // Overpass fails…
      () => jsonResponse(postpassPayload), // …Postpass answers.
      () => jsonResponse(postpassPayload), // Next search goes straight to Postpass.
      () => jsonResponse(overpassPayload), // After the cool-down, Overpass is tried again.
    );
    const service = createService(fetchMock, { sourceCooldownMs: 60_000, now: () => now });

    await service.search(TEST_ORIGIN);
    await service.search(ANOTHER_ORIGIN);
    expect(requestedUrl(fetchMock, 2)).toBe(POSTPASS_URL);

    now = 61_000;
    await service.search({ latitude: 61.5, longitude: 23.76 });
    expect(requestedUrl(fetchMock, 3)).toBe(OVERPASS_URL);
  });

  it('reports the last error when every source fails', async () => {
    const fetchMock = queuedFetch(
      () => jsonResponse({}, 429),
      () => jsonResponse({}, 503),
    );
    await expect(createService(fetchMock).search(TEST_ORIGIN)).rejects.toMatchObject({
      kind: 'server',
    });
  });

  it('reports offline without trying other sources', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const fetchMock = vi.fn<FetchFunction>(async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(createService(fetchMock).search(TEST_ORIGIN)).rejects.toMatchObject({
      kind: 'offline',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('times out hanging requests on every source', async () => {
    const fetchMock = hangingFetch();
    await expect(
      createService(fetchMock, { requestTimeoutMs: 20 }).search(TEST_ORIGIN),
    ).rejects.toMatchObject({ kind: 'timeout' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('propagates caller cancellation as an AbortError', async () => {
    const controller = new AbortController();
    const pending = createService(hangingFetch()).search(TEST_ORIGIN, {
      signal: controller.signal,
    });
    controller.abort();

    const error: unknown = await pending.catch((caught: unknown) => caught);
    expect(isAbortError(error)).toBe(true);
  });

  it('serves repeated searches from the cache until the data is too old', async () => {
    let now = 0;
    const cache = new TtlCache<OverpassElement[]>(60_000, () => now);
    const fetchMock = queuedFetch(
      () => jsonResponse(overpassPayload),
      () => jsonResponse(overpassPayload),
    );
    const service = createService(fetchMock, { cache });

    await service.search(TEST_ORIGIN);
    await service.search(TEST_ORIGIN, { maxCacheAgeMs: 30_000 });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    now = 31_000;
    await service.search(TEST_ORIGIN, { maxCacheAgeMs: 30_000 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
