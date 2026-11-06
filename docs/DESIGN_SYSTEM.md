# Design System

Manna should feel like a fine-dining room: calm, dark and warm, with gold used
sparingly. Everything comes from the logo, which has ivory serif lettering inside fine
gold rays on black. The tokens live in `src/theme/index.ts`.

The design borrows from the paper objects of a good restaurant rather than from
delivery apps: the **front page** of a local paper (home), the **printed menu**
(kitchen pages) and the **kitchen ticket** (cart and orders).

## Principles

1. **Dark canvas, gold accents.** Backgrounds are warm near-black. Gold marks what
   matters: chef bylines, active states and the one main action on each screen.
2. **Serif for names, italic for voice, sans for information, mono for tickets.**
3. **Rules, not boxes.** Sections are separated by hairline rules and space. Almost
   nothing sits in a bordered card.
4. **Near-square corners.** 2–6px, like paper. Pills only for avatars and counts.
5. **One primary action per screen.** A flat gold rectangle with small capitals.
   Secondary actions are outlined rectangles or underlined gold links.
6. **No empty photos.** A kitchen without photos gets a serif monogram on black with
   the logo's rays, so the feed still looks premium.

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
| Display | Gloock | Headlines, kitchen and dish names, totals |
| Italic | Newsreader Italic | Chef bylines, dish descriptions, pull quotes, fine print |
| Interface | Instrument Sans Regular / Medium / SemiBold | Facts, fields, buttons (small capitals, letter-spaced) |
| Ticket | DM Mono | Order numbers, receipt amounts, dietary codes |
| Label | Instrument Sans Medium 13px, muted, sentence case | Only where it carries information ("7 kitchens") |

Menu prices drop the dollar sign ("28", "15.99") and sit at the end of a dot leader.

## Components (`src/components/ui.tsx`)

- `Logo`, `Wordmark`, `Rays`: brand assets cut from the logo (`assets/images/logo.png`, `wordmark.png`, `rays.png`). `Rays` sits faintly behind hero areas.
- `Heading`, `Eyebrow`, `Body`, `SectionHeader`: the type scale. A section is a serif title; a quiet label only when it carries information.
- `GoldButton`: `primary` (flat gold), `outline` and `ghost` variants, all with small-capital labels.
- `TextField`, `PickerField`: dark fields whose border turns gold on focus.
- `Chip`, `Badge`, `Card`, `Divider`, `GoldRule`, `IconCircleButton`, `BackButton`.
- `RestaurantCard` / `FeaturedCard` / `RestaurantCover` (`restaurant-card.tsx`): photo cards with a monogram fallback.
- `MannaTabBar`: an edge-to-edge bar under a hairline; the current tab gets a short gold rule.
- `Ticket` (`ticket.tsx`): the receipt in the cart and on order tracking, with a dashed outline, dot leaders and mono amounts.
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

- **Photography leads.** Feed entries are photos with type beneath: name, italic byline, one line of facts. No badges on photos.
- **The logo's rays are a brand moment, not wallpaper.** They appear on welcome, sign-in, the order celebration and error pages only.
- **No decorative labels.** No letter-spaced gold capitals above headings, no icons in circles, no gradient buttons, no floating glass bars.
- **Real typography.** Gloock's contrast gives headlines presence; Newsreader italic carries the chefs' voices; typographic quotation marks instead of icon quotes.
- **Details from the subject.** Dot leaders and plain prices on menus, the cottage food statement as fine print, order numbers and mono amounts on tickets, a dateline on the front page.
- **Restrained placeholders.** A kitchen without photos shows a quiet gold monogram seal.

## Updating the logo

Replace `assets/images/icon.png` with the full logo on black (1024×1024). Then rebuild
`logo.png`, `wordmark.png` and `rays.png` with transparent backgrounds. The splash
screen and Android icons use these same files.
