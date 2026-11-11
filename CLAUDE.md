@AGENTS.md

## Manna project notes

- Manna is a two-sided marketplace: **Foodies** order from **Culinary Entrepreneurs** (home chefs) who run virtual restaurants. Read `README.md` and `docs/` first.
- Match the mockup look: tokens in `src/theme`, shared UI in `src/components/ui.tsx`.
- Business rules belong in `src/lib/` with tests in `src/__tests__/`. State changes go through the reducer in `src/state/reducer.ts`.
- The backend (Supabase, Stripe, push) is built but off until `.env` is filled in (`docs/GO_LIVE.md`). In the demo, sign-in, payments and uploads are simulated (see `docs/ARCHITECTURE.md`). Don't present them as real.
- Backend calls live in `src/lib/remote/`; server functions in `supabase/functions/` (Deno, excluded from the app's tsc and ESLint). Database changes need `npm run test:db`.
- Run `npm run check` before committing.
