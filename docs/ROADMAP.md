# Roadmap

The goal is to launch in **one city** with a small group of hand-picked chefs, learn,
then expand. Each phase ends with something real people can use.

## Launch decisions (November 2026)

| Question | Decision | Why |
|---|---|---|
| Where | Orlando, starting with College Park and nearby neighborhoods | Density beats reach: 20 cooks in one area make a better first week than 60 spread out |
| What can be sold | Any food, hot meals included (changed November 2026). Cooks confirm they follow their state's and county's food laws; Manna doesn't enforce or inspect. A permit or license is optional and earns a "Licensed kitchen" label and a ranking lift; everyone else is labeled "Home kitchen · not inspected" | Open to every cook, honest with every customer. **Have the lawyer review this setup and the label wording before public launch** |
| How food changes hands | Pickup only, at a time the customer picks. The street address is shared once the chef accepts | No courier costs, and home cooks keep their address private |
| Fees | Customers pay a movement fee of 10% of the food, at least $1.50. Kitchens pay 5% of their food sales (founding kitchens pay nothing for their first 3 months). Tips are never charged, and card processing comes out of Manna's share. Set in November 2026, before launch | At 8% from customers only, Manna kept about $1.06 on a $30 order and needed about 60 busy kitchens to pay a founder. At 10% + 5% it keeps about $3.14, so about 21 busy kitchens cover the same, and the total is still well below delivery apps |
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
- [x] Pickup-only ordering with a single movement fee, neighborhood-only kitchen locations and a private pickup address
- [x] Orlando demo kitchens with cottage-legal menus and real photography
- [x] Farmer & Artisan waitlist for Manna Mart
- [x] Immersive redesign: full-screen featured kitchens, kitchen pages that open on their food, one sleek typeface
- [x] Growth kit for chefs: an Instagram Story image with a QR code to their kitchen
- [x] Founding Creators badge and home row; "Find me in person" spots; "For you" picks with reasons
- [x] Phone photos of any size are resized automatically on upload
- [x] Delete account, in-app privacy policy and terms (drafts), report a review
- [x] Kitchen page tabs (Menu, About, Reviews), "Most ordered" labels, swipe to remove in the cart
- [x] Chef's "Today's menu": turn dishes on and off and see what's left today
- [x] Different hours on some days (late Fridays, short Saturdays), including overnight shifts
- [x] Open marketplace: any food, a food-law confirmation before opening, optional permit for a Licensed label and ranking lift, honest Home kitchen labels, terms that make the cook the seller
- [x] Kitchen personalization inside one shared layout: accent color (six curated), tagline, a pinned weekly update, Instagram link and dish order
- [x] "Get your first order" checklist for new kitchens; customers can cancel before the kitchen accepts
- [x] Bake days: weekly pickup windows with an 8 PM order cutoff, chosen at checkout; cooks skip a week from the dashboard. The default for new kitchens
- [x] Pickup handoff: private pickup instructions, "I'm here", and a written no-show rule (paid to the cook after a 30-minute grace period)
- [x] Design quality pass: sharper photos, Manna's own status glyphs and switches, one title-bar style
- [x] Finishing details: photos in three sizes that appear at once, springy touch feedback, drawn empty states, steady numbers, scroll to top, pull to refresh, a sharper icon and a seamless launch screen
- [x] Order extras: directions, add to calendar, save the receipt as an image, and "Need help with this order?" for Manna's support team
- [x] Immersive details: oven updates with photos on orders, an "In the kitchen" photo on the pinned update, a photo of the pickup spot, Taste (swipe through today's food one dish at a time), a neighborhood passport of kitchens tried, live bake-day countdowns, a cook intro video, and a map of kitchens near you
- [x] Order chat: customer and kitchen message each other from acceptance until a day after pickup, with quick replies, unread counts, report, block and a reminder to keep payments in Manna (`order_messages`, `user_blocks`, `message_reports` in the database)

## Phase 1: Real accounts and shared data

Without this, a chef and a customer on different phones can't see each other.

- [ ] Create the backend project (recommended: Supabase, see [ARCHITECTURE.md](ARCHITECTURE.md))
- [ ] Phone sign-in with real text-message codes (Supabase Auth + Twilio)
- [ ] Google and Apple sign-in. Apple's App Store rules require Apple sign-in if Google sign-in is offered.
- [x] Database tables for profiles, restaurants, menu items, documents and orders, with row-level security (`supabase/`, tested in CI)
- [x] Server functions: pricing, daily limits, opening hours, order status, reviews, kitchen approval
- [x] App-side groundwork: Supabase client (off until configured) and tested row ↔ model mappers
- [ ] Photo and document uploads to private storage (photos saved in thumb, card and full sizes, like the demo photos)
- [ ] Live order updates, so the chef's dashboard updates the moment an order is placed
- [ ] Edge Function that removes the sign-in when someone deletes their account
- [ ] Support inbox for "Need help with this order?" (the `order_issues` table is ready): email or text the team on each new request, and a simple admin view to reply and resolve
- [ ] Link previews: a kitchen link shared in iMessage or Instagram shows its photo and name (needs the website)

## Phase 2: Getting paid

- [ ] Stripe Connect (Express accounts): chefs onboard to get paid, and Stripe handles identity checks and 1099-K tax forms
- [ ] Card, Apple Pay and Google Pay checkout
- [x] Fee model: movement fee paid by the customer (10%, at least $1.50) plus a 5% kitchen fee (0% for a founding kitchen's first 3 months); tips never charged
- [ ] Refunds and order cancellation rules

## Phase 3: Trust and safety (required before public launch)

- [ ] Admin review queue: approve chefs only after checking their food handler card and ID
- [x] Allergen fields on menu items, shown clearly to customers
- [x] Report a review (App Store guideline 1.2), with `remove_review()` for the team
- [x] Report a problem with an order ("Need help with this order?")
- [x] Report and block in order chat
- [ ] Admin view for reported messages and help requests
- [ ] Attorney review of the Terms of Service and Privacy Policy (drafts in the app), plus a chef agreement (see [COMPANY_SETUP.md](COMPANY_SETUP.md))

## Phase 4: Notifications

Pickup only for launch (see Launch decisions). Delivery can come back as an option once there's demand.

- [ ] Push notifications for new orders (chef), status changes (customer) and new order messages (both)
- [ ] Lock-screen order status on iPhone (Live Activity). What it shows is built and tested; switching it on needs the first iPhone development build. Steps in [LIVE_ACTIVITY.md](LIVE_ACTIVITY.md)
- [ ] Text-message fallback for chefs who turn push off

## Phase 5: Launch

- [ ] Apple Developer and Google Play accounts in the company's name
- [x] Store listing and screenshots ([APP_STORE.md](APP_STORE.md), `store/screenshots/`)
- [ ] Retake the checkout screenshot once payments are live
- [ ] Beta with 10–20 chefs and friends and family through TestFlight and Play internal testing
- [ ] App Store and Google Play submission (`eas build` + `eas submit`)
- [ ] Crash reporting and analytics (Sentry plus a privacy-friendly analytics tool)

## Phase 6: Paid plans and promotion for cooks

Every kitchen keeps its storefront, orders, payouts, reviews, labels and the Instagram Story card
without a plan. Paid features help cooks sell more or save time.

**Manna Pro** ($19.99 a month or $199 a year; founding kitchens get their first 3 months free).
Available at launch. See [PRO.md](PRO.md).

- [x] Pro page with the two plans, start, cancel and resume (billing simulated until Stripe is connected)
- [x] Featured on Manna: Pro kitchens rotate at the top of home and come first in Taste, marked "Featured"
- [x] Drops with their own pickup window and deadline, and dishes sold only in drops
- [x] Alerts to followers, 2 a week, in Activity
- [x] Custom order requests, quotes and accepting a quote as an order
- [x] Discount codes (percent or dollars, first orders only, end date, use limit)
- [x] Insights: month vs last month, repeat rate, best days, busiest pickup times, best sellers, regulars
- [x] Printable labels for every kitchen (free, since they help cooks follow the law)
- [x] Database tables, rules and tests for all of the above
- [ ] Stripe Billing on the web and the webhook that sets the plan (see [PRO.md](PRO.md))
- [ ] Push notifications for alerts and custom order replies
- [ ] Gift cards (check Florida gift card rules first)
- [ ] Custom storefront link (`manna.app/susies`) once the domain is set up

**Promoted spots**

- [ ] Weekly sponsored slots in a neighborhood: the home carousel, or the top of a craft such as Bakery
  (about $10–25 a week to start, not pay-per-click)
- [ ] At most one or two per screen, always labeled "Sponsored", and only for verified kitchens with
  good ratings, so the feed stays curated

**How cooks pay**

- [ ] Stripe Billing on the web (see [PRO.md](PRO.md)). Digital subscriptions bought inside the iPhone
  app normally go through Apple's in-app purchase at 15–30%; check Apple's current rules on linking
  to web checkout before building
- [x] Database: the plan on each kitchen
- [ ] A table of sponsored slots with dates

## Opening a new state or city

Home-food law is set by each state, so Manna opens state by state and city by city. The app is
already state-aware: every kitchen has a state, and kitchens can only open in states Manna has launched.

1. **New state:** check its cottage food law against official sources (what may be sold, label
   statement, yearly sales cap, permits, online sales), then add it to `STATE_RULES` in
   `src/data/regions.ts` with the source link. Have a food lawyer confirm. Register for its sales tax
   as a marketplace provider if required.
2. **New city:** add a market to `MARKETS` with its neighborhoods and time zone.
3. **Launch:** recruit 10 founding cooks there first, then open to customers (the Orlando playbook).

Not yet handled: a state that allows home-cooked meals (menu sections would differ by state) and
automatic sales tax (Stripe Tax).

## Later ideas

- Weekly subscriptions from a favorite chef
- Web dashboard for chefs
