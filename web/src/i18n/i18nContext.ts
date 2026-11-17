import { createContext } from 'react';
import type { Language, PluralKey, TranslationKey } from './translations';

export type TranslateParams = Record<string, string | number>;

export interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, params?: TranslateParams) => string;
  tPlural: (key: PluralKey, count: number, params?: TranslateParams) => string;
}

export const I18nContext = createContext<I18nContextValue | null>(null);
