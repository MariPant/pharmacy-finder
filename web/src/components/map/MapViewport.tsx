import { latLng, latLngBounds, type Marker as LeafletMarker } from 'leaflet';
import { useEffect, type RefObject } from 'react';
import { useMap } from 'react-leaflet';
import { CONFIG } from '../../config';
import { prefersReducedMotion } from '../../hooks/useBrowserState';
import type { SearchOrigin } from '../../types/geo';
import type { Pharmacy } from '../../types/pharmacy';
import { toLatLngTuple } from './leafletUtils';

interface MapViewportProps {
  origin: SearchOrigin | null;
  pharmacies: Pharmacy[];
  selectedPharmacy: Pharmacy | null;
  markerRefs: RefObject<Map<string, LeafletMarker>>;
}

/** Imperative camera control; renders nothing. */
export function MapViewport({
  origin,
  pharmacies,
  selectedPharmacy,
  markerRefs,
}: MapViewportProps) {
  const map = useMap();

  // Leaflet only listens to window resizes; the panel can also resize on its own.
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);

  // Depend on the coordinates object, not the origin: resolving the place label
  // replaces the origin object but must not move the camera.
  const originCoordinates = origin?.coordinates ?? null;

  // New origin or new results: frame the origin and the nearest pharmacies.
  useEffect(() => {
    if (!originCoordinates) return;
    const animate = !prefersReducedMotion();
    const nearest = pharmacies.slice(0, CONFIG.map.fitNearestCount);

    if (nearest.length === 0) {
      map.setView(toLatLngTuple(originCoordinates), 15, { animate });
      return;
    }
    const bounds = latLngBounds([
      toLatLngTuple(originCoordinates),
      ...nearest.map(({ coordinates }) => toLatLngTuple(coordinates)),
    ]);
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16, animate });
  }, [map, originCoordinates, pharmacies]);

  // Selection: fly to the pharmacy, then open its popup once the camera has settled.
  useEffect(() => {
    if (!selectedPharmacy) return;
    const target = latLng(toLatLngTuple(selectedPharmacy.coordinates));
    const zoom = Math.max(map.getZoom(), 16);
    const openPopup = () => markerRefs.current.get(selectedPharmacy.id)?.openPopup();

    if (map.getCenter().equals(target, 1e-6) && map.getZoom() === zoom) {
      openPopup();
      return;
    }
    map.once('moveend', openPopup);
    if (prefersReducedMotion()) {
      map.setView(target, zoom, { animate: false });
    } else {
      map.flyTo(target, zoom, { duration: 0.6 });
    }
    return () => {
      map.off('moveend', openPopup);
    };
  }, [map, selectedPharmacy, markerRefs]);

  return null;
}
