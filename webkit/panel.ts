import type { SaleInfo, WishlistResponse } from './api';
import { setPanelCollapsed } from './api';
import { formatMoney, REASON_ORDER } from './aggregate';
import type { Entry, Summary } from './aggregate';
import type { Dict } from './i18n';
import { sortCounted } from './sort';
import type { SortKey, SortState } from './sort';

const PANEL_ID = 'wsf-panel';

// Regions offered in the panel. Any ITAD country code works; these are the common ones.
export const PRICE_COUNTRIES = [
  'UA', 'RU', 'KZ', 'BY', 'AM', 'GE', 'TR', 'PL', 'DE', 'FR', 'GB', 'US', 'BR', 'AR', 'IN', 'JP',
];

export interface PanelHooks {
  onToggle(appid: number): void;
  onCountryChange(code: string): void;
  onRefresh(): void;
  onResetExcluded(): void;
  onSort(key: SortKey): void;
}

export interface RenderView {
  meta: WishlistResponse;
  summary: Summary;
  country: string; // region the prices really come from
  autoCountry: string; // region detected from the store page
  countrySource: string; // 'manual' | 'global' | 'userinfo' | 'cookie' | 'default'
  priceCountry: string; // saved choice, '' = auto
  progressText?: string;
  progress?: number; // 0..1
  sort: SortState; // order of the counted games list
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text; // textContent only: game names are untrusted
  return e;
}

function regionName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

export class Panel {
  private root: HTMLDivElement;
  private headTotal: HTMLSpanElement;
  private body: HTMLDivElement;
  private detailsOpen = false; // survives re-renders

  constructor(
    private t: Dict,
    private locale: string,
    collapsed: boolean,
    private hooks: PanelHooks,
  ) {
    document.getElementById(PANEL_ID)?.remove();

    this.root = el('div');
    this.root.id = PANEL_ID;
    if (collapsed) this.root.classList.add('wsf-collapsed');

    const head = el('div', 'wsf-head');
    const left = el('div');
    left.appendChild(el('span', 'wsf-title', t.title));
    this.headTotal = el('span', 'wsf-head-total');
    left.appendChild(this.headTotal);
    const chevron = el('span', 'wsf-chevron', collapsed ? '▲' : '▼');
    head.append(left, chevron);
    head.addEventListener('click', () => {
      const now = this.root.classList.toggle('wsf-collapsed');
      chevron.textContent = now ? '▲' : '▼';
      setPanelCollapsed(now);
    });

    this.body = el('div', 'wsf-body');
    this.root.append(head, this.body);
    document.body.appendChild(this.root);
  }

  destroy(): void {
    this.root.remove();
  }

  private saleName(sale: SaleInfo): string {
    return `${this.t.seasons[sale.season]} ${sale.year}`;
  }

  private saleShort(saleId: string, sales: SaleInfo[]): string {
    const s = sales.find((x) => x.id === saleId);
    return s ? `${this.t.seasonsShort[s.season]} ${s.year}` : saleId;
  }

  private formatDate(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number);
    try {
      return new Intl.DateTimeFormat(this.locale, { day: 'numeric', month: 'long', year: 'numeric' })
        .format(new Date(Date.UTC(y, m - 1, d, 12)));
    } catch {
      return iso;
    }
  }

  showLoading(text: string): void {
    this.body.replaceChildren();
    this.body.appendChild(el('div', 'wsf-muted', text));
  }

  showError(code: string): void {
    this.headTotal.textContent = '';
    this.body.replaceChildren();
    this.body.appendChild(el('div', 'wsf-error', this.t.errors[code] ?? `${this.t.errors.default} (${code})`));
    this.body.appendChild(this.footer());
  }

  private footer(country?: string): HTMLElement {
    const f = el('div', 'wsf-footer');
    const link = el('a', undefined, country ? this.t.source(country) : 'IsThereAnyDeal');
    link.href = 'https://isthereanydeal.com/';
    link.target = '_blank';
    const btn = el('button', 'wsf-btn', this.t.refresh);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hooks.onRefresh();
    });
    f.append(link, btn);
    return f;
  }

  render(v: RenderView): void {
    const t = this.t;
    const s = v.summary;
    const sales = v.meta.referenceSales ?? [];
    // keep the list position and the open/closed state of the details across re-renders
    const oldList = this.body.querySelector<HTMLElement>('.wsf-list');
    const scroll = oldList?.scrollTop ?? 0;
    this.body.replaceChildren();

    // Which sale we forecast for
    const saleLine = el('div', 'wsf-sale');
    if (v.meta.currentSale) {
      saleLine.append(`${t.saleNow}: `, el('b', undefined, this.saleName(v.meta.currentSale)));
    } else if (v.meta.nextSale) {
      saleLine.append(`${t.forecastFor}: `, el('b', undefined, this.saleName(v.meta.nextSale)),
        ` · ${this.formatDate(v.meta.nextSale.start)}`);
    } else {
      saleLine.textContent = t.noNextSale;
    }
    this.body.appendChild(saleLine);

    // Totals (normally exactly one currency)
    this.body.appendChild(el('div', 'wsf-total-label', t.total));
    if (s.totals.length === 0) {
      this.body.appendChild(el('div', 'wsf-total', '—'));
      this.headTotal.textContent = '';
    }
    s.totals.forEach((tot, i) => {
      const money = formatMoney(tot.price, tot.currency, this.locale);
      this.body.appendChild(el('div', 'wsf-total', money));
      if (i === 0) this.headTotal.textContent = money;
      if (tot.regular > 0) {
        const pct = Math.round((1 - tot.priceWithRegular / tot.regular) * 100);
        const reg = el('div', 'wsf-regular');
        reg.append(`${t.regular}: `, el('s', undefined, formatMoney(tot.regular, tot.currency, this.locale)));
        if (pct > 0) reg.append(' · ', el('span', 'wsf-saving', `${t.saving} ${pct}%`));
        this.body.appendChild(reg);
      }
    });

    this.body.appendChild(el('div', 'wsf-line', t.counted(s.countedCount, s.totalGames)));

    const parts: string[] = [];
    for (const r of REASON_ORDER) {
      if (s.reasons[r] > 0) parts.push(`${t.reasons[r]} — ${s.reasons[r]}`);
    }
    if (parts.length) this.body.appendChild(el('div', 'wsf-line wsf-muted', `${t.notCounted}: ${parts.join('; ')}`));

    if (v.progressText) {
      this.body.appendChild(el('div', 'wsf-line wsf-muted', v.progressText));
      const bar = el('div', 'wsf-progress');
      const fill = el('div');
      fill.style.width = `${Math.round((v.progress ?? 0) * 100)}%`;
      bar.appendChild(fill);
      this.body.appendChild(bar);
    }

    this.body.appendChild(this.countryRow(v));
    if (v.countrySource === 'default') this.body.appendChild(el('div', 'wsf-muted wsf-hint', t.countryUnknown));

    const list = this.detailsBlock(v, sales);
    if (list) list.scrollTop = scroll;

    this.body.appendChild(this.footer(v.country));
  }

  private countryRow(v: RenderView): HTMLElement {
    const row = el('div', 'wsf-country');
    row.appendChild(el('span', 'wsf-muted', this.t.countryLabel));

    const sel = el('select', 'wsf-select');
    const auto = el('option', undefined, this.t.countryAuto(v.autoCountry));
    auto.value = '';
    sel.appendChild(auto);

    const codes = [...PRICE_COUNTRIES];
    if (v.priceCountry && !codes.includes(v.priceCountry)) codes.unshift(v.priceCountry);
    for (const code of codes) {
      const o = el('option', undefined, `${regionName(code, this.locale)} (${code})`);
      o.value = code;
      sel.appendChild(o);
    }
    sel.value = v.priceCountry;
    sel.addEventListener('change', () => this.hooks.onCountryChange(sel.value));

    row.appendChild(sel);
    return row;
  }

  // Returns the games list element (for scroll restore), or null when there is nothing to show
  private detailsBlock(v: RenderView, sales: SaleInfo[]): HTMLElement | null {
    const t = this.t;
    const s = v.summary;
    if (s.entries.length === 0) return null;

    const det = el('details');
    det.open = this.detailsOpen;
    det.addEventListener('toggle', () => {
      this.detailsOpen = det.open;
    });
    det.appendChild(el('summary', undefined, t.detailsTitle(s.entries.length)));
    det.appendChild(el('div', 'wsf-muted wsf-hint', t.detailsHint));

    const bySale = Object.entries(s.bySale)
      .sort((a, b) => b[1] - a[1])
      .map(([id, n]) => `${this.saleShort(id, sales)} — ${n}`)
      .join(', ');
    if (bySale) det.appendChild(el('div', 'wsf-muted', `${t.pricesFrom}: ${bySale}`));

    if (s.reasons.manual > 0) {
      const btn = el('button', 'wsf-btn', t.resetExcluded(s.reasons.manual));
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hooks.onResetExcluded();
      });
      det.appendChild(btn);
    }

    if (s.countedCount > 0) det.appendChild(this.sortBar(v));

    // counted games in the chosen order; not-counted games keep their grouping order
    const ordered = [...sortCounted(s.entries.filter((e) => e.counted), v.sort), ...s.entries.filter((e) => !e.counted)];

    const list = el('div', 'wsf-list');
    let group: 'counted' | 'not' | null = null;
    for (const e of ordered) {
      const g = e.counted ? 'counted' : 'not';
      if (g !== group) {
        group = g;
        list.appendChild(el('div', 'wsf-group', e.counted
          ? t.countedGroup(s.countedCount)
          : t.notCountedGroup(s.entries.length - s.countedCount)));
      }
      list.appendChild(this.entryRow(e, v, sales));
    }
    det.appendChild(list);
    this.body.appendChild(det);
    return list;
  }

  // Header above the counted list, split into three clickable sections: name, discount, final price
  private sortBar(v: RenderView): HTMLElement {
    const t = this.t;
    const bar = el('div', 'wsf-sortbar');
    const sections: [SortKey, string, string][] = [
      ['name', 'wsf-sort-name', t.sortName],
      ['discount', 'wsf-sort-discount', t.sortDiscount],
      ['price', 'wsf-sort-price', t.sortPrice],
    ];
    for (const [key, cls, label] of sections) {
      const active = v.sort.key === key;
      const arrow = active ? (v.sort.dir === 'asc' ? ' ▲' : ' ▼') : '';
      const b = el('button', `wsf-sort ${cls}${active ? ' wsf-sort-active' : ''}`, label + arrow);
      b.type = 'button';
      b.title = t.sortHint;
      b.addEventListener('click', (ev) => {
        ev.stopPropagation();
        this.hooks.onSort(key);
      });
      bar.appendChild(b);
    }
    return bar;
  }

  private entryRow(e: Entry, v: RenderView, sales: SaleInfo[]): HTMLElement {
    const t = this.t;
    const isManual = e.reason === 'manual';
    const clickable = e.counted || isManual;

    const row = el('div', ['wsf-row', isManual ? 'wsf-excluded' : '', clickable ? 'wsf-clickable' : ''].filter(Boolean).join(' '));
    if (clickable) {
      row.title = isManual ? t.clickToInclude : t.clickToExclude;
      row.addEventListener('click', () => this.hooks.onToggle(e.game.appid));
    }

    row.appendChild(el('span', 'wsf-name', e.game.name));

    const r = e.result;
    const hasPrice = !!r && typeof r.price === 'number' && !!r.currency;
    if (e.counted && r && hasPrice) {
      if (r.cut) row.appendChild(el('span', 'wsf-cut', `-${r.cut}%`));
      if (r.sale_id) row.appendChild(el('span', 'wsf-when', this.saleShort(r.sale_id, sales)));
      row.appendChild(el('span', 'wsf-price', formatMoney(r.price ?? 0, r.currency ?? 'USD', this.locale)));
    } else {
      if (isManual && r && hasPrice) {
        row.appendChild(el('span', 'wsf-struck', formatMoney(r.price ?? 0, r.currency ?? 'USD', this.locale)));
      }
      row.appendChild(el('span', 'wsf-badge', t.badges[e.reason ?? 'pending']));
    }

    const open = el('a', 'wsf-open', '↗');
    open.href = `https://store.steampowered.com/app/${e.game.appid}/`;
    open.target = '_blank';
    open.title = t.openStore;
    open.addEventListener('click', (ev) => ev.stopPropagation()); // do not toggle the row
    row.appendChild(open);

    return row;
  }
}
