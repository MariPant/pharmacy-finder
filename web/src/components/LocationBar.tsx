import type { FinderStatus } from '../hooks/finderReducer';
import { useI18n } from '../i18n/useI18n';
import type { SearchOrigin } from '../types/geo';
import { cx } from '../utils/classNames';
import { formatCoordinates } from '../utils/format';
import { Button } from './Button';
import { LocateIcon, PinIcon, RefreshIcon } from './icons';
import styles from './LocationBar.module.css';

interface LocationBarProps {
  origin: SearchOrigin | null;
  status: FinderStatus;
  isBusy: boolean;
  onLocate: () => void;
  onRefresh: () => void;
}

export function LocationBar({ origin, status, isBusy, onLocate, onRefresh }: LocationBarProps) {
  const { t } = useI18n();

  const caption =
    origin?.source === 'address' ? t('locationSearchArea') : t('locationYourLocation');

  let value: string;
  let detail: string | null = null;
  if (status.kind === 'locating') {
    value = t('locationLocating');
  } else if (status.kind === 'geocoding') {
    value = t('locationResolving');
  } else if (origin) {
    value = origin.label ?? formatCoordinates(origin.coordinates);
    if (origin.accuracyMeters !== null) {
      detail = t('locationAccuracy', { meters: Math.round(origin.accuracyMeters) });
    }
  } else {
    value = t('locationNotSet');
    detail = t('locationNotSetHint');
  }

  const isSearching = status.kind === 'searching';

  return (
    <section className={styles.card} aria-live="polite">
      <span className={cx(styles.badge, origin?.source === 'address' && styles.badgeAddress)}>
        {origin?.source === 'address' ? <PinIcon size={20} /> : <LocateIcon size={20} />}
      </span>

      <div className={styles.text}>
        <p className={styles.caption}>{caption}</p>
        <p className={styles.value} title={value}>
          {value}
        </p>
        {detail && <p className={styles.detail}>{detail}</p>}
      </div>

      <div className={styles.actions}>
        <Button
          variant="tinted"
          iconOnly
          aria-label={t('actionUpdateLocation')}
          title={t('actionUpdateLocation')}
          icon={<LocateIcon size={20} />}
          onClick={onLocate}
          disabled={status.kind === 'locating'}
        />
        <Button
          variant="secondary"
          iconOnly
          aria-label={t('actionRefreshResults')}
          title={t('actionRefreshResults')}
          icon={<RefreshIcon size={20} className={cx(isSearching && styles.spinning)} />}
          onClick={onRefresh}
          disabled={!origin || isBusy}
        />
      </div>
    </section>
  );
}
