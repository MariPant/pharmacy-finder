import { useI18n } from '../i18n/useI18n';
import type { Coordinates } from '../types/geo';
import { buildDirectionsUrl, type DirectionsProvider } from '../utils/directions';
import { ButtonLink } from './Button';
import styles from './DirectionsLinks.module.css';
import { DirectionsIcon } from './icons';

const PROVIDERS: ReadonlyArray<{ id: DirectionsProvider; label: string }> = [
  { id: 'apple', label: 'Apple Maps' },
  { id: 'google', label: 'Google Maps' },
];

interface DirectionsLinksProps {
  destination: Coordinates;
  destinationName: string;
  /** Pass only for address searches; otherwise the maps app routes from the device location. */
  origin?: Coordinates;
}

export function DirectionsLinks({ destination, destinationName, origin }: DirectionsLinksProps) {
  const { t } = useI18n();

  return (
    <div className={styles.links}>
      {PROVIDERS.map(({ id, label }) => (
        <ButtonLink
          key={id}
          variant="tinted"
          size="sm"
          href={buildDirectionsUrl(id, destination, origin)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('actionDirectionsVia', { name: destinationName, provider: label })}
          icon={<DirectionsIcon size={15} />}
        >
          {label}
        </ButtonLink>
      ))}
    </div>
  );
}
