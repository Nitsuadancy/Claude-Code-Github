# Architecture

## Today

```
Expo (React Native) app ── one codebase for iOS, Android and web
 ├─ src/app/        screens (Expo Router: file = route)
 ├─ src/components/ shared UI
 ├─ src/lib/        pure business logic (tested)
 └─ src/state/      reducer + AsyncStorage persistence (on-device only)
```

- **Framework:** Expo SDK 58, React Native, TypeScript (strict), Expo Router.
- **State:** one `useReducer` store in `src/state/`. Every change is an `Action` in
  `src/state/reducer.ts`, so the rules (for example, a cart holds one kitchen, and
  orders move placed → accepted → preparing → ready → delivered) live in one tested place.
- **Persistence:** the whole state is saved to AsyncStorage (localStorage on the web).
  This makes the demo work offline, but **nothing is shared between devices**.
- **Demo data:** `src/data/sample-restaurants.ts` seeds six kitchens so the Foodie
  side isn't empty.

### What's simulated

| Feature | Prototype behavior | Real version |
|---|---|---|
| Phone sign-in | Any 6-digit code is accepted | SMS one-time code via Supabase Auth + Twilio |
| Google / Facebook / Apple sign-in | "Coming soon" message | OAuth through Supabase Auth |
| Payments | Order is placed without charging | Stripe Connect PaymentIntent |
| Documents / photos | Stored as local file paths | Uploaded to private cloud storage |
| Document review | Skipped; publishing is instant | Admin approves before the kitchen goes live |
| Order updates | Same device only | Realtime subscription |

## Next: backend

**Recommendation: [Supabase](https://supabase.com)** (Postgres, Auth, Storage,
Realtime). It has phone OTP built in, row-level security for "chefs only see their own
orders", live updates for the order dashboard, and a free tier that covers the beta.
Payments go through **Stripe Connect** so chefs are paid out directly.

### Data model

The TypeScript types in `src/types.ts` map one-to-one to the planned tables:

| Table | Key fields | Who can read / write |
|---|---|---|
| `profiles` | id (= auth user), name, email, phone, role, delivery_address | Owner |
| `restaurants` | owner_id, name, cuisine, categories[], logo/cover paths, chef_bio, chef_photo_path, signature_item_id, prep_minutes, verified, address, city, zip, working_days[], open/close time, status (`draft`, `pending_review`, `live`), accepting_orders | Public reads `live` rows; owner writes; only admins set `verified` |
| `menu_items` | restaurant_id, name, description, price_cents, available, photo_path, dietary[], allergens[], daily_limit | Public reads; owner writes |
| `restaurant_documents` | restaurant_id, kind, storage_path, review_status | Owner + admins only |
| `orders` | customer_id, restaurant_id, status, subtotal/fee/total cents, delivery_address, chef_note, estimated_ready_at, stripe_payment_intent | Customer and that restaurant's owner |
| `order_status_events` | order_id, status, at | Same as orders. This table drives the tracking timeline. |
| `order_lines` | order_id, menu_item_id, name, price_cents, quantity (price copied at order time) | Same as orders |

Money is always stored in **cents** as integers, never floating point.

**Daily limits** must be enforced on the server when an order is placed (count today's
non-declined order lines inside the same transaction). The app's check in
`src/lib/limits.ts` only gives quick feedback in the interface.

**Saved data from older app versions** is upgraded on load by `src/lib/migrate.ts`. When
you add a field, give it a default there.

### Migration path

The UI talks only to the store (`useStore`, `useAllRestaurants`, `useMyRestaurant`)
and to plain functions in `src/lib/`. To add the backend:

1. Add a `src/services/` layer (auth, restaurants, orders) that calls Supabase.
2. Have reducer actions such as `placeOrder` and `setOrderStatus` call the service
   first, then update local state with the server's response.
3. Replace `SAMPLE_RESTAURANTS` with a query for live restaurants near the user.
4. Keep the `src/lib/` rules (pricing, opening hours, allowed status changes). Run the
   same checks in a database function so the server enforces them too.

Secrets (Supabase anon key, Stripe publishable key) go in `.env` as
`EXPO_PUBLIC_*` variables. **Never** put the Stripe secret key or Supabase service key
in the app. Those belong only in server functions.

## Builds and releases

- **CI:** `.github/workflows/ci.yml` runs type check, lint, tests and a web build on every push and pull request.
- **Mobile builds:** [EAS Build](https://docs.expo.dev/build/introduction/) (`npx eas-cli build`). You don't need a Mac for iOS.
- **Store submission:** `npx eas-cli submit`.
- **Over-the-air fixes:** `npx eas-cli update` for JavaScript-only changes.
- **Web:** `npm run build:web` produces a static site in `dist/` with one page per
  route. It can be hosted on EAS Hosting, Netlify, Vercel or Cloudflare Pages.

Before the first store build, replace the placeholder app identifiers
`com.mannaapp.manna` in `app.json` with one based on a domain the company owns, for
example `com.yourcompany.manna`. They can't be changed after the app is published.
