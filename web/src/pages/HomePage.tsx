import { useCallback, useEffect, useRef } from 'react';
import { AddressSearch } from '../components/AddressSearch';
import { Button } from '../components/Button';
import { Header } from '../components/Header';
import {
  AlertIcon,
  LocateIcon,
  MapIcon,
  OfflineIcon,
  PharmacyCrossIcon,
} from '../components/icons';
import { LocationBar } from '../components/LocationBar';
import { PharmacyMap } from '../components/map/PharmacyMap';
import { PharmacyList } from '../components/PharmacyList';
import { Banner, PharmacyListSkeleton, StatusView } from '../components/StatusView';
import { isBusy } from '../hooks/finderReducer';
import { prefersReducedMotion, useMediaQuery, useOnlineStatus } from '../hooks/useBrowserState';
import { useGeolocationPermission } from '../hooks/useGeolocationPermission';
import { usePharmacyFinder } from '../hooks/usePharmacyFinder';
import { errorKey } from '../i18n/translations';
import { useI18n } from '../i18n/useI18n';
import type { AppErrorKind } from '../types/errors';
import { pharmacyElementId } from '../utils/domIds';
import { formatDistance } from '../utils/format';
import styles from './HomePage.module.css';

const WIDE_LAYOUT_QUERY = '(min-width: 900px)';

// Errors where "Try again" cannot help; the message points to address search instead.
const NON_RETRIABLE_ERRORS: ReadonlySet<AppErrorKind> = new Set<AppErrorKind>([
  'geolocation-unsupported',
  'permission-denied',
]);

const scrollBehavior = (): ScrollBehavior => (prefersReducedMotion() ? 'auto' : 'smooth');

export function HomePage() {
  const { t, language } = useI18n();
  const { state, selectedPharmacy, locate, searchAddress, refresh, retry, select } =
    usePharmacyFinder(language);
  const { status, origin, pharmacies, radiusMeters, selectedId, updatedAt } = state;

  const permission = useGeolocationPermission();
  const isOnline = useOnlineStatus();
  const isWideLayout = useMediaQuery(WIDE_LAYOUT_QUERY);
  const mapSectionRef = useRef<HTMLElement>(null);
  const hasAutoLocatedRef = useRef(false);

  // Locate automatically only if access was granted earlier; otherwise wait for a tap,
  // so the browser prompt appears in response to a user action.
  useEffect(() => {
    if (permission === 'granted' && !hasAutoLocatedRef.current && status.kind === 'idle') {
      hasAutoLocatedRef.current = true;
      void locate();
    }
  }, [permission, status.kind, locate]);

  const handleShowOnMap = useCallback(
    (id: string) => {
      select(id);
      // In the single-column layout the map may be off-screen.
      if (!isWideLayout) {
        mapSectionRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
      }
    },
    [select, isWideLayout],
  );

  const handleMarkerSelect = useCallback(
    (id: string) => {
      select(id);
      // On wide screens the list sits next to the map, so bring the matching card into view.
      if (isWideLayout) {
        document
          .getElementById(pharmacyElementId(id))
          ?.scrollIntoView({ behavior: scrollBehavior(), block: 'nearest' });
      }
    },
    [select, isWideLayout],
  );

  const busy = isBusy(status);
  const directionsOrigin = origin?.source === 'address' ? origin.coordinates : undefined;

  function renderResults() {
    const hasResults = pharmacies.length > 0;

    if (status.kind === 'error' && !hasResults) {
      const canRetry = !NON_RETRIABLE_ERRORS.has(status.error.kind);
      return (
        <StatusView
          tone="danger"
          icon={<AlertIcon size={26} />}
          title={t('errorTitle')}
          message={t(errorKey(status.error.kind))}
          actions={
            canRetry && (
              <Button variant="primary" onClick={() => void retry()}>
                {t('actionRetry')}
              </Button>
            )
          }
        />
      );
    }

    if (busy && !hasResults) {
      return (
        <PharmacyListSkeleton
          label={status.kind === 'searching' ? t('resultsSearching') : t('locationLocating')}
        />
      );
    }

    if (!origin) {
      return (
        <StatusView
          tone="accent"
          icon={<PharmacyCrossIcon size={24} />}
          title={t('welcomeTitle')}
          message={t('welcomeBody')}
          actions={
            permission !== 'denied' && (
              <Button
                variant="primary"
                icon={<LocateIcon size={18} />}
                onClick={() => void locate()}
              >
                {t('actionUseMyLocation')}
              </Button>
            )
          }
        />
      );
    }

    if (!hasResults && radiusMeters !== null) {
      return (
        <StatusView
          icon={<MapIcon size={26} />}
          title={t('emptyTitle')}
          message={t('emptyBody', { radius: formatDistance(radiusMeters, language) })}
        />
      );
    }

    return (
      <>
        {status.kind === 'error' && (
          <Banner
            icon={<AlertIcon size={18} />}
            action={
              <Button size="sm" variant="ghost" onClick={() => void retry()}>
                {t('actionRetry')}
              </Button>
            }
          >
            {t(errorKey(status.error.kind))}
          </Banner>
        )}
        <PharmacyList
          pharmacies={pharmacies}
          radiusMeters={radiusMeters ?? 0}
          updatedAt={updatedAt}
          selectedId={selectedId}
          isUpdating={status.kind === 'searching'}
          directionsOrigin={directionsOrigin}
          onShowOnMap={handleShowOnMap}
        />
      </>
    );
  }

  return (
    <div className={styles.app}>
      <Header />

      <main className={styles.layout}>
        <section className={styles.controls}>
          <LocationBar
            origin={origin}
            status={status}
            isBusy={busy}
            onLocate={() => void locate()}
            onRefresh={() => void refresh()}
          />
          <AddressSearch onSearch={(query) => void searchAddress(query)} isSearching={busy} />
          {!isOnline && (
            <Banner tone="warning" icon={<OfflineIcon size={18} />}>
              {t('offlineBanner')}
            </Banner>
          )}
        </section>

        <section ref={mapSectionRef} className={styles.mapPanel}>
          <PharmacyMap
            origin={origin}
            pharmacies={pharmacies}
            selectedPharmacy={selectedPharmacy}
            onSelect={handleMarkerSelect}
          />
        </section>

        <section className={styles.results}>
          <div className={styles.resultsInner} aria-live="polite">
            {renderResults()}
          </div>
          <p className={styles.attribution}>{t('dataAttribution')}</p>
        </section>
      </main>
    </div>
  );
}
