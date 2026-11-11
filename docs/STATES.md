# States: home-food rules and launch status

Manna can only open kitchens in states whose home-food ("cottage food") rules are in `STATE_RULES` (`src/data/regions.ts`) with `launched: true`. The database has a matching list in `launched_states`.

Researched states are "opening soon". Cooks there can:
- set up and save their kitchen now
- open it the day the state launches

Customers anywhere can browse by ZIP. Where no kitchens are near yet, they can join the list for their ZIP and invite a cook. The team sees demand with `area_demand()` and waiting kitchens with `kitchens_waiting_by_state()`.

## Status (researched November 11, 2026)

These rules are a starting point for a lawyer, not legal advice. "Official" means the rule was read on the state's own page. "Secondary" means the state's page couldn't be reached, so confirm it before launch.

| State | Status | Checked | Label statement | Yearly sales cap | License or registration |
|---|---|---|---|---|---|
| Florida | **Open** | Official | "Made in a cottage food operation that is not subject to Florida's food safety regulations." | $250,000 | None from the state |
| Texas | Opening soon | Official | "THIS PRODUCT WAS PRODUCED IN A PRIVATE RESIDENCE THAT IS NOT SUBJECT TO GOVERNMENTAL LICENSING OR INSPECTION." | $150,000 | Free DSHS registry: optional, but required for foods that need refrigeration |
| California | Opening soon | Secondary | "Made in a Home Kitchen", plus registration or permit number and county | Class A ~$88,878 (2026); Class B higher | County: Class A registration or Class B permit, renewed yearly |
| New York | Opening soon | Official | Recommended: "Made in a Home Kitchen" | None stated | Free home processor registration with Agriculture and Markets |
| Pennsylvania | Opening soon | Official | None required (standard label contents) | None stated | Limited Food Establishment: $35, inspection, $35 a year |
| Ohio | Opening soon | Official (statute) | "This product is home produced." (10-point) | None stated | None for cottage foods |
| Illinois | Opening soon | Official | "This product was produced in a home kitchen not inspected by a health department that may also process common food allergens. If you have safety concerns, contact your local health department." | None stated | Local health department registration, fee up to $50 |
| Georgia | Opening soon | Official FAQ; label secondary | Pending new rules after HB 398 | None stated | None since July 1, 2025 |
| North Carolina | Opening soon | Official | None required for food made to order and handed over | None stated | Free NCDA&CS home kitchen inspection (8–12 weeks) |
| Michigan | Opening soon | Secondary | "Made in a home kitchen that has not been inspected by the Michigan department of agriculture and rural development." (11-point) | $50,000 reported after 2025 | None |

Sources:
- Florida: [FDACS](https://www.fdacs.gov/Business-Services/Food/Cottage-Foods)
- Texas: [DSHS](https://www.dshs.texas.gov/foodestablishments/cfpo)
- California: [CDPH](https://www.cdph.ca.gov/Programs/CEH/DFDCS/Pages/FDBPrograms/FoodSafetyProgram/CFORequirements.aspx). The site couldn't be reached from the build environment (incomplete certificate chain).
- New York: [Agriculture and Markets](https://agriculture.ny.gov/food-safety/home-processing)
- Pennsylvania: [PDA](https://www.pa.gov/agencies/pda/food/food-safety/limited-food-establishment-.html)
- Ohio: [ORC 3715.023](https://codes.ohio.gov/ohio-revised-code/section-3715.023)
- Illinois: [Illinois Extension](https://extension.illinois.edu/cottage-food/food-labeling-and-placards)
- Georgia: [GDA HB 398 FAQ](https://agr.georgia.gov/sites/default/files/documents/assets/Cottage-Food-Update-HB398-Frequently-Asked-Questions.pdf)
- North Carolina: [NCDA&CS](https://www.ncagr.gov/divisions/food-drug-protection/food-program/fdpd-food-program-home-processor)
- Michigan: [MDARD](https://www.michigan.gov/mdard/food-dairy/michigan-cottage-food-information). The site refused automated reads.

## Questions for the lawyer, by state

- **All states:** Manna takes orders and payment in the app and the customer picks up from the cook. Confirm that counts as a direct sale to the consumer under each law. Ask whether Manna must collect and remit sales tax as a marketplace facilitator.
- **Texas:**
  - Online sales are allowed when "the operator, an employee, or a household member personally delivers the food". Does a customer picking up at the cook's home qualify?
  - The label details must be posted online before payment. The app now shows ingredients on dish pages and the state notice on kitchen pages. Is that enough?
  - Should Manna let Texas cooks sell foods that need refrigeration (registration, date made and safe-handling statement required)? The app doesn't handle those requirements yet.
- **California:**
  - Confirm the label wording and type size.
  - Confirm the 2026 Class A and Class B caps.
  - Confirm that Class A covers app orders with pickup.
  - Do we need the cook's county and registration number on the kitchen page?
- **New York:**
  - Home processors are "exempt from Article 20" and may sell "via the internet" within New York. Confirm app orders with pickup are covered.
  - Foods needing refrigeration are excluded. Should the menu block them for New York cooks?
- **Pennsylvania:** Confirm Limited Food Establishment registration covers app sales with pickup. Is Philadelphia excluded?
- **Ohio:** Confirm that no registration is needed for app sales with pickup inside Ohio.
- **Illinois:**
  - Registration is with the local health department. Should Manna collect the registration number and show it on the kitchen page?
  - Chicago has its own limits.
  - The online notice is now shown on kitchen pages.
- **Georgia:** The Department of Agriculture is rewriting its rules after HB 398. Get the final label wording.
- **North Carolina:** Inspection takes 8–12 weeks. Should Manna ask for the Notice of Inspection before a kitchen opens?
- **Michigan:** Confirm the 2025 changes (sales cap, online sales) and the label wording.

## How to launch a state

1. A lawyer confirms the row above and answers that state's questions. Update `STATE_RULES` with anything that changed.
2. Set `launched: true` for the state in `src/data/regions.ts`.
3. Add it to the database: `insert into public.launched_states (code) values ('TX');`
4. Tell the cooks waiting there (`kitchens_waiting_by_state()`) and the customers on its ZIP lists (`area_demand()`).
5. If the state needs extra documents (a registration number, an inspection notice), add them to the documents step before approving kitchens.
