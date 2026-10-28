# Wishlist Sale Forecast

A [Millennium](https://steambrew.app/) plugin for the Steam client. Open any Steam wishlist, yours or a friend's, and see **how much the whole list is likely to cost at the next seasonal Steam sale**.

<img width="476" height="1111" alt="panel" src="https://github.com/user-attachments/assets/a82e4b98-50ee-4d44-b158-766650c71089" />

## Features

- **Expected total at the next seasonal sale** (spring, summer, autumn, winter), with the price without discounts and the percentage you save.
- **Your own currency.** Prices use the region of the person viewing the page, so a viewer in Ukraine sees hryvnias even on a US friend's wishlist. You can pick another price region from the panel at any time.
- **Per-game breakdown** with the expected discount, the sale it comes from, and the final price. Sort it by name, discount or price by clicking the header.
- **Click a game to leave it out** of the total (and click again to add it back). Your choices are remembered per wishlist.
- **A clear "not counted" list.** Unreleased and free games, games that were never discounted, games with no price in your region, and games unknown to IsThereAnyDeal are listed separately, each with the reason.
- **Progress and time estimate** while a big wishlist loads.
- **13 interface languages**, chosen automatically from your Steam language: English, Russian, Ukrainian, German, French, Spanish, Portuguese, Polish, Turkish, Italian, Japanese, Korean and Chinese.

## How the forecast works

For every game the plugin takes the **lowest discount seen during the most recent seasonal sale in which the game was discounted**. If the game was not discounted in the last sale, it steps back to the one before, and so on, up to 8 sales (about two years).

- Discount percentages and sale dates come from the [IsThereAnyDeal API](https://docs.isthereanydeal.com/), Steam store only.
- The regular price in your region and currency comes from the Steam store, and the expected price is that regular price minus the discount. This keeps local currencies correct, but it makes the result an **estimate**: a publisher can change the price or the discount from one sale to the next.
- The wishlist itself and the release information come from Steam.

## Requirements

- Windows with the Steam client and [Millennium](https://steambrew.app/) 3.x (developed and tested on 3.6.2). The plugin has a Lua backend, so it needs a Millennium version that supports Lua plugins.
- A **free IsThereAnyDeal API key** (see below).

## Install

**From the Millennium plugin store:** open the plugin store in Millennium, find *Wishlist Sale Forecast* and install it.

**Manually:** download `wishlist-sale-forecast-<version>.zip` from the [Releases](../../releases) page, unpack the `wishlist-sale-forecast` folder into `Steam/plugins/`, enable it in **Millennium → Plugins** and restart Steam.

## Setup

1. Sign in at [isthereanydeal.com](https://isthereanydeal.com/), open **Apps → Register App** and copy the **API Key** (not the OAuth Client ID).
2. In Steam, open **Millennium → Plugins → Wishlist Sale Forecast**, paste the key and press **Save**.
3. Open any public wishlist in the Steam client store. The panel appears in the bottom right corner.

## Privacy

- The ITAD key is stored in `settings.json` inside the plugin folder on your computer. It is never exposed to web pages and is sent to IsThereAnyDeal in a request header, never in the URL. It is never written to the log.
- The plugin talks to `store.steampowered.com` and `steamcommunity.com` (wishlist, prices, profile lookup) and to `api.isthereanydeal.com` (discount history). It sends nothing anywhere else and has no analytics.
- Results are cached in `cache.json` inside the plugin folder. Your list of excluded games is kept in the store page's local storage.

## Limitations

- It works inside the Steam client's store view, not in a regular browser. Millennium only modifies Steam itself.
- The wishlist must be public, and so must the profile for `/wishlist/id/<name>/` links.
- IsThereAnyDeal limits a key to **100 requests per 5 minutes**, and a game needs one request. A big wishlist therefore loads in several steps (a 500-game list takes roughly 20 minutes the first time, and the panel shows the time left). Results are then cached, so later visits are instant until a new sale starts.
- Sale dates live in `backend/wsf_sales.lua`. When Valve announces new dates, add a line there. If no future sale is listed, the panel says so.
- The forecast is an estimate, see above.

## Development

```bash
npm install
npm run typecheck    # TypeScript check of the frontend and webkit
npm run build        # compiles into .millennium/Dist
luajit tests/run.lua # offline backend tests (needs luajit and lua-cjson)
./pack.sh            # typecheck, build and zip a release into build/
```

For live development, symlink the repository into `Steam/plugins/`, start Steam with `-dev`, and press F5 after frontend or webkit changes. After changing Lua code, restart Steam. Backend logs are in `Steam/logs/`.

| Part | Path | Role |
|---|---|---|
| Backend (Lua) | `backend/` | Steam and ITAD requests, the price rule, cache, settings |
| Webkit | `webkit/` | The panel on `store.steampowered.com/wishlist/...` |
| Frontend | `frontend/` | The settings page inside Millennium |
| Tests | `tests/` | Offline backend tests with fake HTTP |

Translations live in `webkit/i18n.ts` (panel) and `frontend/i18n.ts` (settings page). Corrections from native speakers are very welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License and credits

[MIT](LICENSE). Discount data by [IsThereAnyDeal](https://isthereanydeal.com/). Not affiliated with Valve or IsThereAnyDeal. Steam is a trademark of Valve Corporation.
