# Design System

Manna should feel like a fine-dining room: calm, dark and warm, with gold used
sparingly. Everything comes from the logo, which has ivory serif lettering inside fine
gold rays on black. The tokens live in `src/theme/index.ts`.

## Principles

1. **Dark canvas, gold accents.** Backgrounds are warm near-black. Gold marks what
   matters: section labels, prices, active states and the one main action on each screen.
2. **Serif for names, sans serif for information.** Titles, restaurant names and dish
   names use the serif. Everything else uses the sans serif.
3. **Fine lines, not heavy boxes.** Use 1px borders, hairline dividers and generous spacing.
4. **One primary action per screen.** It's a gold gradient pill. Secondary actions are
   gold outlines or plain gold text.
5. **No empty photos.** A kitchen without photos gets a serif monogram on black with
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
| `goldBright` → `goldDeep` | `#EBD08E` → `#A8853D` | Gradient on primary buttons |
| `ivory` | `#FFF5E0` | From the logo's lettering: headings |
| `text` / `textMuted` / `textFaint` | `#F2E9D8` / `#A89E8C` / `#6F675A` | Body, secondary, placeholder |
| `success` / `danger` | `#8FC38D` / `#E8826F` | Open / delivered; errors, decline |

Contrast: ivory and gold on the background are both well above WCAG AA. On gold
buttons, use `onGold` (`#140F06`) for text.

## Type

| Role | Font | Example |
|---|---|---|
| Display | Playfair Display SemiBold | "Tonight's table", restaurant and dish names |
| Display italic | Playfair Display Italic | Chef bylines, taglines |
| Eyebrow | Montserrat SemiBold, 10–11px, uppercase, letter-spaced, gold | "CURATED FOR YOU" |
| Body | Montserrat Regular / Medium | Descriptions, fields, buttons |

## Components (`src/components/ui.tsx`)

- `Logo`, `Wordmark`, `Rays`: brand assets cut from the logo (`assets/images/logo.png`, `wordmark.png`, `rays.png`). `Rays` sits faintly behind hero areas.
- `Heading`, `Eyebrow`, `Body`, `SectionHeader`: the type scale. Pair an eyebrow with a heading for every section.
- `GoldButton`: `primary` (gold gradient), `outline` and `ghost` variants.
- `TextField`, `PickerField`: dark fields whose border turns gold on focus.
- `Chip`, `Badge`, `Card`, `Divider`, `GoldRule`, `IconCircleButton`, `BackButton`.
- `RestaurantCard` / `FeaturedCard` / `RestaurantCover` (`restaurant-card.tsx`): photo cards with a monogram fallback.
- `MannaTabBar`: floating dark-glass pill with a gold hairline and a gold active state.
- `OptionSheet`, `CoachMarks`, `OrderCard` (with a gold progress bar), `FormScreen`.
- `ChefCard`, `ChefAvatar`, `VerifiedSeal` (`chef.tsx`): "Meet the chef" with an italic serif story. The gold seal appears only on verified kitchens.
- `DishSheet`, `DietaryIcons`, `StockNote` (`dish.tsx`): dish details, dietary icons and "Only 3 left today".
- `OrderCelebration`: the logo's rays burst open around a gold check when an order is placed.
- `AnimatedLogo`: the welcome logo. The rays bloom outward, then turn once every 90 seconds. It holds still when "reduce motion" is on.
- `CollectionCard` and `src/data/collections.ts`: editorial collections. Each is a rule over categories and dietary tags, so new kitchens join automatically.
- `RatingSummary`, `ReviewCard`, `RateOrderSheet` (`reviews.tsx`): reviews show only a first name and last initial.

## Accessibility

- Text follows the phone's text-size setting. Headings are capped at 1.4×, labels at 1.3× and the tab bar at 1.2×, so layouts never break.
- Every tappable element has a spoken label. Touch targets are at least 44pt.
- Gold `#CDA558` and ivory on the background both pass WCAG AA contrast.

## Motion and touch

- Keep motion slow and soft. The rays rotate over 24 seconds, and fades last 400–900ms. Nothing should bounce hard.
- Vibration (`src/lib/haptics.ts`) is reserved for moments that matter: a light tap when adding to the cart or changing order status, and a success pulse when an order is placed.
- Every celebration can be skipped with a tap.

Icons come from Material Community Icons (`@expo/vector-icons`), always outline style
in gold or ivory.

## Updating the logo

Replace `assets/images/icon.png` with the full logo on black (1024×1024). Then rebuild
`logo.png`, `wordmark.png` and `rays.png` with transparent backgrounds. The splash
screen and Android icons use these same files.
