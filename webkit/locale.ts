// Languages the plugin ships texts for. Anything else falls back to English.
export const LOCALES = ['en', 'ru', 'uk', 'de', 'fr', 'es', 'pt', 'pl', 'tr', 'it', 'ja', 'ko', 'zh'] as const;
export type LocaleCode = (typeof LOCALES)[number];

// Steam's own language names (as in the Steam_Language cookie and the client settings) -> our code
const STEAM_NAMES: Record<string, LocaleCode> = {
  english: 'en',
  russian: 'ru',
  ukrainian: 'uk',
  german: 'de',
  french: 'fr',
  spanish: 'es',
  latam: 'es', // Latin American Spanish
  portuguese: 'pt',
  brazilian: 'pt',
  polish: 'pl',
  turkish: 'tr',
  italian: 'it',
  japanese: 'ja',
  koreana: 'ko',
  korean: 'ko',
  schinese: 'zh',
  tchinese: 'zh',
  chinese: 'zh',
};

// Resolve any language hint (Steam language name, BCP-47 tag, cookie value) to a supported code.
// Returns null when the language is not one we translate.
export function resolveLocale(hint: string | null | undefined): LocaleCode | null {
  if (!hint) return null;
  const v = hint.trim().toLowerCase().replace(/_/g, '-');
  if (!v) return null;

  if (v in STEAM_NAMES) return STEAM_NAMES[v];

  // BCP-47 tags such as "ru", "ru-RU", "zh-CN", "pt-BR"
  const prefix = v.split('-')[0];
  if ((LOCALES as readonly string[]).includes(prefix)) return prefix as LocaleCode;

  return null;
}
