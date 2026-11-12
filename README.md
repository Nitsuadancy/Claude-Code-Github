# Manna

**Your neighborhood's kitchens, in one place.**

Manna is an online restaurant platform. Home cooks, stay-at-home parents, culinary
graduates and aspiring restaurateurs open their own virtual restaurant. They set the
menu, the hours and the specialty. Neighbors browse and order from them. There's no
building, no lease and no big upfront cost.

Two kinds of people use the app:

| | Foodie | Culinary Entrepreneur |
|---|---|---|
| Goal | Discover and enjoy meals crafted with care | Bring your dream restaurant to life |
| Main screens | Browse kitchens, search, categories, cart, order tracking | Restaurant setup (info, documents, menu, preview), order dashboard |

Read the full vision in [docs/BUSINESS_PLAN.md](docs/BUSINESS_PLAN.md).

## Status

This is a **working prototype**. It started from the original UI/UX mockups and was
redesigned around the Manna logo: black, ivory serif type and fine gold rays (see
[docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)). Every screen runs end to end on
iPhone, Android and the web. Out of the box it runs as a demo with data stored on
the device. The real backend (Supabase and Stripe) is built and switches on when
`.env` is filled in; see [docs/GO_LIVE.md](docs/GO_LIVE.md). The app includes:

- Onboarding, role choice and phone sign-in. Sign-in runs in demo mode: any 6-digit code works.
- Foodie side: categories, search, filters and sorting, restaurant pages, a cart with fees, placing orders and order status.
- Chef side: the four-step setup (information, documents, menu, preview), publishing, accepting and advancing orders, and pausing the kitchen.

Built and waiting for accounts: text-message sign-in, shared data with live
updates, card payments with cook payouts, Manna Pro billing and push notifications.
It also has Apple and Google sign-in (off until set up) and tools for the Manna
team to review kitchens, answer help requests and handle reports. Not built yet:
delivery. See
[docs/ROADMAP.md](docs/ROADMAP.md) for the plan.

## Run it

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm start          # opens the Expo dev server
```

Then do one of these:

- **On your phone:** install **Expo Go** from the App Store or Google Play and scan the QR code.
- **In a browser:** press `w`.
- **In a simulator:** press `i` (iOS, Mac only) or `a` (Android).

### Try the whole loop

1. Choose **Culinary Entrepreneur**, sign in with any 10-digit number and any 6-digit code, then set up and publish a restaurant.
2. Open **Dashboard → Account → Switch to Foodie** and order from your new kitchen.
3. Go to **Profile → Become a Culinary Entrepreneur**. The order is waiting on your dashboard.

## Run it on an iPhone

See [docs/IPHONE.md](docs/IPHONE.md): build in the cloud with Expo and install through TestFlight. No Mac needed.

The App Store listing (name, description, keywords, privacy answers, review notes) is in [docs/APP_STORE.md](docs/APP_STORE.md), and the screenshots are in `store/screenshots/`.

## Recruitment flyer and Instagram post

`node marketing/render.js https://your-signup-link` renders a print-ready flyer (`marketing/out/flyer.pdf`) and an Instagram post (`marketing/out/instagram-post.png`) with a QR code to that link.

## Share a demo link

The fastest way to send people a link they can open on any phone or computer:

1. Run `npm run build:web`. This creates the `dist/` folder.
2. **Netlify Drop:** go to app.netlify.com/drop and drag the `dist` folder onto the page. You get a link in seconds. A free account keeps it online.
3. **Or EAS Hosting** (Expo's own hosting): run `npx eas-cli@latest deploy` and sign in with an Expo account.

Everything in the demo is stored in each visitor's own browser, so every person who opens the link gets a fresh copy with the sample kitchens.

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Start the dev server |
| `npm test` | Unit tests (Jest) |
| `npm run typecheck` | TypeScript type check |
| `npm run lint` | ESLint |
| `npm run check` | All three of the above. CI runs this on every pull request. |
| `npm run build:web` | Static web build in `dist/` |
| `npm run test:db` | Database schema checks (needs Postgres; see `supabase/README.md`) |

## Project layout

```
src/
  app/                 Screens. Every file is a route (Expo Router).
    welcome, choose-role, login, about-you
    foodie/            Tabs: Delivery (home), Orders, Cart, Profile
    restaurant/[id]    Restaurant page and menu
    chef/setup/        Setup steps: information, documents, menu, preview
    chef/dashboard     Orders and kitchen management
  components/          Shared UI: gold buttons, fields, tab bar, cards
  lib/                 Business logic with no UI (pricing, hours, search, validation)
  state/               App state (reducer + on-device storage)
  data/                Categories, cuisines and demo restaurants
  theme/               Colors, fonts and spacing from the mockups
docs/                  Business plan, roadmap, architecture, company setup
```

## Docs

- [Business plan](docs/BUSINESS_PLAN.md): the why
- [Roadmap](docs/ROADMAP.md): what gets built next, in order
- [Architecture](docs/ARCHITECTURE.md): how the app is put together and how the backend plugs in
- [Going live](docs/GO_LIVE.md): switching on the backend, payments and push, step by step
- [Design system](docs/DESIGN_SYSTEM.md): colors, type and components
- [Company setup](docs/COMPANY_SETUP.md): legal, accounts and food-law checklist
- [Contributing](CONTRIBUTING.md): how work flows from issue to release
