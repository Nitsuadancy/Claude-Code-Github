# Manna database (Supabase)

`migrations/20261105000000_init.sql` is Manna's complete database: tables, security
rules and the server functions the app will call. It's tested, but the app isn't
connected to it yet. The app still stores everything on the device (see
`docs/ARCHITECTURE.md`).

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
- **Order status** only moves placed → accepted → preparing → ready → delivered, or placed → declined, and only the receiving kitchen can move it.
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
   - **Storage:** create two buckets. Make `public-photos` public, for kitchen, dish and chef photos. Make `documents` private, for permits.
   - **Make yourself an admin:** run this in the SQL editor:
     `update profiles set is_admin = true where email = 'you@yourcompany.com';`
4. Put the project URL and the **anon** key in `.env` as `EXPO_PUBLIC_SUPABASE_URL` and
   `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Never put the service-role key in the app.

## Connecting the app

The groundwork is in place and does nothing until `.env` is filled in (copy `.env.example`):

- `src/lib/supabase.ts` creates the client from the two settings, keeps the sign-in on the
  device, and turns storage paths into photo URLs. Without the settings, `supabase` is `null`
  and the app keeps working on the device as it does today.
- `src/lib/db/rows.ts` describes each table's rows; `src/lib/db/mappers.ts` turns them into
  the app's models and back, with tests in `src/__tests__/db-mappers.test.ts`. Orders are
  placed through `place_order()` with only dish ids and quantities, so prices always come
  from the server.

Still to do when the project exists:

1. **Sign-in:** phone codes with `supabase.auth.signInWithOtp({ phone })` and `verifyOtp`.
2. **Data:** load kitchens, menus, orders and reviews through the mappers, and listen to
   order changes with Realtime so both sides update live.
3. **Photos:** upload to the `public-photos` bucket before saving a dish or kitchen.
4. **Account deletion:** `delete_my_account()` clears the person's data, but removing the
   sign-in itself (`auth.users`) needs the service-role key. Add a small Edge Function that
   calls `delete_my_account()` as the user and then `auth.admin.deleteUser()`.
5. **Payments:** charge with Stripe when the kitchen accepts; see docs/ROADMAP.md.
6. **Most ordered:** call `popular_menu_items()` and pass the ids to `restaurantFromRow`.

## Test it locally

The checks play a chef, two customers and a Manna admin. They exercise every rule above
against a real Postgres database:

```bash
npm run test:db   # needs Postgres; set DATABASE_URL if it isn't postgresql://postgres@localhost/manna_test
```

`tests/00_stub_supabase.sql` stands in for the parts Supabase provides (`auth.users`,
`auth.uid()`, roles). Use it only for local tests, never on a real project. CI runs these
checks on every push.
