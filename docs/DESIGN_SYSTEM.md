# Design System

Manna should feel like an experience, not another food app: immersive, sleek and
quiet. Full-screen photography carries the color; the interface stays out of the way.
The tokens live in `src/theme/index.ts`.

## Principles

1. **Open on the food.** Home starts with full-screen featured kitchens that drift
   slowly and swipe like stories. A kitchen opens on a full-height photo with its
   name across it.
2. **One typeface.** Hanken Grotesk, set large and tight for headlines. The serif
   lives only in the MANNA wordmark.
3. **Quiet luxury colors.** Neutral black, warm white type, champagne gold only for
   the brand and a few highlights (signature dish, ratings, active states).
4. **One primary action per screen.** A warm-white pill with black text. Secondary
   actions are outlined pills or gold text.
5. **Smooth surfaces, few lines.** Generous corners (10–24px), soft grey surfaces
   instead of borders, frosted bars over photography.
6. **No empty photos.** A kitchen without photos gets a quiet monogram seal.

## Color

| Token | Hex | Use |
|---|---|---|
| `bg` | `#0A0907` | Screen background (warm black) |
| `surface` | `#14120E` | Cards, fields, sheets |
| `surfaceRaised` | `#1D1A15` | Raised elements |
| `border` / `borderStrong` | `#2E2A22` / `#4A4234` | Card and field outlines, rails |
| `hairline` | gold at 28% | Fine gold outlines on featured cards and sheets |
| `gold` | `#CDA558` | From the logo's rays: accents, prices, active states |
| `goldDeep` | `#9C7A35` | Link underlines |
| `ivory` | `#FFF5E0` | From the logo's lettering: headings |
| `text` / `textMuted` / `textFaint` | `#F2E9D8` / `#A89E8C` / `#6F675A` | Body, secondary, placeholder |
| `success` / `danger` | `#8FC38D` / `#E8826F` | Open / delivered; errors, decline |

Contrast: ivory and gold on the background are both well above WCAG AA. On gold
buttons, use `onGold` (`#140F06`) for text.

## Type

| Role | Font | Example |
|---|---|---|
| Headlines | Hanken Grotesk SemiBold, tight tracking | Hero kitchen names, screen titles |
| Names | Hanken Grotesk SemiBold 17–20px | Kitchen and dish names |
| Body | Hanken Grotesk Regular / Medium | Descriptions, facts, fields |
| Buttons | Hanken Grotesk SemiBold 16px, sentence case | "Place order · $16.79" |
| Wordmark | The MANNA logotype (image) | Masthead |

## Components (`src/components/ui.tsx`)

- `Logo`, `Wordmark`, `Rays`: brand assets cut from the logo (`assets/images/logo.png`, `wordmark.png`, `rays.png`). `Rays` sits faintly behind hero areas.
- `Heading`, `Eyebrow`, `Body`, `SectionHeader`: the type scale. A section is a serif title; a quiet label only when it carries information.
- `GoldButton`: `primary` (warm-white pill), `outline` and `ghost` variants.
- `HeroCarousel` (`hero-carousel.tsx`): full-bleed featured kitchens with a slow drift; still when "reduce motion" is on.
- `TextField`, `PickerField`: dark fields whose border turns gold on focus.
- `Chip`, `Badge`, `Card`, `Divider`, `GoldRule`, `IconCircleButton`, `BackButton`.
- `RestaurantCard` / `FeaturedCard` / `RestaurantCover` (`restaurant-card.tsx`): photo cards with a monogram fallback.
- `MannaTabBar`: an edge-to-edge frosted bar; the current tab is bright, the rest recede.
- `Ticket` (`ticket.tsx`): the order summary in the cart and on order tracking.
- `OptionSheet`, `CoachMarks`, `OrderCard` (with a gold progress bar), `FormScreen`.
- `ChefCard`, `ChefAvatar`, `VerifiedSeal` (`chef.tsx`): the chef's story as an italic pull quote, signed with their portrait. The gold seal appears only on verified kitchens.
- `DishSheet`, `DietaryIcons`, `StockNote` (`dish.tsx`): dish details, dietary icons and "Only 3 left today".
- `OrderCelebration`: the logo's rays burst open around a gold check when an order is placed.
- `AnimatedLogo`: the welcome logo. The rays bloom outward, then turn once every 90 seconds. It holds still when "reduce motion" is on.
- `CollectionCard` and `src/data/collections.ts`: editorial collections. Each is a rule over categories and dietary tags, so new kitchens join automatically.
- `RatingSummary`, `ReviewCard`, `RateOrderSheet` (`reviews.tsx`): reviews show only a first name and last initial.

## Accessibility

- Text follows the phone's text-size setting. Headings are capped at 1.4×, labels at 1.3× and the tab bar at 1.2×, so layouts never break.
- Every tappable element has a spoken label. Touch targets are at least 44pt.
- Never put a button inside another button. Cards with secondary actions (favorite, reorder, add) keep those actions as siblings of the card's main button.
- Gold `#CDA558` and ivory on the background both pass WCAG AA contrast.

## Motion and touch

- Keep motion slow and soft. The rays rotate over 24 seconds, and fades last 400–900ms. Nothing should bounce hard.
- Vibration (`src/lib/haptics.ts`) is reserved for moments that matter: a light tap when adding to the cart or changing order status, and a success pulse when an order is placed.
- Every celebration can be skipped with a tap.

Icons are Lucide thin-line icons at one 1.6 stroke, through `src/components/icon.tsx`.
The seven crafts (Vegan, Cottage, Global, Bakery, Breakfast, Late Night, Sweet) have
Manna's own drawings in `src/components/craft-icon.tsx`. They use a finer 1.35 stroke to
match the logo's rays, and Breakfast is a sunrise drawn from those rays. Collections reuse them.
Filled shapes are reserved for states (a filled heart, a gold seal). Dietary marks are
menu-style letter codes (V, VG, GF, DF, H), not pictograms.

## What keeps it from looking generated

- **Photography leads, full-bleed.** No badges on photos; kitchens are introduced by their food.
- **No luxury clichés.** No gold gradients or glows, no letter-spaced gold capitals, no ornate serifs in the interface, no icons in circles.
- **Motion with purpose.** Slow drift on the hero, paging between kitchens, a celebration when an order is placed. Nothing bounces.
- **Restraint.** Gold appears a few times per screen at most.

## Updating the logo

Replace `assets/images/icon.png` with the full logo on black (1024×1024). Then rebuild
`logo.png`, `wordmark.png` and `rays.png` with transparent backgrounds. The splash
screen and Android icons use these same files.

## Kitchen personalization

Every kitchen page uses the same layout, type, buttons, cart and checkout, so customers never
relearn the app. Cooks make their page their own with a few controlled choices:

- **Accent color**, one of six in `src/data/accents.ts` (Champagne, Terracotta, Sage, Berry,
  Lavender, Sky). Each reads at better than 6.9:1 on the page background. It colors the tab
  underline, the "Chef's signature" and "Most ordered" labels, the pinned update, the
  in-person pins and the Instagram Story card's kicker. It never touches the feed, buttons,
  prices or Manna's own badges (Founding stays champagne).
- **Tagline**, up to 60 characters, under the kitchen's name.
- **Pinned update**, up to 140 characters at the top of the menu, hidden after 7 days.
- **Instagram** username, linked from the About tab.
- **Dish order**, set with the arrows in the menu editor.

## Icons, status glyphs and controls

- **Icons** are Lucide line icons at a 1.6 stroke (`src/components/icon.tsx`).
- **Status glyphs** are Manna's own vectors (`src/components/glyphs.tsx`), never recolored stock
  icons: the solid check disc (`check-circle`), the cross disc (`close-circle`), the empty ring
  (`checkbox-blank-circle-outline`) and the scalloped Verified seal (`check-decagram`). Ask for them
  through `<Icon name=…>` as usual.
- **Switches** use `Toggle` from `ui.tsx`, drawn the same on every platform: a gold track when on.
- **Pickers** always end in a chevron; only time pickers show a clock.
- **Photos** ship at 2100 × 1400 with a light grade (`assets/photos/CREDITS.md`), so full-screen
  heroes stay sharp on a 3× phone.
