# Contributing

Issues and pull requests are welcome.

## Translations

All texts live in two files:

- `webkit/i18n.ts`, the panel on the wishlist page.
- `frontend/i18n.ts`, the settings page in Millennium.

Each language is one object with the same keys. TypeScript refuses to build if a key is missing, so run `npm run typecheck` after editing. To add a language, add its code in `webkit/locale.ts` (and the Steam language names that map to it), then add a dictionary to both files.

## Code

```bash
npm install
npm run typecheck
npm run build
luajit tests/run.lua
```

Please keep the backend tests passing and add a test when you change the price rule or the cache. Never commit API keys: `settings.json` and `cache.json` are ignored on purpose.

## Sale calendar

When Valve announces new seasonal sale dates, add them to `backend/wsf_sales.lua` (start time is 17:00 UTC) and mention the source in the pull request.
