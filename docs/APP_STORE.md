# App Store listing

Everything App Store Connect asks for, ready to paste. Character limits are in brackets and every field below fits.

## What's still needed before submitting

| Item | Who | Why |
|---|---|---|
| Apple Developer Program ($99/year) | Austin | Needed to create the app in App Store Connect and upload builds. |
| Domain with a privacy policy page and a support page | Austin | Apple requires both URLs. The text is ready in `src/data/legal.ts`. |
| Contact email | Austin | Replaces `LEGAL_CONTACT` in `src/data/legal.ts` and goes in the listing. |
| Live backend (Supabase) and payments (Stripe) | Austin + Claude | Apple rejects apps whose main flow doesn't work. Today orders are saved on the phone without charging a card. |
| Reviewer demo account | Claude, once the backend is live | A phone number with a fixed code, plus a demo kitchen, so Apple can test both sides. |
| Fresh screenshots | Claude | Recapture once payments are live, so the cart no longer shows "Payments aren't connected yet". |

## Name and text

**App name** [30]
`Manna: Home Kitchens`
If the name is taken, use `Manna — Homemade Nearby` instead.

**Subtitle** [30]
`Order from home cooks nearby`

**Promotional text** [170]. You can change this any time without a new review.
`Founding kitchens are open in College Park. Order breads, cakes, cookies and jams from neighbors who bake at home, and pick up nearby.`

**Description** [4000]

```
Manna is where neighbors buy from neighbors who cook at home.

Every kitchen on Manna is a real person in your neighborhood: the baker whose cinnamon rolls sell out at the Saturday pop-up, the grandmother with forty years of pound cake recipes, the cook you have been following on Instagram. Manna gives them a proper storefront, and gives you an easy way to order.

FOR FOOD LOVERS
• Discover home kitchens near you, starting in College Park, Orlando
• Meet the cook behind every dish and read their story
• See ingredients and allergens before you order, and filter by diet
• Order ahead for a cook's bake day, or pick up as soon as it's ready
• Follow your order from oven to pickup, then tap "I'm here" when you arrive
• Pay upfront in the app. No DMs, no Venmo requests, no guessing
• One 5% fee at checkout. Cooks keep every dollar of their prices, and every tip

FOR HOME COOKS
• Turn your kitchen into a storefront in minutes
• Bake days: take orders all week, bake in one batch, hand off in one pickup window
• Get paid upfront, and set your own prices and daily limits so you never oversell
• Make your page yours: accent color, tagline, a pinned update and your Instagram
• Today's menu: turn dishes on and off as you sell out
• A prep list that tells you what to bake today
• A ready-to-post Instagram Story with your QR code, so your followers can order in one tap
• Free to join. Founding kitchens get their storefront set up and photographed for free

SAFE AND HONEST
• Every kitchen's documents are checked before it gets a Verified badge
• Kitchens sell cottage foods under Florida law: breads, cakes, cookies, pastries, candy, jams and dry mixes
• Your pickup address stays private until you accept an order
• Report any review that breaks the rules; our team checks every report within 24 hours

Made in Orlando.
```

**Keywords** [100, comma-separated, no spaces after commas]. Words already in the name and subtitle count automatically, so they aren't repeated here.
`homemade,bakery,baked goods,cottage food,local,orlando,college park,bread,cake,cookies,jam,pastries`

**What's New** (first release)
`Welcome to Manna. Order from home kitchens in College Park, Orlando.`

## Categories and rating

- **Primary category:** Food & Drink
- **Secondary category:** Shopping
- **Age rating questionnaire:** answer "None" to everything except **user-generated content: Yes**, because of reviews. Reviews are moderated (reporting, 24-hour checks, removal), and there is no chat or messaging between users. App Store Connect works out the rating from these answers.
- **Price:** Free. Payments for food go through Stripe, not Apple, because the food is a physical good picked up outside the app (guideline 3.1.5(a)).

## URLs

- **Privacy policy URL:** `https://<domain>/privacy`
- **Support URL:** `https://<domain>/support` (a contact email and short FAQ is enough)
- **Marketing URL** (optional): `https://<domain>`

## App Privacy ("nutrition label")

**Tracking:** No. Manna doesn't track people across other companies' apps or websites, and has no ad SDKs.

All data below is **linked to the user** and **not used for tracking**.

| Data type | What Manna collects | Purposes |
|---|---|---|
| Contact info: Name | Your name | App functionality |
| Contact info: Email address | Optional email | App functionality, customer support |
| Contact info: Phone number | Sign-in phone number | App functionality |
| Contact info: Physical address | A kitchen's pickup address (cooks only) | App functionality |
| Health & fitness: Health | Allergens people choose to avoid | App functionality |
| Financial info: Payment info | Handled by Stripe; Manna never sees full card numbers. Declare it only if Stripe's SDK runs in the app | App functionality |
| Purchases: Purchase history | Orders | App functionality |
| User content: Photos | Menu, kitchen and chef photos (cooks only) | App functionality |
| User content: Other user content | Reviews, reports, notes to the chef, cook verification documents | App functionality |
| Identifiers: User ID | Account ID | App functionality |
| Diagnostics: Crash data | Only once crash reporting is added | App functionality |

Dietary preferences such as halal or vegan are part of "Other user content". Allergies are listed under Health to be safe.

## Notes for App Review

Paste this into "Notes" and fill in the demo details once the backend is live.

```
Manna is a marketplace for home kitchens in Orlando, Florida. Kitchens sell
cottage foods (breads, cakes, cookies, jams), which Florida law allows without
a state permit. All orders are for pickup; there is no delivery.

Food is a physical good picked up outside the app, so payments go through
Stripe rather than in-app purchase (guideline 3.1.5(a)).

Demo customer: <phone>, code <code>. Order from any kitchen and follow the
order on the Orders tab.
Demo cook: <phone>, code <code>. Opens the kitchen dashboard for "<kitchen>",
where you can accept the order you placed as the customer.

Account deletion: Profile > Delete account.
Reporting reviews: any kitchen page > Reviews > Report.
```

## Guideline checklist

- [x] **5.1.1(v) Account deletion.** Profile → Delete account removes the account in the app.
- [x] **1.2 User-generated content.** Reviews can be reported, reports are checked within 24 hours, the terms forbid abusive content, and admins can remove reviews (`remove_review`). There is no messaging between users, so blocking isn't needed for launch.
- [x] **4.8 Sign in with Apple.** Not required: Manna signs in with a phone number only, with no Google or Facebook login.
- [x] **5.1.1 Permission strings.** Photo library (choose photos) and photo saving (Story card) are explained in `app.json`.
- [x] **Export compliance.** `usesNonExemptEncryption: false` is set, so there's no question at upload.
- [ ] **2.1 App completeness.** Needs a live backend and payments.
- [ ] **5.1.1 Privacy policy.** Needs a public URL and an attorney's review.

## Screenshots

`store/screenshots/` holds seven 1290 × 2796 images for the 6.9" iPhone size. Apple scales them for smaller iPhones. Upload them in this order:

1. Homemade, from the kitchen next door. (home)
2. Meet the cook behind every dish. (kitchen page)
3. Know what's in it before you order. (dish and allergens)
4. Follow your order from oven to pickup. (order tracking)
5. One small fee. Nothing hidden. (checkout)
6. Your kitchen, now a storefront. (cook dashboard)
7. Turn your Instagram into orders. (Story card)

To regenerate them after design changes:

```bash
npm run build:web && npx serve dist -l 8765    # in one terminal
node store/capture.js store/raw                # customer screens
node store/capture-chef.js store/raw           # cook screens
node store/frame.js store/raw                  # captions and frames → store/screenshots
```

The captures use a fixed clock (Saturday 10:40 AM in Orlando) so kitchens show as open.
