import { AppError, type AppErrorKind } from '../types/errors';
import { createAbortError } from '../utils/abort';

export type FetchFunction = (input: string, init?: RequestInit) => Promise<Response>;

// Wrapped so `fetch` is never called as a method of another object
// (that throws "Illegal invocation" in browsers).
export const defaultFetch: FetchFunction = (input, init) => fetch(input, init);

interface FetchJsonOptions {
  timeoutMs: number;
  /** Cancels the request; the promise then rejects with an AbortError. */
  signal?: AbortSignal;
  init?: Omit<RequestInit, 'signal'>;
  fetchImpl?: FetchFunction;
}

function kindForStatus(status: number): AppErrorKind {
  if (status === 429) return 'rate-limited';
  if (status === 504) return 'timeout';
  return 'server';
}

const isOffline = (): boolean => typeof navigator !== 'undefined' && navigator.onLine === false;

/**
 * fetch + timeout + JSON parsing with every failure mapped to an AppError.
 * Caller-initiated cancellation is passed through as an AbortError so it can be ignored.
 */
export async function fetchJson(
  url: string,
  { timeoutMs, signal, init, fetchImpl = defaultFetch }: FetchJsonOptions,
): Promise<unknown> {
  if (signal?.aborted) throw createAbortError();

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const forwardAbort = () => controller.abort();
  signal?.addEventListener('abort', forwardAbort, { once: true });

  const failure = (fallback: AppError): Error => {
    if (signal?.aborted) return createAbortError();
    if (timedOut) return new AppError('timeout', `Request timed out after ${timeoutMs} ms`);
    return fallback;
  };

  try {
    let response: Response;
    try {
      response = await fetchImpl(url, { ...init, signal: controller.signal });
    } catch (error) {
      throw failure(
        new AppError(isOffline() ? 'offline' : 'network', 'Network request failed', {
          cause: error,
        }),
      );
    }

    if (!response.ok) {
      throw new AppError(kindForStatus(response.status), `HTTP ${response.status}`);
    }

    try {
      return (await response.json()) as unknown;
    } catch (error) {
      throw failure(
        new AppError('invalid-response', 'Response is not valid JSON', { cause: error }),
      );
    }
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forwardAbort);
  }
}
