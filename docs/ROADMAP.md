# Roadmap

The goal is to launch in **one city** with a small group of hand-picked chefs, learn,
then expand. Each phase ends with something real people can use.

## Launch decisions (November 2026)

| Question | Decision | Why |
|---|---|---|
| Where | Orlando, starting with College Park and nearby neighborhoods | Density beats reach: 20 cooks in one area make a better first week than 60 spread out |
| What can be sold | Florida cottage foods only: breads, pastries, cookies, cakes, candy, granola, jams and dry spice blends | Hot meals need a licensed kitchen. Licensed kitchens can join later as a second kitchen type |
| How food changes hands | Pickup only, at a time the customer picks. The street address is shared once the chef accepts | No courier costs, and home cooks keep their address private |
| Fee | One 5% movement fee paid by the customer. Card processing comes out of it, and kitchens keep 100% of their prices | One honest number, far below delivery apps |
| Manna Fest | Postponed. Recruit the first cooks at existing markets (Lake Eola, Winter Park, Audubon Park), on Instagram and through churches | Same people the Fest would reach, without the cost and risk of running an event |
| Farmers and artisans | Waitlist in the app now; Manna Mart after the food side works | Growers need buyers first |
| Rewards | Badges, placement and early access first. Physical gifts only once the fee covers them, or a sponsor pays | Early gift tiers cost more than the orders bring in |

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
- [x] Motion: press-scale cards, staggered fade-ins, parallax restaurant hero with a sticky header
- [x] "Order again" with one-tap reorder, favorites row, "Open now" filter, dish search results
- [x] Chef dashboard: today's prep list and a 7-day earnings chart
- [x] Ratings and reviews after delivery (stars, quick compliments, note); "What neighbors say" on restaurant pages
- [x] Schedule for later, including pre-orders from kitchens that are closed right now
- [x] Editorial collections (Grandma’s Recipes, Plant-Powered, Sweet Endings…), animated logo, reviews on the chef dashboard, text-size caps for accessibility
- [x] Activity feed behind the bell (order updates, chef notes, unseen dot), profile stats, help and legal links, styled not-found and crash screens
- [x] Swipeable cover photo gallery, customer notes to the chef (allergies, requests), live card preview while chefs set up
- [x] Menu sections (Specials, Mains, Sides, Desserts, Drinks), share a kitchen, live pulse on the current tracking step
- [x] Personal diet & allergy profile: "Fits your diet" tags, allergen warnings on dishes and in the cart, "Fits my diet" filter
- [x] Accessibility audit (no nested or unlabeled buttons), search suggestions with recent and popular searches, soft fade between tabs
- [x] Tips for chefs at checkout (100% to the chef, counted in their earnings), full receipt on tracking, "Personalize your feed" nudge
- [x] Custom drawn icons for the seven crafts (Vegan, Cottage, Global, Bakery, Breakfast, Late Night, Sweet)
- [x] Pickup-only ordering with a single 5% movement fee, neighborhood-only kitchen locations and a private pickup address
- [x] Orlando demo kitchens with cottage-legal menus and real photography
- [x] Farmer & Artisan waitlist for Manna Mart

## Phase 1: Real accounts and shared data

Without this, a chef and a customer on different phones can't see each other.

- [ ] Create the backend project (recommended: Supabase, see [ARCHITECTURE.md](ARCHITECTURE.md))
- [ ] Phone sign-in with real text-message codes (Supabase Auth + Twilio)
- [ ] Google and Apple sign-in. Apple's App Store rules require Apple sign-in if Google sign-in is offered.
- [x] Database tables for profiles, restaurants, menu items, documents and orders, with row-level security (`supabase/`, tested in CI)
- [x] Server functions: pricing, daily limits, opening hours, order status, reviews, kitchen approval
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

- Weekly subscriptions from a favorite chef
- Chef storefront links to share on social media
- Promotions and "Offers" managed by chefs
- Catering and large orders
- Web dashboard for chefs
