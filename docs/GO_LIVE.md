# Going live: switching on the backend

Everything the real app needs is built and tested: SMS sign-in, shared data, live
updates, photo uploads, card payments, cook payouts, Manna Pro billing and push
notifications. All of it stays **off** until the settings below are filled in. Until
then the app runs as the demo, on one phone, and nothing is charged.

This guide covers the switches in the order you flip them. Plan on a few days of
setup and a week of testing with Stripe's test mode before real money moves.

## The switches

| Switch | Where | Turns on |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `.env` and EAS environment variables | Real sign-in, shared kitchens, orders and chat, live updates, uploads, push |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `.env` and EAS | Card checkout, the cook's "Set up payouts" card and Stripe billing for Pro |
| `EXPO_PUBLIC_APPLE_MERCHANT_ID` (optional) | `.env`, EAS and `app.json` | Apple Pay in the card sheet |
| `extra.eas.projectId` | `app.json` (written by `eas init`) | Push notifications |
| `app_settings.payments_required` | Database | Kitchens only see paid orders, and only kitchens with payouts set up can take orders |
| `launched_states` + `STATE_RULES[..].launched` | Database and `src/data/regions.ts` | Which states kitchens can open in (Florida today) |

The anon key and the publishable key are safe to ship in the app. **Secret keys never go in
the app, in `.env`, in git or in a chat.** They go in Supabase's function secrets (step 4),
which only the server functions can read.

## Accounts you need first

- **Supabase** (database, sign-in, storage). The free tier covers the beta; Pro ($25/month) before launch for daily backups.
- **Twilio** (sends sign-in codes). Needs a registered US number (A2P 10DLC or toll-free verification takes 1–3 weeks, so start early).
- **Stripe**, in the LLC's name, with the business bank account.
- **Expo / EAS** (builds and push).
- **Apple Developer** (needs the D-U-N-S number) and **Google Play Console**.
- **Firebase** (free; Android push goes through it).
- **A website** on the company domain. The app's web build works as one, and includes the pages Stripe sends people back to (step 4).

## 1. Database

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

This creates every table, rule and function, plus the three storage buckets
(`public-photos`, `order-photos`, `documents`) and their access rules.

Then, in the Supabase dashboard:

- **Authentication → Sign In / Providers → Phone:** turn it on and connect Twilio.
- **Authentication → Rate limits:** keep SMS limits on (they stop people from running up the Twilio bill).
- **Make yourself an admin.** Sign in to the app once with your phone, copy your user id from
  **Authentication → Users**, then in the **SQL editor** run:
  `update profiles set is_admin = true where id = '<your user id>';`

To approve a kitchen, check its documents in **Storage → documents**, then run this in the SQL
editor. The first line makes the editor act as you, since approving is limited to admins:

```sql
select set_config('request.jwt.claim.sub', '<your user id>', true);
select approve_restaurant('<kitchen id>');
```

Run both lines together. Approval checks that the cook confirmed their food law and that the
kitchen's state is launched, gives the kitchen its invite code and credits the cook who invited them.

## 2. The app

Copy `.env.example` to `.env` and fill in the project URL and anon key (Supabase →
Project Settings → API). For cloud builds, add the same values to EAS:

```bash
npx eas-cli init                      # links the project and writes extra.eas.projectId into app.json
npx eas-cli env:create --name EXPO_PUBLIC_SUPABASE_URL --value https://<ref>.supabase.co --environment production --environment preview --visibility plaintext
npx eas-cli env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <anon key> --environment production --environment preview --visibility plaintext
```

Before the first build, replace `com.mannaapp.manna` in `app.json` with the company's
own identifier (it can't change after the app is published).

Stripe and notifications need native code, so test with a development build, not Expo Go:
`npx eas-cli build --profile development --platform ios` (and `android`). The demo still
runs in Expo Go with the settings left empty.

## 3. Stripe

In the Stripe dashboard, in **test mode** first:

1. **Connect:** set up the platform as a marketplace with **Express** accounts. Cooks get paid
   out by Stripe, and Stripe collects their identity and tax details and sends their 1099-K.
2. **Products:** create **Manna Pro** with two prices, $19.99 monthly and $199 yearly. Copy both price ids.
3. **Billing → Customer portal:** allow switching between the two prices, updating cards and
   canceling at the end of the period.
4. **Developers → Webhooks:** add two endpoints, both pointing at
   `https://<ref>.supabase.co/functions/v1/stripe-webhook`:
   - **Your account:** `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`,
     `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.
   - **Connected accounts:** `account.updated`.
   Copy each endpoint's signing secret.
5. **Apple Pay (optional):** create a merchant id (`merchant.com.yourcompany.manna`) in your Apple
   Developer account, follow Stripe's steps to upload its certificate, put the id in `app.json`
   (`@stripe/stripe-react-native` → `merchantIdentifier`) and in `EXPO_PUBLIC_APPLE_MERCHANT_ID`.

Then put the **publishable** key in `.env` and EAS as `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

How the money moves (built into `create-payment`): the customer pays the order total. Stripe sends
the cook the food (less any discount code) plus the whole tip, minus the 5% kitchen fee. Manna keeps
the movement fee and the kitchen fee, and Stripe's card fee comes out of Manna's part. A declined or
cancelled order is refunded in full, fees included.

## 4. Server functions

The functions are in `supabase/functions/`. Set their secrets from your own terminal (type the
values there; never paste them anywhere else):

```bash
npx supabase secrets set \
  STRIPE_SECRET_KEY=sk_test_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  STRIPE_CONNECT_WEBHOOK_SECRET=whsec_... \
  STRIPE_PRICE_MONTHLY=price_... \
  STRIPE_PRICE_YEARLY=price_... \
  SITE_URL=https://yourdomain.com \
  NOTIFY_WEBHOOK_SECRET=<a long random string> \
  EXPO_ACCESS_TOKEN=<optional: an Expo access token with push security turned on>
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to the functions automatically.

Deploy them:

```bash
npx supabase functions deploy create-payment refund-payment stripe-connect pro-billing delete-account
npx supabase functions deploy stripe-webhook --no-verify-jwt
npx supabase functions deploy notify --no-verify-jwt
```

`stripe-webhook` and `notify` are called by Stripe and by the database, not by signed-in people,
so they check their own secrets instead of a sign-in.

| Function | Called by | Does |
|---|---|---|
| `create-payment` | App, after placing an order | Charges the card; Manna's fees kept, the rest to the cook |
| `refund-payment` | App, after a decline or cancel | Full refund |
| `stripe-connect` | Cook's "Set up payouts" card | Stripe onboarding, then the cook's Stripe dashboard |
| `pro-billing` | Pro page | Stripe Checkout to start Pro (founding kitchens' free months first), or the billing portal |
| `stripe-webhook` | Stripe | Marks orders paid, failed or refunded; payouts ready; Pro on or off |
| `notify` | Database webhooks | Push notifications |
| `delete-account` | App, when someone deletes their account | Cancels Pro and removes the sign-in |

**The website pages.** Stripe sends people back to `SITE_URL/return/payouts-done`,
`/return/payouts-refresh`, `/return/pro-done` and `/return/pro-cancel`. These pages are part of the
app's web build (`src/app/return/[step].tsx`), so if the website is the Manna web build
(`npm run build:web`, hosted at `SITE_URL`) there's nothing to make. Otherwise, make four one-line
pages at those paths: "All set. Go back to the Manna app."

## 5. Push notifications

1. **iPhone:** EAS creates the Apple push key the first time you build (`npx eas-cli credentials` to check).
2. **Android:** create a Firebase project, add the Android app (same package name), download
   `google-services.json` into the project, set `"googleServicesFile": "./google-services.json"` under
   `android` in `app.json`, and upload the FCM V1 service account key with `npx eas-cli credentials`.
3. **Database webhooks** (Supabase → Database → Webhooks). Create one for each table below, type
   **Supabase Edge Functions**, function `notify`, method POST, with an HTTP header
   `x-manna-secret` set to your `NOTIFY_WEBHOOK_SECRET`:

   | Table | Events |
   |---|---|
   | `orders` | Insert, Update |
   | `order_messages` | Insert |
   | `order_updates` | Insert |
   | `kitchen_alerts` | Insert |
   | `custom_requests` | Insert, Update |
   | `restaurants` | Update |
   | `order_issues` | Insert |
   | `message_reports` | Insert |
   | `review_reports` | Insert |

Who hears about what is in `supabase/functions/_shared/notifications.ts` (and its tests). The app
asks permission after a customer's first order or custom request, and when a cook opens their live
dashboard. Never at first launch.

## 6. Turn on payments

Do this in order, so no customer meets a kitchen that can't be paid:

1. Build with the publishable key and give it to your founding cooks (TestFlight / Play internal
   testing). Each one taps **Set up payouts** on their dashboard and finishes Stripe's steps.
2. Check they're ready: `select r.name, a.payouts_ready from restaurants r left join payment_accounts a on a.profile_id = r.owner_id;`
3. Switch payments on: `update app_settings set payments_required = true;`

From then on, kitchens only see orders once they're paid, an unpaid order's portions are freed
after 30 minutes, and a kitchen without payouts set up can't take orders.

## 7. Test before real money

With Stripe in test mode, run through this on two phones (one customer, one cook):

- [ ] Sign in with a real text code on both phones
- [ ] Cook: set up the kitchen, upload documents, submit; approve it in SQL; it shows on the customer's home
- [ ] Cook: Set up payouts with Stripe's test details; the card changes to "Payouts"
- [ ] Customer: order with card `4242 4242 4242 4242`; the cook gets a push and sees the order
- [ ] Card `4000 0000 0000 9995` (declined) shows Stripe's message and the cart stays
- [ ] Closing the card sheet calls the order off and keeps the cart
- [ ] Cook accepts, marks it making, then ready; the customer gets each push and sees the address after accepting
- [ ] Customer taps "I'm here"; the cook gets a push
- [ ] Cook declines an order; the customer is refunded in Stripe (Payments → refunded)
- [ ] Customer cancels before acceptance; refunded
- [ ] Chat both ways, with pushes; tapping a push opens the chat
- [ ] Custom order: request, price, accept and pay; the order arrives already accepted
- [ ] Pro: start on monthly (a founding kitchen sees no charge until its free months end), switch to yearly and cancel in the portal; the Pro page follows
- [ ] Delete a test account; its sign-in is gone and past orders still show "Former customer" to the cook
- [ ] Stripe → Connect → the test cook's balance shows food + tip − 5%

Then swap in the live keys and secrets (`pk_live_`, `sk_live_`, new webhook secrets) and do one
real $5 order end to end.

## Before you submit to the App Store

- **Pro is paid on the web.** "Start Pro" opens Stripe Checkout in the browser. On the US App Store,
  apps may link to web purchases. Confirm Apple's current guideline 3.1 at submission time and say
  so in the review notes. Food orders are physical goods, so card payments are fine anywhere.
- **Review notes:** give Apple a test customer phone number and code (Supabase → Authentication →
  Phone → test numbers) and a test kitchen to order from.
- **Privacy labels:** phone number, name, location (ZIP), photos, purchases and payment info
  (handled by Stripe), push token.

## Still to build or decide after launch

- Google and Apple sign-in (Apple's is required if Google's is offered)
- An admin screen for approving kitchens, reported messages and help requests (SQL and Supabase Studio until then)
- The support inbox for "Need help with this order?" (`order_issues` is ready)
- The lock-screen Live Activity ([LIVE_ACTIVITY.md](LIVE_ACTIVITY.md))
- Sales tax as a marketplace facilitator (ask the accountant; Stripe Tax can collect it)
