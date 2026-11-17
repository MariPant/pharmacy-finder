export function createAbortError(): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError');
}

/** Checks by name so it works across realms (browser, jsdom, Node). */
export function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError'
  );
}

/** Resolves after `ms`, rejects with an AbortError if the signal fires first. */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(createAbortError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
