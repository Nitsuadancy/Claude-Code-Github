@AGENTS.md

## Manna project notes

- Manna is a two-sided marketplace: **Foodies** order from **Culinary Entrepreneurs** (home chefs) who run virtual restaurants. Read `README.md` and `docs/` first.
- Match the mockup look: tokens in `src/theme`, shared UI in `src/components/ui.tsx`.
- Business rules belong in `src/lib/` with tests in `src/__tests__/`. State changes go through the reducer in `src/state/reducer.ts`.
- The backend isn't built yet. Sign-in, payments and uploads are simulated (see `docs/ARCHITECTURE.md`). Don't present them as real.
- Run `npm run check` before committing.
