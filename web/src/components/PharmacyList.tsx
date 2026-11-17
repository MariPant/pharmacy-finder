import { useI18n } from '../i18n/useI18n';
import type { Coordinates } from '../types/geo';
import type { Pharmacy } from '../types/pharmacy';
import { cx } from '../utils/classNames';
import { formatDistance, formatTime } from '../utils/format';
import { PharmacyCard } from './PharmacyCard';
import styles from './PharmacyList.module.css';

interface PharmacyListProps {
  pharmacies: Pharmacy[];
  radiusMeters: number;
  updatedAt: number | null;
  selectedId: string | null;
  isUpdating: boolean;
  directionsOrigin?: Coordinates;
  onShowOnMap: (id: string) => void;
}

export function PharmacyList({
  pharmacies,
  radiusMeters,
  updatedAt,
  selectedId,
  isUpdating,
  directionsOrigin,
  onShowOnMap,
}: PharmacyListProps) {
  const { t, tPlural, language } = useI18n();

  return (
    <section className={styles.section} aria-busy={isUpdating}>
      <header className={styles.header}>
        <h2 className={styles.title}>{t('resultsTitle')}</h2>
        <p className={styles.summary}>
          {tPlural('resultsCount', pharmacies.length, {
            radius: formatDistance(radiusMeters, language),
          })}
          {updatedAt !== null && (
            <span className={styles.updated}>
              {' · '}
              {t('resultsUpdated', { time: formatTime(updatedAt, language) })}
            </span>
          )}
        </p>
      </header>

      <ol className={cx(styles.list, isUpdating && styles.updating)}>
        {pharmacies.map((pharmacy) => (
          <li key={pharmacy.id}>
            <PharmacyCard
              pharmacy={pharmacy}
              isSelected={pharmacy.id === selectedId}
              directionsOrigin={directionsOrigin}
              onShowOnMap={onShowOnMap}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}
