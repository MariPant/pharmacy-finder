import { useI18n } from '../i18n/useI18n';
import type { Coordinates } from '../types/geo';
import type { Pharmacy } from '../types/pharmacy';
import { cx } from '../utils/classNames';
import { pharmacyElementId } from '../utils/domIds';
import { formatCoordinates, formatDistance } from '../utils/format';
import { Button } from './Button';
import { DirectionsLinks } from './DirectionsLinks';
import { ClockIcon, MapIcon, PhoneIcon, PinIcon } from './icons';
import styles from './PharmacyCard.module.css';

interface PharmacyCardProps {
  pharmacy: Pharmacy;
  isSelected: boolean;
  directionsOrigin?: Coordinates;
  onShowOnMap: (id: string) => void;
}

export function PharmacyCard({
  pharmacy,
  isSelected,
  directionsOrigin,
  onShowOnMap,
}: PharmacyCardProps) {
  const { t, language } = useI18n();
  const displayName = pharmacy.name ?? t('pharmacyUnnamed');

  return (
    <article
      id={pharmacyElementId(pharmacy.id)}
      className={cx(styles.card, isSelected && styles.selected)}
      aria-current={isSelected || undefined}
    >
      <header className={styles.header}>
        <h3 className={cx(styles.name, !pharmacy.name && styles.missing)}>{displayName}</h3>
        <span className={styles.distance} aria-label={t('pharmacyDistance')}>
          {formatDistance(pharmacy.distanceMeters, language)}
        </span>
      </header>

      <dl className={styles.details}>
        <div className={styles.row}>
          <dt>
            <PinIcon size={15} />
            <span className="visually-hidden">{t('pharmacyAddress')}</span>
          </dt>
          <dd className={cx(!pharmacy.address && styles.missing)}>
            {pharmacy.address ?? t('pharmacyNoAddress')}
          </dd>
        </div>

        {pharmacy.openingHours && (
          <div className={styles.row}>
            <dt>
              <ClockIcon size={15} />
              <span className="visually-hidden">{t('pharmacyOpeningHours')}</span>
            </dt>
            <dd>{pharmacy.openingHours}</dd>
          </div>
        )}

        {pharmacy.phone && (
          <div className={styles.row}>
            <dt>
              <PhoneIcon size={15} />
              <span className="visually-hidden">{t('pharmacyPhone')}</span>
            </dt>
            <dd>
              <a href={`tel:${pharmacy.phone.replace(/\s+/g, '')}`} className={styles.link}>
                {pharmacy.phone}
              </a>
            </dd>
          </div>
        )}

        <div className={cx(styles.row, styles.coordinates)}>
          <dt>{t('pharmacyCoordinates')}</dt>
          <dd>{formatCoordinates(pharmacy.coordinates)}</dd>
        </div>
      </dl>

      <footer className={styles.actions}>
        <Button
          variant="secondary"
          size="sm"
          icon={<MapIcon size={15} />}
          onClick={() => onShowOnMap(pharmacy.id)}
        >
          {t('actionShowOnMap')}
        </Button>
        <DirectionsLinks
          destination={pharmacy.coordinates}
          destinationName={displayName}
          origin={directionsOrigin}
        />
      </footer>
    </article>
  );
}
