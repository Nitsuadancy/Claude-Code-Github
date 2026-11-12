# Architecture

## Overview

```
Expo (React Native) app ── one codebase for iOS, Android and web
 ├─ src/app/        screens (Expo Router: file = route)
 ├─ src/components/ shared UI
 ├─ src/lib/        pure business logic (tested)
 │   └─ remote/     every call to the backend (tested with a fake client)
 └─ src/state/      reducer + AsyncStorage, and server-sync when the backend is on

supabase/
 ├─ migrations/     database, security rules and server-side business rules (tested)
 └─ functions/      Edge Functions: Stripe payments, refunds, payouts, Pro billing, push
```

- **Framework:** Expo SDK 58, React Native, TypeScript (strict), Expo Router.
- **State:** one `useReducer` store in `src/state/`. Every change is an `Action` in
  `src/state/reducer.ts`, so the rules (for example, a cart holds one kitchen, and
  orders move placed → accepted → preparing → ready → completed) live in one tested place.
- **Two modes, one app.** Without backend settings in `.env`, everything is saved to
  AsyncStorage on the phone and six sample kitchens fill the Foodie side: this is the demo.
  With them, the same screens and actions run against Supabase.
- **With the backend on** (`src/state/server-sync.ts`):
  - On sign-in the app loads the person's profile, kitchen, nearby kitchens, orders, chat,
    saved kitchens, alerts and custom requests in one `syncFromServer`.
  - Every action still updates the screen at once; actions other people need to see are also
    sent to the server, and a fresh load follows so the app shows the server's prices and checks.
    If the server refuses, the person sees its message and the app reloads.
  - Orders and chat update live through Realtime; everything else refreshes every 5 minutes and on pull-to-refresh.
  - Placing an order, accepting a quote and publishing a kitchen wait for the server's answer.
- **Payments** (`src/lib/payments.native.ts`, `supabase/functions/create-payment`): the server
  starts a Stripe PaymentIntent for the order's database-calculated total and the app shows
  Stripe's payment sheet. Manna keeps the movement and kitchen fees; the rest goes straight to
  the cook's Stripe account. Stripe's webhook marks the order paid, and only then does the
  kitchen see it.
- **Push** (`src/lib/push.native.ts`, `supabase/functions/notify`): database webhooks call
  `notify`, which decides who hears about each change and sends through Expo's push service.

Turning it all on is in [GO_LIVE.md](GO_LIVE.md).

### Demo mode vs. backend on

| Feature | Demo (no `.env`) | Backend on |
|---|---|---|
| Phone sign-in | Any 6-digit code is accepted | SMS code via Supabase Auth + Twilio |
| Google / Apple sign-in | Hidden | Through Supabase, when `EXPO_PUBLIC_SIGN_IN_WITH` is set |
| Kitchens | Six sample kitchens | Live kitchens within 25 miles of the person's ZIP (`nearby_kitchens`) |
| Payments | Order is placed without charging | Stripe payment sheet; refunds on decline or cancel (needs the Stripe key too) |
| Cook payouts | Not shown | Stripe Connect Express, from the dashboard's payouts card |
| Documents / photos | Local file paths | Uploaded to storage buckets (`public-photos`, private `order-photos` and `documents`) |
| Document review | Skipped; publishing is instant | Submitted for review; the team approves or sends back in Manna team tools |
| Orders and chat | Same phone only | Shared, with Realtime updates |
| Push notifications | None | New orders, status changes, messages, oven updates, quotes, alerts |
| Help with an order | Saved on the phone; the sheet says so | `order_issues`, with a push to the team and Help requests in the team tools |
| Manna Pro billing | "Start Pro" turns it on without a charge | Stripe Checkout and billing portal on the web; the webhook sets the plan |
| Alerts, drops, codes, custom requests | Kept on the phone | Their tables, checked by the database |
| Drive times on the map | Estimated from ZIP centers | Same estimate |
| Lock-screen order status | Content and timing built and tested | `expo-widgets` Live Activity in the first iPhone build ([LIVE_ACTIVITY.md](LIVE_ACTIVITY.md)) |

## Backend

[Supabase](https://supabase.com) (Postgres, Auth, Storage, Realtime, Edge Functions) and
**Stripe Connect** for payments. The schema, security rules and server functions are in
[`supabase/`](../supabase/README.md) and tested in CI against a real Postgres.

### Data model

The TypeScript types in `src/types.ts` map to these tables (through `src/lib/db/mappers.ts`):

| Table | Key fields | Who can read / write |
|---|---|---|
| `profiles` | id (= auth user), name, email, phone, role, neighborhood | Owner |
| `restaurants` | owner_id, name, cuisine, categories[], logo/cover paths, chef_bio, chef_photo_path, signature_item_id, prep_minutes, verified, founding, live_since, pro plan fields, in_person (spots), neighborhood, city, zip, working_days[], open/close time, status (`draft`, `pending_review`, `live`), accepting_orders | Public reads `live` rows; owner writes; only admins set `verified` and `founding` |
| `menu_items` | restaurant_id, name, description, price_cents, available, photo_path, dietary[], allergens[], daily_limit | Public reads; owner writes |
| `restaurant_documents` | restaurant_id, kind, storage_path, review_status | Owner + admins only |
| `restaurant_addresses` | restaurant_id, address | Owner and admins only. Copied onto an order when the chef accepts it |
| `drops`, `drop_items` | restaurant_id, title, pickup window, closes_at; the dishes in each drop | Public reads for live kitchens; owner writes (new ones need Pro) |
| `discount_codes` | restaurant_id, code, kind, value, first-orders-only, max uses, end date, paused | Owner and admins only; checked inside `place_order` |
| `custom_requests` | restaurant_id, customer_id, occasion, details, servings, needed_by, status, quote | Customer and the kitchen; quotes and acceptance through functions |
| `kitchen_alerts` | restaurant_id, body | Owner, admins and customers who saved the kitchen; 2 a week with Pro |
| `orders` | customer_id, restaurant_id, status, subtotal / discount / movement fee / kitchen fee / tip / total cents, drop_id, pickup_address (filled when the chef accepts), chef_note, customer_note, scheduled_for, estimated_ready_at, payment_intent_id, payment_status (`unpaid`, `paid`, `refunded`, `failed`) | Customer and that restaurant's owner (with payments on, the kitchen only sees paid orders) |
| `order_status_events` | order_id, status, at | Same as orders. This table drives the tracking timeline. |
| `order_lines` | order_id, menu_item_id, name, price_cents, quantity (price copied at order time) | Same as orders |
| `payment_accounts` | profile_id, stripe_customer_id, stripe_account_id, payouts_ready | The person can read their own; only the server functions write |
| `push_tokens` | token, profile_id, platform | Only the `notify` function reads; written through `register_push_token` |
| `app_settings` | payments_required | Admins |
| `launched_states` | code | Admins; `approve_restaurant` checks it |

Money is always stored in **cents** as integers, never floating point.

**Daily limits** must be enforced on the server when an order is placed (count today's
non-declined order lines inside the same transaction). The app's check in
`src/lib/limits.ts` only gives quick feedback in the interface.

**Saved data from older app versions** is upgraded on load by `src/lib/migrate.ts`. When
you add a field, give it a default there.

### Secrets

The Supabase anon key and the Stripe publishable key go in `.env` as `EXPO_PUBLIC_*`
variables; they're safe in the app because row-level security and the server functions
decide what each person can do. The Stripe secret key, webhook secrets and Supabase
service-role key are **only** Supabase function secrets ([GO_LIVE.md](GO_LIVE.md), step 4).

## Builds and releases

- **CI:** `.github/workflows/ci.yml` runs type check, lint, tests and a web build on every push and pull request.
- **Mobile builds:** [EAS Build](https://docs.expo.dev/build/introduction/) (`npx eas-cli build`). You don't need a Mac for iOS.
- **Store submission:** `npx eas-cli submit`.
- **Over-the-air fixes:** `npx eas-cli update` for JavaScript-only changes.
- **Web:** `npm run build:web` produces a static site in `dist/` with one page per
  route. It can be hosted on EAS Hosting, Netlify, Vercel or Cloudflare Pages.
  Configure the host to serve `+not-found.html` (with status 404) for unknown
  paths, so mistyped links show Manna's own "Off the menu" page.

Before the first store build, replace the placeholder app identifiers
`com.mannaapp.manna` in `app.json` with one based on a domain the company owns, for
example `com.yourcompany.manna`. They can't be changed after the app is published.
