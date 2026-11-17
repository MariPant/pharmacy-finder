import type { LatLngTuple } from 'leaflet';
import type { Coordinates } from '../../types/geo';

export const toLatLngTuple = ({ latitude, longitude }: Coordinates): LatLngTuple => [
  latitude,
  longitude,
];
