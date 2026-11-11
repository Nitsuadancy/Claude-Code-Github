# Manna database (Supabase)

`migrations/20261105000000_init.sql` is Manna's complete database: tables, security
rules and the server functions the app calls. The app is connected and switches to it
when `.env` is filled in; until then it runs as the on-device demo (see
[docs/GO_LIVE.md](../docs/GO_LIVE.md)).

## What's in it

| Part | What it does |
|---|---|
| `profiles` | One row per account, created automatically at sign-up. Name, role, neighborhood, diet and allergies. |
| `restaurants`, `menu_items` | Kitchens and dishes. Customers only see kitchens that are **live**. |
| `restaurant_documents` | Permits and certificates. Only the chef and the Manna team can see them. |
| `orders`, `order_lines`, `order_status_events` | Orders, the dishes in them (with the price at the time), and the tracking timeline. |
| `reviews`, `favorites` | One review per picked-up order. Each customer's favorite kitchens. |
| States | `restaurants.state` (two letters, default `FL`) says whose home-food law applies. The app only lets kitchens open in launched states (`src/data/regions.ts`); `timezone` follows the kitchen's market. |
| Bake days | `restaurants.order_mode` is `bake-days` or `hours`. Bake-day kitchens list weekly `bake_days` (pickup day, window, and how many days before at 8 PM orders close) and `skipped_bake_days`. `place_order()` only accepts a bake day that's still open. |
| Pickup handoff | `restaurant_addresses.instructions` is private and copied to the order on accept, like the address. `mark_arrived()` lets the customer say "I'm here". |
| `review_reports` | Reviews people flag. Only the reporter and admins can read them; `remove_review()` takes a review down and out of the rating. |

**Rules enforced by the database, not the app:**

- **Prices** are calculated on the server from the menu (`place_order`). A modified app can't change what it pays.
- **Daily limits** are checked when an order is placed. Each dish is locked while it's checked, so two people can't both buy the last portion.
- **Opening hours** apply to both "as soon as possible" and scheduled orders, including overnight hours.
- **Order status** only moves placed → accepted → preparing → ready → completed, or placed → declined, and only the receiving kitchen can move it.
- **Payments** (once `app_settings.payments_required` is on): kitchens only see paid orders, only kitchens with Stripe payouts set up can take orders, and a kitchen can't accept an unpaid order. Only the `stripe-webhook` function can mark an order paid (`mark_order_paid`).
- **Kitchens go live** only after the Manna team approves the permit and food handler certificate (`approve_restaurant`). Chefs can't mark themselves verified or change their ratings.
- **Privacy:** customers see only their own orders, and kitchens see only orders sent to them. Reviews show a first name and last initial.

## Set it up

1. Create a project at supabase.com. The free tier is fine for the beta.
2. Install the Supabase CLI, then link the project and push the schema:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
3. In the Supabase dashboard:
   - **Authentication → Providers:** turn on **Phone** and connect Twilio, which sends the sign-in codes.
   - **Storage:** nothing to do. `20261112000000_storage.sql` creates the three buckets and their rules:
     - `public-photos` (public): kitchen, dish and chef photos, pinned-update photos and cooks' intro videos.
     - `order-photos` (private): oven-update photos and pickup spot photos. The app shows these with signed URLs, only to that order's customer and kitchen.
     - `documents` (private): permits and IDs.
   - **Make yourself an admin:** sign in to the app once, copy your user id from Authentication → Users, and run
     `update profiles set is_admin = true where id = '<your user id>';` in the SQL editor.
4. Put the project URL and the **anon** key in `.env` as `EXPO_PUBLIC_SUPABASE_URL` and
   `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Never put the service-role key in the app.

## Connecting the app

The app is connected and stays off until `.env` is filled in. **[docs/GO_LIVE.md](../docs/GO_LIVE.md)
is the step-by-step guide**, including Stripe, the server functions and push notifications.

| Part | Where |
|---|---|
| Client, switched on by `.env` | `src/lib/supabase.ts` |
| Every call the app makes | `src/lib/remote/api.ts` (tested in `src/__tests__/remote.test.ts`) |
| Photo and document uploads | `src/lib/remote/uploads.ts` |
| Loading, live updates and sending changes | `src/state/server-sync.ts`, `src/state/store.tsx` |
| Rows ↔ app models | `src/lib/db/rows.ts`, `src/lib/db/mappers.ts` |
| Card payments and push on the phone | `src/lib/payments.native.ts`, `src/lib/push.native.ts` |
| Server functions (Stripe, refunds, payouts, Pro billing, push, account removal) | `supabase/functions/` |

Prices, limits, opening hours, codes, drops and order status are always decided by the database;
the app only shows the result.

**Server functions** are Deno. They aren't part of the app's TypeScript build; check them with
`deno check --no-config supabase/functions/*/index.ts` (CI does this on every push). Their money and notification rules live in
`supabase/functions/_shared/money.ts` and `notifications.ts`, which the app's jest tests also cover.

## Test it locally

The checks play a chef, two customers and a Manna admin. They exercise every rule above
against a real Postgres database:

```bash
npm run test:db   # needs Postgres; set DATABASE_URL if it isn't postgresql://postgres@localhost/manna_test
```

`tests/00_stub_supabase.sql` stands in for the parts Supabase provides (`auth.users`,
`auth.uid()`, roles). Use it only for local tests, never on a real project. CI runs these
checks on every push.
