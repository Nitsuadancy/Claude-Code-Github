# Manna Pro

Manna Pro is the optional plan for cooks: **$19.99 a month or $199 a year** (two months free).
It's built to bring in more orders and bigger ones, so it pays for itself. Pro is available from launch.

Every kitchen gets the basics with or without Pro:

- storefront, menu, photos and intro video
- orders and payouts
- bake days, daily limits and the prep list
- order chat, oven updates and the pinned update
- printable labels
- reviews and the Instagram Story card

Printable labels stay free because they help cooks follow their state's labeling rules.

**Founding kitchens** get Pro free for their first 3 months on Manna, the same months they pay no kitchen fee. They can pick a plan during those months, and billing starts when the free months end.

## What Pro adds

| Tool | What it does | Where |
|---|---|---|
| Featured on Manna | Pro kitchens take turns at the top of the home screen (rotating daily) and come first in Taste, marked "Featured" | `src/lib/pro.ts` `featuredKitchens`, `src/lib/taste.ts` |
| Drops | A one-off menu with its own pickup window and deadline ("Thanksgiving pies, order by Tuesday"). Shown on the kitchen page and in the Drops row on home. Dishes can be marked "Only in drops" | `src/lib/drops.ts`, `src/app/drop/[id].tsx`, `src/app/chef/drops.tsx`, `src/app/chef/drop/[id].tsx` |
| Alerts to followers | Up to 2 a week to everyone who saved the kitchen. They land in Activity (push notifications later) | `src/lib/alerts.ts`, `src/app/chef/alerts.tsx` |
| Custom orders | Customers request cakes, trays and catering (3 to 60 days out). The cook sends a price and a pickup window, and the customer accepts it as an order that starts accepted | `src/lib/custom-orders.ts`, `src/app/custom/`, `src/app/chef/requests.tsx`, `src/app/chef/request/[id].tsx` |
| Discount codes | Percent or dollars off, optional first-order-only, end date and use limit. The kitchen pays for the discount, and both fees are worked out on what the customer pays | `src/lib/discounts.ts`, `src/app/chef/codes.tsx`, checkout |
| Insights | Month take-home and orders vs last month, average order, repeat rate, best days, busiest pickup hours, best sellers, regulars | `src/lib/insights.ts` `kitchenInsights`, `src/app/chef/insights.tsx` |

**Lapsed plans:** when a plan lapses, the cook's drops, codes and requests stay saved. Drops already open keep taking orders. Making new drops, codes or alerts needs Pro again.

## Rules in the database

The same rules are enforced in `supabase/migrations/20261105000000_init.sql` and tested in `supabase/tests/10_scenarios.sql`.

- **Plan fields:** `restaurants.pro_plan`, `pro_started_at`, `pro_billing_starts_at` and `pro_canceled_at`. Only billing or the Manna team can set them; a cook can't.
- **`has_pro(r, ts)`** mirrors `proStatus()`: free founding months, an active plan, or a canceled plan running out its last paid period.
- **Drops:** the `drops` and `drop_items` tables. `place_order(..., p_drop_id)` uses the drop's window, rejects dishes outside the drop, and rejects drop-only dishes on everyday orders. A drop with orders can't be deleted.
- **Discount codes:** the `discount_codes` table, readable only by the kitchen. `place_order(..., p_discount_code)` checks the code and stores `discount_code` and `discount_cents`. Both fees are worked out on the food after the discount.
- **Custom orders:** the `custom_requests` table, plus `quote_custom_request`, `decline_custom_request`, `withdraw_custom_request` and `accept_custom_quote` (which creates the order with a single `Custom: …` line).
- **Alerts:** the `kitchen_alerts` table. Only followers can read them, and the insert policy allows 2 a week while the kitchen has Pro.

## Before launch: billing

Billing isn't connected yet. Today "Start Pro" turns Pro on without a charge, like the simulated payments. Before launch:

1. **Stripe Billing:** create two prices ($19.99 monthly, $199 yearly) and a Checkout page on the Manna website.
2. **Webhook:** set `pro_plan`, `pro_started_at`, `pro_billing_starts_at` and `pro_canceled_at` from Stripe events (`checkout.session.completed`, `customer.subscription.updated` and `customer.subscription.deleted`), using the service role. For a founding kitchen, set the trial end to the end of its free months.
3. **In the app:** "Start Pro" opens the web checkout. On the US App Store, apps can link to web purchases. Check Apple's current guideline 3.1 before submitting. Selling Pro as an in-app purchase would cost 15–30%.
4. **Cancel:** link to Stripe's customer portal. Pro stays on until the period ends, which `has_pro` already handles.
5. **Tax:** ask the accountant whether Pro needs sales tax in Florida. Stripe Tax can collect it.
