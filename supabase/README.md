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

## Test it locally

The checks play a chef, two customers and a Manna admin. They exercise every rule above
against a real Postgres database:

```bash
npm run test:db   # needs Postgres; set DATABASE_URL if it isn't postgresql://postgres@localhost/manna_test
```

`tests/00_stub_supabase.sql` stands in for the parts Supabase provides (`auth.users`,
`auth.uid()`, roles). Use it only for local tests, never on a real project. CI runs these
checks on every push.
