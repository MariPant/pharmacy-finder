import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { I18nContext, type I18nContextValue } from './i18nContext';
import {
  detectLanguage,
  interpolate,
  LANGUAGES,
  PLURAL_KEYS,
  translations,
  type Language,
} from './translations';

const STORAGE_KEY = 'pharmacy-finder.language';

function readStoredLanguage(): Language | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return LANGUAGES.find((language) => language === stored) ?? null;
  } catch {
    return null; // Storage can be unavailable (privacy mode, sandboxed iframes).
  }
}

function initialLanguage(): Language {
  return readStoredLanguage() ?? detectLanguage(navigator.languages ?? [navigator.language]);
}

interface LanguageProviderProps {
  children: ReactNode;
  /** Overrides detection; useful in tests. */
  language?: Language;
}

export function LanguageProvider({ children, language: forcedLanguage }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(
    () => forcedLanguage ?? initialLanguage(),
  );

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Persisting the choice is a convenience only.
    }
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    const dictionary = translations[language];
    const pluralRules = new Intl.PluralRules(language);
    return {
      language,
      setLanguage,
      t: (key, params) => interpolate(dictionary[key], params),
      tPlural: (key, count, params) => {
        const form = pluralRules.select(count) === 'one' ? 'one' : 'other';
        return interpolate(dictionary[PLURAL_KEYS[key][form]], { count, ...params });
      },
    };
  }, [language, setLanguage]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
