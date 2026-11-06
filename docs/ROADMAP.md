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
- [x] Immersive redesign: full-screen featured kitchens, kitchen pages that open on their food, one sleek typeface
- [x] Growth kit for chefs: an Instagram Story image with a QR code to their kitchen
- [x] Founding Creators badge and home row; "Find me in person" spots; "For you" picks with reasons
- [x] Phone photos of any size are resized automatically on upload
- [x] Delete account, in-app privacy policy and terms (drafts), report a review
- [x] Kitchen page tabs (Menu, About, Reviews), "Most ordered" labels, swipe to remove in the cart
- [x] Chef's "Today's menu": turn dishes on and off and see what's left today
- [x] Kitchen personalization inside one shared layout: accent color (six curated), tagline, a pinned weekly update, Instagram link and dish order
- [x] "Get your first order" checklist for new kitchens; customers can cancel before the kitchen accepts

## Phase 1: Real accounts and shared data

Without this, a chef and a customer on different phones can't see each other.

- [ ] Create the backend project (recommended: Supabase, see [ARCHITECTURE.md](ARCHITECTURE.md))
- [ ] Phone sign-in with real text-message codes (Supabase Auth + Twilio)
- [ ] Google and Apple sign-in. Apple's App Store rules require Apple sign-in if Google sign-in is offered.
- [x] Database tables for profiles, restaurants, menu items, documents and orders, with row-level security (`supabase/`, tested in CI)
- [x] Server functions: pricing, daily limits, opening hours, order status, reviews, kitchen approval
- [x] App-side groundwork: Supabase client (off until configured) and tested row ↔ model mappers
- [ ] Photo and document uploads to private storage
- [ ] Live order updates, so the chef's dashboard updates the moment an order is placed
- [ ] Edge Function that removes the sign-in when someone deletes their account

## Phase 2: Getting paid

- [ ] Stripe Connect (Express accounts): chefs onboard to get paid, and Stripe handles identity checks and 1099-K tax forms
- [ ] Card, Apple Pay and Google Pay checkout
- [x] Fee model: one 5% movement fee paid by the customer; kitchens keep 100% of their prices
- [ ] Refunds and order cancellation rules

## Phase 3: Trust and safety (required before public launch)

- [ ] Admin review queue: approve chefs only after checking their food handler card and ID
- [x] Allergen fields on menu items, shown clearly to customers
- [x] Report a review (App Store guideline 1.2), with `remove_review()` for the team
- [ ] Report a problem with an order
- [ ] Attorney review of the Terms of Service and Privacy Policy (drafts in the app), plus a chef agreement (see [COMPANY_SETUP.md](COMPANY_SETUP.md))

## Phase 4: Notifications

Pickup only for launch (see Launch decisions). Delivery can come back as an option once there's demand.

- [ ] Push notifications for new orders (chef) and status changes (customer)
- [ ] Text-message fallback for chefs who turn push off

## Phase 5: Launch

- [ ] Apple Developer and Google Play accounts in the company's name
- [x] Store listing and screenshots ([APP_STORE.md](APP_STORE.md), `store/screenshots/`)
- [ ] Retake the checkout screenshot once payments are live
- [ ] Beta with 10–20 chefs and friends and family through TestFlight and Play internal testing
- [ ] App Store and Google Play submission (`eas build` + `eas submit`)
- [ ] Crash reporting and analytics (Sentry plus a privacy-friendly analytics tool)

## Phase 6: Paid plans and promotion for cooks

Start once cooks are making money on Manna, roughly 30–50 active kitchens with most getting repeat
orders. Selling and getting paid stay free forever: storefront, orders, payouts, reviews and the
Instagram Story card. Paid features help cooks sell more or save time.

**Manna Pro** (about $15–25 a month; free for a year for founding kitchens)

- [ ] Drops and pre-order windows ("Thanksgiving pies, orders close Tuesday")
- [ ] Followers: customers follow a kitchen and get a notification when it posts a drop
- [ ] Discount codes and gift cards
- [ ] Deeper insights: repeat customers, best sellers by day, busiest pickup times
- [ ] Custom storefront link (`manna.app/susies`), flyer and branded label templates. A basic
  Florida-compliant product label stays free.

**Promoted spots**

- [ ] Weekly sponsored slots in a neighborhood: the home carousel, or the top of a craft such as Bakery
  (about $10–25 a week to start, not pay-per-click)
- [ ] At most one or two per screen, always labeled "Sponsored", and only for verified kitchens with
  good ratings, so the feed stays curated

**How cooks pay**

- [ ] Stripe Billing on the web. Digital subscriptions bought inside the iPhone app normally go
  through Apple's in-app purchase at 15–30%; check Apple's current rules on linking to web checkout
  before building
- [ ] Database: a plan and renewal date on each kitchen, and a table of sponsored slots with dates

## Later ideas

- Weekly subscriptions from a favorite chef
- Catering and large orders
- Web dashboard for chefs
