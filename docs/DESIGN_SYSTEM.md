# Design System

These tokens are taken from the original Manna mockups and live in `src/theme/index.ts`.

## Color

| Token | Hex | Use |
|---|---|---|
| `gold` | `#E3AE0A` | Headings, outlines, active icons, glows |
| `goldDark` | `#B98800` | Gold text on white that needs more contrast |
| `goldTint` | `#FFF8E1` | Selected chips, notices |
| `black` | `#000000` | Onboarding, login and role-choice backgrounds |
| `white` | `#FFFFFF` | Forms, browsing, dashboards |
| `text` | `#2B2B2B` | Body text on white |
| `textMuted` | `#7A7A7A` | Hints, secondary info |
| `border` | `#C9C9C9` | Field and card outlines |
| `danger` / `success` | `#D64545` / `#2E9E5B` | Errors, decline; open / delivered |

**Dark screens** (welcome, role choice, login) are pure black with gold. **Light screens**
(everything after sign-in) are white with gold accents and a faint gold fork-and-knife
watermark in the corner.

## Type

- **Headings:** Montserrat Bold (700). The onboarding titles add letter spacing.
- **Buttons:** Montserrat Medium (500)
- **Body:** Raleway Medium (500) and SemiBold (600)

## Components (`src/components/ui.tsx`)

- `GoldButton`: pill-shaped, gold outline, soft gold glow, optional chevron. Works on light and dark backgrounds.
- `TextField` / `PickerField`: label above, 12px rounded outline, icon on the right.
- `BackButton`: circular outlined arrow.
- `Chip`: filter pill; turns gold-tinted when selected.
- `Watermark`: faint crossed fork and knife (or chef hat) behind content.
- `MannaTabBar`: floating white pill with a gold border; the active tab turns gold.
- `OptionSheet`: bottom sheet for dropdowns and time pickers.
- `CoachMarks`: first-visit tips on the Foodie home screen.

Icons come from Material Community Icons (`@expo/vector-icons`). Replace them with
custom illustrations later if you have brand assets.

## Assets still needed

- The real Manna logo and wordmark. The app icon is currently a gold fork and knife on black.
- The login hero photo. The current version uses a warm gradient.
- Category illustrations, if you want them to match the mockups exactly.
