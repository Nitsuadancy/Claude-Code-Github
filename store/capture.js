// Run with the web build served: npm run build:web && npx serve dist -l 8765
// Usage: node store/capture.js store/raw
// Captures raw app screens at 1290 x 2796 (430 x 932 at 3x) for the App Store.
const { chromium } = require('playwright');
const OUT = process.argv[2];
require('fs').mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:8765';
const NOW = new Date('2026-11-07T10:40:00-05:00'); // A Saturday morning, when most kitchens are open.

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, timezoneId: 'America/New_York' });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(NOW);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const shot = async (name, wait = 1200) => { await page.waitForTimeout(wait); await page.screenshot({ path: `${OUT}/${name}.png` }); console.log('shot', name); };
  const visible = (loc) => loc.filter({ visible: true }).first();

  // A signed-in customer in College Park.
  await page.goto(BASE + '/');
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    localStorage.setItem('manna/state/v1', JSON.stringify({
      hasSeenWelcome: true, hasSeenCoachMarks: true, pendingRole: 'foodie',
      user: { id: 'cust', name: 'Maya Brooks', email: 'maya@example.com', phone: '+14075550111', role: 'foodie', neighborhood: 'College Park', dietary: [], avoidAllergens: [] },
      restaurants: [], cart: { restaurantId: null, lines: [] }, orders: [], favoriteRestaurantIds: ['sample_susies_sweets'], reviews: [],
      activitySeenAt: null, recentSearches: [], dietNudgeDismissed: true, growerApplication: null, reportedReviewIds: [],
    }));
  });
  await page.goto(BASE + '/foodie');
  await shot('01-home', 2500);
  await page.mouse.move(215, 600);
  await page.mouse.wheel(0, 1150);
  await shot('02-home-feed', 1200);

  await page.goto(BASE + '/restaurant/sample_sunrise_plates');
  await shot('03-kitchen', 2200);
  await page.mouse.move(215, 600);
  await page.mouse.wheel(0, 560);
  await shot('04-menu', 1200);
  const adds = page.getByRole('button', { name: /^Add / }).filter({ visible: true });
  await adds.nth(0).click(); await page.waitForTimeout(400);
  await adds.nth(0).click(); await page.waitForTimeout(400);
  await adds.nth(1).click(); await page.waitForTimeout(400);
  await page.mouse.wheel(0, -2000);
  await page.waitForTimeout(400);
  await visible(page.getByRole('button', { name: /^Overnight Cinnamon Rolls.*Show details/ })).click();
  await shot('05-dish', 1200);
  await page.keyboard.press('Escape');

  await page.goto(BASE + '/foodie/cart');
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /15%/ }).filter({ visible: true }).first().click().catch(() => {});
  await shot('06-cart', 800);
  await page.mouse.move(215, 600);
  await page.mouse.wheel(0, 900);
  await shot('07-cart-total', 900);
  await visible(page.getByRole('button', { name: /^(Place order|Schedule pickup|Order for)/ })).click();
  await page.waitForTimeout(1500);
  // Move the order along so tracking shows progress.
  const url = page.url();
  await page.evaluate((now) => {
    const st = JSON.parse(localStorage.getItem('manna/state/v1'));
    const o = st.orders[0];
    const t = (m) => new Date(now - m * 60000).toISOString();
    o.createdAt = t(26);
    o.status = 'preparing';
    o.statusHistory = [{ status: 'placed', at: t(26) }, { status: 'accepted', at: t(24) }, { status: 'preparing', at: t(18) }];
    o.chefNote = 'Rolls are proofing now. Frosting goes on warm!';
    o.estimatedReadyAt = new Date(now + 12 * 60000).toISOString();
    // Show this morning's bake-day window rather than next week's.
    if (o.pickupBy) {
      o.scheduledFor = new Date(now - 160 * 60000).toISOString();
      o.pickupBy = new Date(now + 20 * 60000).toISOString();
    }
    localStorage.setItem('manna/state/v1', JSON.stringify(st));
  }, NOW.getTime());
  await page.goto(url.replace(/[?&]celebrate=1/, ''));
  await shot('08-order', 2000);

  console.log('ERRORS:', errors.join('\n'));
  await browser.close();
})();
