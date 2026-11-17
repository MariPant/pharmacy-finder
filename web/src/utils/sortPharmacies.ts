import type { Pharmacy } from '../types/pharmacy';

function compareNullableNames(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1; // Unnamed pharmacies go last among equals.
  if (b === null) return -1;
  return a.localeCompare(b);
}

/**
 * Nearest first. Ties are broken by name and then id so the order is deterministic
 * and the list does not reshuffle between identical refreshes.
 */
export function sortByDistance(pharmacies: readonly Pharmacy[]): Pharmacy[] {
  return [...pharmacies].sort(
    (a, b) =>
      a.distanceMeters - b.distanceMeters ||
      compareNullableNames(a.name, b.name) ||
      a.id.localeCompare(b.id),
  );
}
