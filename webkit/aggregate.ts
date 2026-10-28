import type { ForecastResult, WishlistGame } from './api';

// Why a game is not in the total. `manual` means the viewer removed it.
export type Reason = 'manual' | 'noDiscount' | 'noLocal' | 'notFound' | 'unreleased' | 'free' | 'failed' | 'pending';

// Order in which not-counted reasons are listed
export const REASON_ORDER: Reason[] = ['manual', 'noDiscount', 'noLocal', 'notFound', 'unreleased', 'free', 'failed', 'pending'];

export interface Entry {
  game: WishlistGame;
  result?: ForecastResult;
  reason?: Reason; // only set for entries that are not counted
  counted: boolean;
}

export interface CurrencyTotal {
  currency: string;
  price: number;
  regular: number; // regular prices of the counted games that have one
  priceWithRegular: number; // their sale prices, for an honest saving %
}

export interface Summary {
  totalGames: number;
  countedCount: number;
  entries: Entry[]; // counted first (most expensive first), then not counted
  totals: CurrencyTotal[];
  bySale: Record<string, number>;
  reasons: Record<Reason, number>;
}

export function summarize(
  games: WishlistGame[],
  results: Record<string, ForecastResult>,
  excluded: ReadonlySet<number>,
): Summary {
  const reasons: Record<Reason, number> = {
    manual: 0, noDiscount: 0, noLocal: 0, notFound: 0, unreleased: 0, free: 0, failed: 0, pending: 0,
  };
  const counted: Entry[] = [];
  const notCounted: Entry[] = [];
  const totals = new Map<string, CurrencyTotal>();
  const bySale: Record<string, number> = {};

  for (const game of games) {
    let reason: Reason | undefined;
    let result: ForecastResult | undefined;

    if (game.unreleased) {
      reason = 'unreleased';
    } else if (game.free) {
      reason = 'free';
    } else if (!game.gid) {
      reason = 'notFound';
    } else {
      result = results[game.gid];
      if (!result) reason = 'pending';
      else if (result.status === 'nodiscount') reason = 'noDiscount';
      else if (result.status === 'nolocal') reason = 'noLocal';
      else if (result.status !== 'ok' || typeof result.price !== 'number' || !result.currency) reason = 'failed';
      else if (excluded.has(game.appid)) reason = 'manual';
    }

    if (reason === undefined && result && typeof result.price === 'number' && result.currency) {
      counted.push({ game, result, counted: true });
      if (result.sale_id) bySale[result.sale_id] = (bySale[result.sale_id] ?? 0) + 1;

      let t = totals.get(result.currency);
      if (!t) {
        t = { currency: result.currency, price: 0, regular: 0, priceWithRegular: 0 };
        totals.set(result.currency, t);
      }
      t.price += result.price;
      if (typeof result.regular === 'number' && result.regular > 0) {
        t.regular += result.regular;
        t.priceWithRegular += result.price;
      }
      continue;
    }

    const r: Reason = reason ?? 'pending';
    reasons[r]++;
    notCounted.push({ game, result, reason: r, counted: false });
  }

  counted.sort((a, b) => (b.result?.price ?? 0) - (a.result?.price ?? 0));
  notCounted.sort((a, b) =>
    REASON_ORDER.indexOf(a.reason as Reason) - REASON_ORDER.indexOf(b.reason as Reason)
    || a.game.name.localeCompare(b.game.name));

  return {
    totalGames: games.length,
    countedCount: counted.length,
    entries: [...counted, ...notCounted],
    totals: [...totals.values()].sort((a, b) => b.price - a.price),
    bySale,
    reasons,
  };
}

export function formatMoney(amount: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
