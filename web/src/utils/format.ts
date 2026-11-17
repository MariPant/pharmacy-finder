import type { Language } from '../i18n/translations';
import type { Coordinates } from '../types/geo';

/**
 * "350 m" below one kilometre, "1.2 km" / "1,2 km" up to ten, "12 km" beyond.
 * Units are appended manually so the output is identical across ICU versions.
 */
export function formatDistance(meters: number, language: Language): string {
  if (!Number.isFinite(meters)) return '—';

  const safeMeters = Math.max(0, meters);
  const roundedMeters = Math.round(safeMeters);
  if (roundedMeters < 1_000) return `${roundedMeters} m`;

  const kilometers = safeMeters / 1_000;
  const fractionDigits = kilometers < 10 ? 1 : 0;
  const formatter = new Intl.NumberFormat(language, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  return `${formatter.format(kilometers)} km`;
}

/** Five decimals ≈ 1 m precision, which is more than OSM data provides. */
export function formatCoordinates({ latitude, longitude }: Coordinates): string {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

export function formatTime(timestamp: number, language: Language): string {
  return new Intl.DateTimeFormat(language, { hour: '2-digit', minute: '2-digit' }).format(
    timestamp,
  );
}
