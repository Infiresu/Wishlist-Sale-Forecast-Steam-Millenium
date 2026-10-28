// Reads what we need from the Steam store page itself.
import { resolveLocale } from './locale';

export interface WishlistOwner {
  type: 'id' | 'profiles';
  value: string;
}

export type CountrySource = 'global' | 'userinfo' | 'cookie' | 'default';

const WISHLIST_PATH = /^\/wishlist\/(id|profiles)\/([^/?#]+)/i;

function readUserInfo(): Record<string, unknown> | null {
  const raw = document.getElementById('application_config')?.getAttribute('data-userinfo');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isCountryCode(v: unknown): v is string {
  return typeof v === 'string' && /^[A-Za-z]{2}$/.test(v);
}

export function isWishlistPage(): boolean {
  return location.hostname === 'store.steampowered.com' && /^\/wishlist(\/|$)/i.test(location.pathname);
}

// Owner of the wishlist being viewed (a friend's wishlist gives the friend)
export function getWishlistOwner(): WishlistOwner | null {
  const m = location.pathname.match(WISHLIST_PATH);
  if (m) {
    return { type: m[1].toLowerCase() as 'id' | 'profiles', value: decodeURIComponent(m[2]) };
  }
  // Plain /wishlist/ shows the signed-in user's own list
  const steamid = readUserInfo()?.steamid;
  if (typeof steamid === 'string' && /^\d{17}$/.test(steamid)) {
    return { type: 'profiles', value: steamid };
  }
  return null;
}

// Region the store is showing to the viewer. Several sources are tried in order;
// `source` tells the panel which one worked, so a wrong guess is easy to spot.
export function getStoreCountry(): { code: string; source: CountrySource } {
  const global = (window as any).g_strCountryCode;
  if (isCountryCode(global)) return { code: global.toUpperCase(), source: 'global' };

  const fromUserInfo = readUserInfo()?.country_code;
  if (isCountryCode(fromUserInfo)) return { code: fromUserInfo.toUpperCase(), source: 'userinfo' };

  const cookie = document.cookie.split('; ').find((c) => c.startsWith('steamCountry='));
  if (cookie) {
    const code = decodeURIComponent(cookie.slice('steamCountry='.length)).split('|')[0];
    if (isCountryCode(code)) return { code: code.toUpperCase(), source: 'cookie' };
  }
  return { code: 'US', source: 'default' };
}

// Language of the Steam interface the viewer chose (client / account setting).
// The Steam_Language cookie holds names like "english" or "russian"; the page and browser
// languages are only fallbacks. The first candidate we can translate wins.
// Returns a BCP-47 tag ("ru", "pt", "zh") that Intl understands; "russian" would silently fall back to en-US.
export function getPageLanguage(): string {
  let steamLang = '';
  try {
    const cookie = document.cookie.split('; ').find((c) => c.startsWith('Steam_Language='));
    if (cookie) steamLang = decodeURIComponent(cookie.slice('Steam_Language='.length));
  } catch {
    /* no cookie access */
  }
  for (const c of [steamLang, document.documentElement.lang, navigator.language]) {
    const code = resolveLocale(c);
    if (code) return code;
  }
  return 'en';
}
