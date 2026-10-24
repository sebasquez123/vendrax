import { I18nService, TranslateOptions } from 'nestjs-i18n';

export interface LanguageTranslator {
  lang: string;
  t: (key: string, options?: Omit<TranslateOptions, 'lang'>) => string;
}

export const createTranslator = (service: I18nService, langReq?: string | null): LanguageTranslator => {
  const resolved = service.resolveLanguage(String(langReq ?? 'es').toLowerCase());
  const lang = service.getSupportedLanguages().includes(resolved) ? resolved : 'es';
  return { lang, t: (key, options) => service.t(key, { ...options, lang }) as string };
};
