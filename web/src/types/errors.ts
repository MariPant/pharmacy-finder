export type AppErrorKind =
  // Geolocation
  | 'geolocation-unsupported'
  | 'permission-denied'
  | 'position-unavailable'
  | 'location-timeout'
  // Network / API
  | 'offline'
  | 'network'
  | 'timeout'
  | 'rate-limited'
  | 'server'
  | 'invalid-response'
  // Geocoding
  | 'address-not-found'
  | 'unknown';

export class AppError extends Error {
  readonly kind: AppErrorKind;

  constructor(kind: AppErrorKind, message?: string, options?: ErrorOptions) {
    super(message ?? kind, options);
    this.name = 'AppError';
    this.kind = kind;
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  return new AppError('unknown', error instanceof Error ? error.message : String(error), {
    cause: error,
  });
}
