# Company Setup Checklist

The steps to turn Manna into a real business that can publish apps, take payments and
pay chefs. This is general guidance, **not legal or tax advice**. Rules vary by state
and county, so talk to a local small-business attorney and an accountant before launch.
Many cities have free help through SCORE or a Small Business Development Center (SBDC).

## 1. Form the business

- [ ] **Check the name.** Search the [USPTO trademark database](https://tmsearch.uspto.gov),
      your state's business registry, the App Store and Google Play. Other companies
      already use "Manna" in food and delivery, so you may need a distinct name such as
      "Manna Kitchens" or a different brand. Do this before spending money on branding.
- [ ] **Form an LLC** (or a corporation if you plan to raise venture money) in your state.
- [ ] **Get an EIN** from the IRS. It's free and you apply online.
- [ ] **Open a business bank account.** Keep company money separate from personal money.
- [ ] **Register a domain** (for example `mannakitchens.com`) and set up a business email.
- [ ] **Get a D-U-N-S number.** It's free from Dun & Bradstreet, and Apple requires it to
      publish apps under a company name. It can take a few weeks, so start early.

## 2. Developer and service accounts

Create each account under the company, using a shared business email rather than a
personal one.

| Account | Cost | Why |
|---|---|---|
| Apple Developer Program | $99 / year | Publish on the App Store and TestFlight |
| Google Play Console | $25 one-time | Publish on Google Play |
| Expo / EAS | Free tier to start | Cloud builds, store submission, updates |
| GitHub | Free | Code. Consider making this repository **private**. |
| Supabase | Free tier to start | Accounts, database, file storage |
| Stripe | Per-transaction fees | Customer payments and chef payouts (Stripe Connect) |
| Twilio (through Supabase) | Per text message | Sign-in codes |

## 3. Food law (the biggest risk)

Selling food made in a home kitchen is regulated **state by state, and often county by
county**:

- **Cottage food laws** exist in almost every state. They usually allow only
  shelf-stable foods (baked goods, jams, candy) and often cap yearly sales.
- **Home kitchen operation laws** (often called MEHKO, for Microenterprise Home Kitchen
  Operation) allow full home-cooked meals with a permit and inspection. They exist only
  in some states, such as California and Utah, and some counties must opt in.
- Selling **perishable meals** (lasagna, deep-dish pizza) from a home kitchen without
  one of these permits is illegal in many places.

**Florida (the launch market).** Manna launches in Orlando under Florida's cottage food
law (section 500.80, Florida Statutes). As we understand it, and to be confirmed with
FDACS or a food attorney before launch:

- Cottage food operators don't need a state permit or inspection, but may sell only
  foods that don't need refrigeration: breads, cakes and pies without cream fillings,
  cookies, candy, granola, jams and jellies, dried herbs and spice blends.
- Sales go directly to the customer: in person, by pickup or by delivery. Wholesale to
  stores or restaurants isn't allowed.
- There's a yearly gross sales cap per operator.
- Every product needs a label with the operator's name and address, the ingredients and
  allergens, and the statement that it was made in a cottage food operation not subject
  to Florida's food safety regulations.
- Cities, counties and HOAs may add their own rules (business tax receipts, zoning).

To do before launch:

- [x] Pick the launch city: Orlando, starting with College Park.
- [x] Limit categories to cottage foods. The demo kitchens follow this.
- [x] Require a food handler certificate and ID in the app; a local permit is optional.
- [ ] Confirm the rules above, the current sales cap and the exact label wording with FDACS or an attorney.
- [ ] Add the cottage food label statement to dish pages and printed order labels.
- [ ] Decide how licensed kitchens (hot meals) join later.
- [ ] Have someone review documents before a kitchen goes live (Roadmap Phase 3).
- [ ] Ask an attorney whether Manna is a "marketplace" or a "seller" under local law. The answer changes your liability and tax duties.

## 4. Insurance

- [ ] General liability and product liability insurance for the company.
- [ ] Decide whether chefs must carry their own cottage food or product liability insurance. Some insurers sell low-cost policies for home bakers and cooks.

## 5. Legal documents in the app

- [ ] **Terms of Service** for customers.
- [ ] **Chef / Merchant Agreement:** fees, payouts, food safety duties, and that chefs are independent businesses, not employees.
- [ ] **Privacy Policy.** Both app stores require one, and so do the privacy laws in several states.
- [ ] Allergen disclaimer, with allergen information shown on every dish.

## 6. Money and taxes

- [ ] Choose the fee model: customer service fee, chef commission, or both.
- [ ] **Sales tax:** in many states, platforms that take payment count as "marketplace
      facilitators" and must collect and pay sales tax on prepared food. Confirm this with an accountant.
- [ ] **Chef payouts and tax forms:** Stripe Connect can send chefs their 1099-K forms.
- [ ] Set up bookkeeping (QuickBooks, Wave or similar) from day one.

## 7. Team and roles

Early on, one person can cover several of these:

| Role | Owns |
|---|---|
| Founder / CEO | Vision, chef recruiting, partnerships, fundraising |
| Product and design | Mockups, user research, the roadmap |
| Engineering | The app, backend, payments, releases |
| Operations | Chef onboarding and document review, customer support, food safety |
| Marketing | Brand, social media, launch events with local chefs |

## Rough startup budget (first year, lean)

| Item | Estimate |
|---|---|
| LLC formation and state fees | $50–$500, depending on state |
| Apple + Google developer accounts | ~$125 |
| Domain and email | ~$100 |
| Legal documents (attorney review) | $1,000–$5,000 |
| Insurance | $500–$2,000 |
| Hosting, databases, text messages during beta | $0–$50 / month |
| Payment processing | ~3% of each order (Stripe) |

These are ballpark figures. Get real quotes for your state.
