/**
 * Internationalization (i18n) system for Routex
 * Supports multiple languages with fallback to English
 */

export type Locale = 'en' | 'zh-CN';

export interface TranslationDict {
  [key: string]: string | TranslationDict;
}

export class I18n {
  private locale: Locale = 'en';
  private translations = new Map<Locale, TranslationDict>();
  private fallbackLocale: Locale = 'en';

  constructor(defaultLocale: Locale = 'en') {
    this.locale = defaultLocale;
  }

  /**
   * Register translations for a locale
   */
  addTranslations(locale: Locale, translations: TranslationDict) {
    this.translations.set(locale, translations);
  }

  /**
   * Set current locale
   */
  setLocale(locale: Locale) {
    this.locale = locale;
  }

  /**
   * Get current locale
   */
  getLocale(): Locale {
    return this.locale;
  }

  /**
   * Translate a key with optional interpolation
   * @param key - Translation key (dot notation supported, e.g., "server.starting")
   * @param params - Parameters for interpolation
   */
  t(key: string, params?: Record<string, string | number>): string {
    let translation = this.getTranslation(key, this.locale);

    // Fallback to default locale if not found
    if (translation === key && this.locale !== this.fallbackLocale) {
      translation = this.getTranslation(key, this.fallbackLocale);
    }

    // Interpolate parameters
    if (params) {
      translation = this.interpolate(translation, params);
    }

    return translation;
  }

  /**
   * Get translation by key from a specific locale
   */
  private getTranslation(key: string, locale: Locale): string {
    const translations = this.translations.get(locale);
    if (!translations) return key;

    // Support dot notation (e.g., "server.starting")
    const keys = key.split('.');
    let current: any = translations;

    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return key;
      }
    }

    return typeof current === 'string' ? current : key;
  }

  /**
   * Interpolate parameters into translation string
   * Supports {{param}} syntax
   */
  private interpolate(translation: string, params: Record<string, string | number>): string {
    return translation.replace(/\{\{(\w+)\}\}/g, (match, param) => {
      return param in params ? String(params[param]) : match;
    });
  }
}

// Singleton instance
export const i18n = new I18n();

// Helper function for quick access
export const t = (key: string, params?: Record<string, string | number>): string => {
  return i18n.t(key, params);
};
