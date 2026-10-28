import { callable } from '@steambrew/webkit';

// Shapes returned by backend/main.lua (keep in sync)

export interface SaleInfo {
  id: string;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  year: number;
  start: string; // YYYY-MM-DD
  finish: string;
}

export interface WishlistGame {
  appid: number;
  name: string;
  gid?: string;
  unreleased: boolean;
  free: boolean;
}

export interface WishlistResponse {
  success: boolean;
  code?: string;
  retryAfter?: number;
  steamid?: string;
  country?: string;
  games?: WishlistGame[];
  nextSale?: SaleInfo;
  currentSale?: SaleInfo;
  referenceSales?: SaleInfo[];
}

export interface ForecastResult {
  status: 'ok' | 'nodiscount' | 'nolocal' | 'error'; // nolocal: Steam has no price in this region
  sale_id?: string;
  price?: number;
  regular?: number;
  cut?: number;
  currency?: string;
}

export interface ForecastResponse {
  success: boolean;
  code?: string;
  retryAfter?: number;
  results?: Record<string, ForecastResult>;
}

export interface PublicSettings {
  hasItadKey: boolean;
  hasSteamKey: boolean;
  panelCollapsed: boolean;
  priceCountry: string; // saved price region, '' = detect automatically
}

const GetWishlistRpc = callable<[{ payload: string }], string>('WSF_GetWishlist');
const GetForecastRpc = callable<[{ payload: string }], string>('WSF_GetForecast');
const GetSettingsRpc = callable<[], string>('WSF_GetSettings');
const SaveSettingsRpc = callable<[{ payload: string }], string>('WSF_SaveSettings');

function parse<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string' || raw === '') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// cjson encodes empty Lua tables as {} - normalize to arrays where we expect lists
function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

export async function getWishlist(ownerType: string, owner: string, country: string): Promise<WishlistResponse> {
  try {
    const raw = await GetWishlistRpc({ payload: JSON.stringify({ owner_type: ownerType, owner, country }) });
    const r = parse<WishlistResponse>(raw, { success: false, code: 'NO_RESPONSE' });
    if (r.success) {
      r.games = asArray<WishlistGame>(r.games);
      r.referenceSales = asArray<SaleInfo>(r.referenceSales);
    }
    return r;
  } catch (e) {
    console.error('[WSF] GetWishlist failed', e);
    return { success: false, code: 'BACKEND_UNAVAILABLE' };
  }
}

export interface ForecastItem {
  gid: string;
  appid: number;
}

export async function getForecast(country: string, items: ForecastItem[]): Promise<ForecastResponse> {
  try {
    const raw = await GetForecastRpc({ payload: JSON.stringify({ country, items }) });
    const r = parse<ForecastResponse>(raw, { success: false, code: 'NO_RESPONSE' });
    if (r.results && Array.isArray(r.results)) r.results = {};
    return r;
  } catch (e) {
    console.error('[WSF] GetForecast failed', e);
    return { success: false, code: 'BACKEND_UNAVAILABLE' };
  }
}

export async function getSettings(): Promise<PublicSettings> {
  const fallback: PublicSettings = { hasItadKey: false, hasSteamKey: false, panelCollapsed: false, priceCountry: '' };
  try {
    const r = parse<{ success: boolean; data?: PublicSettings }>(await GetSettingsRpc(), { success: false });
    return r.success && r.data ? { ...fallback, ...r.data } : fallback;
  } catch {
    return fallback;
  }
}

export async function setPanelCollapsed(collapsed: boolean): Promise<void> {
  try {
    await SaveSettingsRpc({ payload: JSON.stringify({ panelCollapsed: collapsed }) });
  } catch {
    /* not critical */
  }
}

// '' means "detect automatically from the store page"
export async function setPriceCountry(code: string): Promise<boolean> {
  try {
    const r = parse<{ success: boolean }>(await SaveSettingsRpc({ payload: JSON.stringify({ priceCountry: code }) }), { success: false });
    return r.success;
  } catch {
    return false;
  }
}
