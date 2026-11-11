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
| Help with an order | Saved on the phone; the sheet says so | `order_issues` table, sent to Manna's support inbox |
| Pull to refresh | Redraws with the current time | Refetches orders |
| Order chat | Messages stay on the phone; the chat says so | `order_messages` with Realtime, plus push notifications |
| Oven updates, pickup spot photo, intro video | Saved on the phone as local files | `order_updates` and storage buckets (`order-photos` private, `public-photos`) |
| Drive times on the map | Estimated from neighborhood centers | Same estimate; real routing only if people ask for it |
| Lock-screen order status | Content and timing built and tested | `expo-widgets` Live Activity in the first iPhone build ([LIVE_ACTIVITY.md](LIVE_ACTIVITY.md)) |
| Manna Pro billing | "Start Pro" turns it on without a charge | Stripe Billing on the web, with a webhook that sets the plan ([PRO.md](PRO.md)) |
| Alerts, drops, codes, custom requests | Kept on the phone | `kitchen_alerts`, `drops`, `discount_codes` and `custom_requests` tables, with push notifications |

## Next: backend

**Status:** the database schema, security rules and server functions are written and
tested in [`supabase/`](../supabase/README.md). The next step is connecting the app to it.

**Recommendation: [Supabase](https://supabase.com)** (Postgres, Auth, Storage,
Realtime). It has phone OTP built in, row-level security for "chefs only see their own
orders", live updates for the order dashboard, and a free tier that covers the beta.
Payments go through **Stripe Connect** so chefs are paid out directly.

### Data model

The TypeScript types in `src/types.ts` map one-to-one to the planned tables:

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
| `orders` | customer_id, restaurant_id, status, subtotal / discount / movement fee / kitchen fee / tip / total cents, drop_id, pickup_address (filled when the chef accepts), chef_note, customer_note, scheduled_for, estimated_ready_at, stripe_payment_intent | Customer and that restaurant's owner |
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
  Configure the host to serve `+not-found.html` (with status 404) for unknown
  paths, so mistyped links show Manna's own "Off the menu" page.

Before the first store build, replace the placeholder app identifiers
`com.mannaapp.manna` in `app.json` with one based on a domain the company owns, for
example `com.yourcompany.manna`. They can't be changed after the app is published.
