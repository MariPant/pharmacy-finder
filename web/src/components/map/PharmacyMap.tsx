import type { Marker as LeafletMarker } from 'leaflet';
import { useRef } from 'react';
import { Circle, CircleMarker, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { CONFIG } from '../../config';
import { useI18n } from '../../i18n/useI18n';
import type { SearchOrigin } from '../../types/geo';
import type { Pharmacy } from '../../types/pharmacy';
import { formatDistance } from '../../utils/format';
import { DirectionsLinks } from '../DirectionsLinks';
import { pharmacyIcon, searchPointIcon, selectedPharmacyIcon } from './mapIcons';
import styles from './PharmacyMap.module.css';
import { toLatLngTuple } from './leafletUtils';
import { MapViewport } from './MapViewport';

interface PharmacyMapProps {
  origin: SearchOrigin | null;
  pharmacies: Pharmacy[];
  selectedPharmacy: Pharmacy | null;
  onSelect: (id: string) => void;
}

// SVG attributes can't resolve CSS variables, so the colour is duplicated from tokens.css.
const USER_LOCATION_COLOR = '#2f6fed';
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export function PharmacyMap({ origin, pharmacies, selectedPharmacy, onSelect }: PharmacyMapProps) {
  const { t, language } = useI18n();
  const markerRefs = useRef(new Map<string, LeafletMarker>());
  const directionsOrigin = origin?.source === 'address' ? origin.coordinates : undefined;

  return (
    <div className={styles.container} role="region" aria-label={t('mapLabel')}>
      <MapContainer
        className={styles.map}
        center={toLatLngTuple(CONFIG.map.initialCenter)}
        zoom={CONFIG.map.initialZoom}
        zoomControl
        scrollWheelZoom
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={19} />

        {origin?.source === 'device' && (
          <>
            {origin.accuracyMeters !== null &&
              origin.accuracyMeters <= CONFIG.map.maxAccuracyCircleMeters && (
                <Circle
                  center={toLatLngTuple(origin.coordinates)}
                  radius={origin.accuracyMeters}
                  pathOptions={{
                    stroke: false,
                    fillColor: USER_LOCATION_COLOR,
                    fillOpacity: 0.12,
                  }}
                  interactive={false}
                />
              )}
            <CircleMarker
              center={toLatLngTuple(origin.coordinates)}
              radius={8}
              pathOptions={{
                color: '#ffffff',
                weight: 3,
                fillColor: USER_LOCATION_COLOR,
                fillOpacity: 1,
              }}
            >
              <Popup>{t('mapYouAreHere')}</Popup>
            </CircleMarker>
          </>
        )}

        {origin?.source === 'address' && (
          <Marker position={toLatLngTuple(origin.coordinates)} icon={searchPointIcon}>
            <Popup>
              <strong>{t('mapSearchPoint')}</strong>
              {origin.label && <div>{origin.label}</div>}
            </Popup>
          </Marker>
        )}

        {pharmacies.map((pharmacy) => {
          const isSelected = pharmacy.id === selectedPharmacy?.id;
          const displayName = pharmacy.name ?? t('pharmacyUnnamed');
          return (
            <Marker
              key={pharmacy.id}
              position={toLatLngTuple(pharmacy.coordinates)}
              icon={isSelected ? selectedPharmacyIcon : pharmacyIcon}
              zIndexOffset={isSelected ? 1000 : 0}
              title={displayName}
              alt={displayName}
              eventHandlers={{ click: () => onSelect(pharmacy.id) }}
              ref={(marker) => {
                if (marker) markerRefs.current.set(pharmacy.id, marker);
                else markerRefs.current.delete(pharmacy.id);
              }}
            >
              <Popup>
                <div className={styles.popup}>
                  <p className={pharmacy.name ? styles.popupTitle : styles.popupTitleMissing}>
                    {displayName}
                  </p>
                  <p className={pharmacy.address ? styles.popupText : styles.popupTextMissing}>
                    {pharmacy.address ?? t('pharmacyNoAddress')}
                  </p>
                  <p className={styles.popupDistance}>
                    {formatDistance(pharmacy.distanceMeters, language)}
                  </p>
                  <DirectionsLinks
                    destination={pharmacy.coordinates}
                    destinationName={displayName}
                    origin={directionsOrigin}
                  />
                </div>
              </Popup>
            </Marker>
          );
        })}

        <MapViewport
          origin={origin}
          pharmacies={pharmacies}
          selectedPharmacy={selectedPharmacy}
          markerRefs={markerRefs}
        />
      </MapContainer>
    </div>
  );
}
