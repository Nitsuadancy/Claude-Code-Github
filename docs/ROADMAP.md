# Roadmap

The goal is to launch in **one city** with a small group of hand-picked chefs, learn,
then expand. Each phase ends with something real people can use.

## Phase 0: Prototype ✅

- [x] All mockup screens built as a working app (iOS, Android, web)
- [x] Foodie: browse, categories, search, filters, restaurant page, cart, orders
- [x] Chef: four-step setup, publish, order dashboard, pause orders
- [x] Unit tests, type checking, linting and CI on every pull request
- [x] Redesign around the Manna logo (dark, ivory serif, champagne gold)
- [x] Chef stories ("Meet the chef") and a Verified kitchen badge
- [x] Dish photos, dietary tags (vegan, halal…) and declared allergens
- [x] Daily dish limits ("Only 3 left today") and typical prep time
- [x] Order confirmation moment, live tracking timeline and chef notes to customers

## Phase 1: Real accounts and shared data

Without this, a chef and a customer on different phones can't see each other.

- [ ] Create the backend project (recommended: Supabase, see [ARCHITECTURE.md](ARCHITECTURE.md))
- [ ] Phone sign-in with real text-message codes (Supabase Auth + Twilio)
- [ ] Google and Apple sign-in. Apple's App Store rules require Apple sign-in if Google sign-in is offered.
- [ ] Database tables for profiles, restaurants, menu items, documents and orders, with row-level security
- [ ] Photo and document uploads to private storage
- [ ] Live order updates, so the chef's dashboard updates the moment an order is placed

## Phase 2: Getting paid

- [ ] Stripe Connect (Express accounts): chefs onboard to get paid, and Stripe handles identity checks and 1099-K tax forms
- [ ] Card, Apple Pay and Google Pay checkout
- [ ] Decide the fee model. The prototype uses a placeholder 10% customer service fee plus a $2.99 delivery fee. A commission on the chef's side is also common.
- [ ] Refunds and order cancellation rules

## Phase 3: Trust and safety (required before public launch)

- [ ] Admin review queue: approve chefs only after checking their permit and food handler card
- [ ] Allergen fields on menu items, shown clearly to customers
- [ ] Ratings and reviews after delivered orders
- [ ] Report a problem with an order
- [ ] Terms of Service, Privacy Policy and chef agreement (see [COMPANY_SETUP.md](COMPANY_SETUP.md))

## Phase 4: Getting food to people

**Open decision:** who carries the food?

1. **Pickup only.** This is the simplest and cheapest option, and it fits most cottage food laws.
2. **Chef delivers.** The chef sets a radius and a fee.
3. **Delivery partner.** For example, DoorDash Drive or Uber Direct send a courier on request. The customer pays per trip.

The recommendation is to launch with 1 and 2, then add 3 once order volume justifies it.

- [ ] Pickup vs. delivery choice at checkout
- [ ] Address search and distance limits (Google Places or Mapbox)
- [ ] Push notifications for new orders (chef) and status changes (customer)

## Phase 5: Launch

- [ ] Apple Developer and Google Play accounts in the company's name
- [ ] App icons, screenshots and store listings
- [ ] Beta with 10–20 chefs and friends and family through TestFlight and Play internal testing
- [ ] App Store and Google Play submission (`eas build` + `eas submit`)
- [ ] Crash reporting and analytics (Sentry plus a privacy-friendly analytics tool)

## Later ideas

- Scheduled and pre-orders (meal-prep Mondays)
- Weekly subscriptions from a favorite chef
- Chef storefront links to share on social media
- Promotions and "Offers" managed by chefs
- Catering and large orders
- Web dashboard for chefs
