import { useId, useState, type FormEvent } from 'react';
import { useI18n } from '../i18n/useI18n';
import styles from './AddressSearch.module.css';
import { Button } from './Button';
import { SearchIcon } from './icons';

interface AddressSearchProps {
  onSearch: (query: string) => void;
  isSearching: boolean;
}

/**
 * Submits only on Enter / button press: Nominatim's usage policy forbids
 * search-as-you-type autocomplete.
 */
export function AddressSearch({ onSearch, isSearching }: AddressSearchProps) {
  const { t } = useI18n();
  const inputId = useId();
  const [query, setQuery] = useState('');
  const trimmedQuery = query.trim();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (trimmedQuery) onSearch(trimmedQuery);
  };

  return (
    <form className={styles.form} role="search" onSubmit={handleSubmit}>
      <label htmlFor={inputId} className="visually-hidden">
        {t('searchLabel')}
      </label>
      <div className={styles.field}>
        <SearchIcon size={18} className={styles.icon} />
        <input
          id={inputId}
          className={styles.input}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          placeholder={t('searchPlaceholder')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <Button type="submit" variant="primary" disabled={!trimmedQuery || isSearching}>
        {t('searchSubmit')}
      </Button>
    </form>
  );
}
