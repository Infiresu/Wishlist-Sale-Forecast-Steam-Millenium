import { getForecast, getSettings, getWishlist, setPriceCountry, ForecastItem, ForecastResult, WishlistResponse } from './api';
import { summarize } from './aggregate';
import { pickDict } from './i18n';
import type { Dict } from './i18n';
import { getPageLanguage, getStoreCountry, getWishlistOwner, isWishlistPage } from './page';
import type { CountrySource } from './page';
import { Panel } from './panel';
import type { PanelHooks } from './panel';
import { DEFAULT_SORT, nextSort } from './sort';
import type { SortState } from './sort';
import { injectStyles, removeStyles } from './styles';

const CHUNK = 8; // games per backend call; must stay <= MAX_GIDS_PER_CALL in main.lua
const MAX_RETRIES = 5;
// ITAD allows 100 requests per 5-minute window per key; every game needs one history request
const ITAD_REQUESTS_PER_WINDOW = 100;
const ITAD_WINDOW_MINUTES = 5;
const STORAGE_PREFIX = 'wsf-excluded:';

// Everything the panel needs to redraw without asking the backend again
interface RunState {
  token: number;
  t: Dict;
  lang: string;
  meta: WishlistResponse;
  results: Record<string, ForecastResult>;
  steamKey: string; // steamid of the wishlist owner, keys the exclusions
  country: string; // region the prices come from
  autoCountry: string;
  countrySource: CountrySource | 'manual';
  priceCountry: string; // saved choice, '' = auto
  progressText?: string;
  progress?: number;
}

let panel: Panel | null = null;
let runToken = 0;
let lastPath = '';
let state: RunState | null = null;

// Order of the counted games list; kept for the whole page session
let sort: SortState = DEFAULT_SORT;

// Games the viewer removed from the total, per wishlist owner.
// Kept in memory and in localStorage (per viewer browser); both are optional.
const excludedCache = new Map<string, Set<number>>();

function excludedFor(key: string): Set<number> {
  let set = excludedCache.get(key);
  if (set) return set;
  set = new Set<number>();
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    const arr: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(arr)) for (const v of arr) if (typeof v === 'number') set.add(v);
  } catch {
    /* storage unavailable: exclusions last for this session only */
  }
  excludedCache.set(key, set);
  return set;
}

function saveExcluded(key: string, set: Set<number>): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Progress line with a rough time estimate. Cached games come back at once, so this is an upper bound.
function progressLabel(t: Dict, done: number, total: number): string {
  const remaining = total - done;
  const windows = Math.ceil(remaining / ITAD_REQUESTS_PER_WINDOW);
  const minutes = Math.max(0, windows - 1) * ITAD_WINDOW_MINUTES;
  const base = t.loadingPrices(done, total);
  return minutes > 0 ? `${base} · ${t.etaMinutes(minutes)}` : base;
}

async function waitForBody(): Promise<void> {
  while (!document.body) await sleep(50);
}

// Redraw the panel from the current state (no network)
function draw(): void {
  const s = state;
  if (!s || !panel || s.token !== runToken) return;
  const summary = summarize(s.meta.games ?? [], s.results, excludedFor(s.steamKey));
  panel.render({
    meta: s.meta,
    summary,
    country: s.country,
    autoCountry: s.autoCountry,
    countrySource: s.countrySource,
    priceCountry: s.priceCountry,
    progressText: s.progressText,
    progress: s.progress,
    sort,
  });
}

const hooks: PanelHooks = {
  onToggle(appid) {
    const s = state;
    if (!s) return;
    const set = excludedFor(s.steamKey);
    if (set.has(appid)) set.delete(appid);
    else set.add(appid);
    saveExcluded(s.steamKey, set);
    draw();
  },
  onResetExcluded() {
    const s = state;
    if (!s) return;
    const set = excludedFor(s.steamKey);
    set.clear();
    saveExcluded(s.steamKey, set);
    draw();
  },
  onSort(key) {
    sort = nextSort(sort, key);
    draw();
  },
  onCountryChange(code) {
    void setPriceCountry(code).then(() => run());
  },
  onRefresh() {
    void run();
  },
};

function teardown(): void {
  runToken++;
  state = null;
  panel?.destroy();
  panel = null;
  removeStyles();
}

async function run(): Promise<void> {
  const token = ++runToken;
  const alive = () => token === runToken;

  const lang = getPageLanguage();
  const t = pickDict(lang);
  const owner = getWishlistOwner();
  const auto = getStoreCountry();
  const settings = await getSettings();
  if (!alive()) return;

  const country = settings.priceCountry || auto.code;

  injectStyles();
  panel?.destroy();
  panel = new Panel(t, lang, settings.panelCollapsed, hooks);
  state = null;

  if (!settings.hasItadKey) return showError('NO_KEY');
  if (!owner) return showError('OWNER_NOT_FOUND');

  panel.showLoading(t.loadingWishlist);
  const meta: WishlistResponse = await getWishlist(owner.type, owner.value, country);
  if (!alive()) return;
  if (!meta.success || !meta.games) return showError(meta.code ?? 'default');

  const games = meta.games;
  const results: Record<string, ForecastResult> = {};
  // one entry per ITAD game; the appid is needed to read the regional Steam price
  const seen = new Set<string>();
  const queue: ForecastItem[] = [];
  for (const g of games) {
    if (!g.gid || g.unreleased || g.free || seen.has(g.gid)) continue;
    seen.add(g.gid);
    queue.push({ gid: g.gid, appid: g.appid });
  }
  const total = queue.length;

  const s: RunState = {
    token,
    t,
    lang,
    meta,
    results,
    steamKey: meta.steamid || owner.value,
    country: meta.country ?? country,
    autoCountry: auto.code,
    countrySource: settings.priceCountry ? 'manual' : auto.source,
    priceCountry: settings.priceCountry,
    progressText: progressLabel(t, 0, total),
    progress: 0,
  };
  state = s;
  draw();

  let retries = 0;
  while (queue.length > 0) {
    const batch = queue.slice(0, CHUNK);
    const r = await getForecast(s.country, batch);
    if (!alive()) return;

    if (r.results) Object.assign(results, r.results);

    if (r.success) {
      // A successful answer must cover every game it was asked about. A game missing from it
      // would otherwise stay "loading" forever, so mark it as failed and say so in the console.
      const missing = batch.filter((item) => !results[item.gid]).map((item) => item.gid);
      if (missing.length > 0) {
        console.warn(`[WSF] forecast answer lacks ${missing.length} of ${batch.length} games`);
        for (const gid of missing) results[gid] = { status: 'error' };
      }
      queue.splice(0, batch.length);
      retries = 0;
    } else if (r.code === 'RATE_LIMITED' && retries < MAX_RETRIES) {
      // keep whatever arrived, retry only the rest of the batch
      const finished = new Set(Object.keys(r.results ?? {}));
      for (let i = queue.length - 1; i >= 0; i--) if (finished.has(queue[i].gid)) queue.splice(i, 1);
      retries++;
      let wait = Math.min(Math.max(r.retryAfter ?? 30, 5), 300);
      while (wait > 0 && alive()) {
        const done = total - queue.length;
        s.progressText = t.rateLimited(wait);
        s.progress = done / Math.max(total, 1);
        draw();
        await sleep(1000);
        wait--;
      }
      if (!alive()) return;
      continue;
    } else {
      return showError(r.code ?? 'default');
    }

    const done = total - queue.length;
    s.progressText = queue.length > 0 ? progressLabel(t, done, total) : undefined;
    s.progress = done / Math.max(total, 1);
    draw();
  }

  s.progressText = undefined;
  s.progress = undefined;
  draw();
}

function showError(code: string): void {
  panel?.showError(code);
}

// The store navigates without full reloads, so watch the URL
function onLocationMaybeChanged(): void {
  // pathname only: sorting/filtering the wishlist changes the query string, not the list
  if (location.pathname === lastPath) return;
  lastPath = location.pathname;
  if (isWishlistPage()) {
    void run().catch((e) => console.error('[WSF] run failed', e));
  } else if (panel) {
    teardown();
  }
}

export default async function WebkitMain() {
  if (location.hostname !== 'store.steampowered.com') return;
  await waitForBody();
  onLocationMaybeChanged();
  setInterval(onLocationMaybeChanged, 1000);
  window.addEventListener('popstate', onLocationMaybeChanged);
}
