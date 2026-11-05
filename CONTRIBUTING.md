# Contributing to Manna

## How work flows

1. **Issue.** Every piece of work starts as a GitHub issue that uses the Feature or Bug template.
   Roadmap items in [docs/ROADMAP.md](docs/ROADMAP.md) become issues when they're picked up.
2. **Branch.** Branch off `main` (`feature/short-name` or `fix/short-name`).
3. **Pull request.** Open a PR that links the issue and fill in the template. Include
   screenshots for anything visual.
4. **Checks.** CI must pass: type check, lint, tests and the web build.
5. **Review and merge.** At least one other person approves before merging to `main`.

## Before you push

```bash
npm run check   # typecheck + lint + tests
```

## Conventions

- **Screens** go in `src/app/`. Each file is a route. Anything that isn't a screen goes elsewhere.
- **Business rules** (prices, opening hours, order status rules, validation) go in
  `src/lib/` as plain functions with tests in `src/__tests__/`.
- **Colors, fonts and spacing** come from `src/theme`. Don't hard-code new colors.
- **Money** is always integer cents.
- **Expo packages:** add them with `npx expo install <package>` so versions match the SDK.
- **Accessibility:** every button needs a label people can hear. Touch targets should be at least 44pt.
- **Secrets** never go in the repository. Use `.env` (ignored by git) and EAS secrets.
