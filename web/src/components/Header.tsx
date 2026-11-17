import { useI18n } from '../i18n/useI18n';
import { LANGUAGE_NAMES, LANGUAGES } from '../i18n/translations';
import { cx } from '../utils/classNames';
import styles from './Header.module.css';
import { PharmacyCrossIcon } from './icons';

export function Header() {
  const { t, language, setLanguage } = useI18n();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <span className={styles.logo}>
            <PharmacyCrossIcon size={18} />
          </span>
          <div>
            <h1 className={styles.title}>{t('appName')}</h1>
            <p className={styles.tagline}>{t('appTagline')}</p>
          </div>
        </div>

        <div className={styles.languageSwitch} role="group" aria-label={t('languageLabel')}>
          {LANGUAGES.map((option) => (
            <button
              key={option}
              type="button"
              lang={option}
              className={cx(styles.languageOption, option === language && styles.active)}
              aria-pressed={option === language}
              title={LANGUAGE_NAMES[option]}
              onClick={() => setLanguage(option)}
            >
              {option.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
