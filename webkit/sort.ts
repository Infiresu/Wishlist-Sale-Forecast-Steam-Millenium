// Sorting of the counted games list. The sort state lives in the page session, so it survives re-renders.

import type { Entry } from './aggregate';

export type SortKey = 'name' | 'discount' | 'price';
export type SortDir = 'asc' | 'desc';
export interface SortState {
  key: SortKey;
  dir: SortDir;
}

// Direction used when a section is picked for the first time
export const DEFAULT_DIR: Record<SortKey, SortDir> = { name: 'asc', discount: 'desc', price: 'desc' };

export const DEFAULT_SORT: SortState = { key: 'price', dir: 'desc' };

// Picking the active section again flips its direction; picking another one uses its default
export function nextSort(cur: SortState, key: SortKey): SortState {
  if (cur.key === key) return { key, dir: cur.dir === 'asc' ? 'desc' : 'asc' };
  return { key, dir: DEFAULT_DIR[key] };
}

export function sortCounted(entries: Entry[], sort: SortState): Entry[] {
  const sign = sort.dir === 'asc' ? 1 : -1;
  const byName = (a: Entry, b: Entry) =>
    a.game.name.localeCompare(b.game.name, undefined, { sensitivity: 'base', numeric: true });

  return [...entries].sort((a, b) => {
    let c: number;
    if (sort.key === 'name') c = byName(a, b);
    else if (sort.key === 'discount') c = (a.result?.cut ?? 0) - (b.result?.cut ?? 0);
    else c = (a.result?.price ?? 0) - (b.result?.price ?? 0);
    if (c !== 0) return c * sign;
    return byName(a, b); // equal values: always alphabetical, whatever the direction
  });
}
