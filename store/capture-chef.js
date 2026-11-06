// Run with the web build served: npm run build:web && npx serve dist -l 8765
// Usage: node store/capture-chef.js store/raw
const { chromium } = require('playwright');
const OUT = process.argv[2];
const BASE = 'http://localhost:8765';
const NOW = new Date('2026-11-07T10:40:00-05:00');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, timezoneId: 'America/New_York' });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(NOW);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const shot = async (name, wait = 1200) => { await page.waitForTimeout(wait); await page.screenshot({ path: `${OUT}/${name}.png` }); console.log('shot', name); };
  await page.goto(BASE + '/');
  await page.waitForTimeout(1200);
  await page.evaluate((now) => {
    const t = (m) => new Date(now - m * 60000).toISOString();
    const menu = [
      { id: 'pc', name: 'Peach Cobbler', description: 'Georgia peaches under a buttery biscuit crust.', priceCents: 2200, available: true, dietary: ['vegetarian'], allergens: ['gluten', 'dairy'], dailyLimit: 6, photoUri: 'demo:peach-cobbler', section: '' },
      { id: 'pd', name: 'Earl Grey Pound Cake', description: 'One loaf, glazed with lemon.', priceCents: 1800, available: true, dietary: ['vegetarian'], allergens: ['gluten', 'dairy', 'eggs'], dailyLimit: 8, photoUri: 'demo:pound-cake', section: '', popular: true },
    ];
    const order = (id, name, lines, status, minsAgo, history) => {
      const sub = lines.reduce((s, l) => s + l.priceCents * l.quantity, 0);
      const fee = Math.round(sub * 0.05);
      return { id, customerId: 'c-' + id, customerName: name, restaurantId: 'r1', restaurantName: 'Susie’s Sweets', lines, subtotalCents: sub, movementFeeCents: fee, tipCents: Math.round(sub * 0.15), totalCents: sub + fee + Math.round(sub * 0.15), pickupAddress: '5 Willow Way, Orlando', status, statusHistory: history.map(([s, m]) => ({ status: s, at: t(m) })), chefNote: '', customerNote: '', createdAt: t(minsAgo), estimatedReadyAt: t(minsAgo - 35), scheduledFor: null };
    };
    const pc = (q) => ({ itemId: 'pc', name: 'Peach Cobbler', priceCents: 2200, quantity: q });
    const pd = (q) => ({ itemId: 'pd', name: 'Earl Grey Pound Cake', priceCents: 1800, quantity: q });
    const done = (m) => [['placed', m], ['accepted', m - 2], ['preparing', m - 5], ['ready', m - 30], ['completed', m - 45]];
    const orders = [
      order('o1', 'Jordan P.', [pc(1), pd(1)], 'placed', 3, [['placed', 3]]),
      order('o2', 'Alana R.', [pd(2)], 'preparing', 22, [['placed', 22], ['accepted', 20], ['preparing', 15]]),
      order('o0', 'Tasha L.', [pc(2), pd(1)], 'completed', 95, done(95)),
      order('o3', 'Chris M.', [pc(2)], 'completed', 60 * 24 + 100, done(60 * 24 + 100)),
      order('o4', 'Dana K.', [pd(1), pc(1)], 'completed', 60 * 48 + 300, done(60 * 48 + 300)),
      order('o5', 'Luis A.', [pc(1)], 'completed', 60 * 72 + 200, done(60 * 72 + 200)),
      order('o6', 'Priya S.', [pd(3)], 'completed', 60 * 96 + 120, done(60 * 96 + 120)),
      order('o7', 'Ken W.', [pc(2), pd(1)], 'completed', 60 * 120 + 90, done(60 * 120 + 90)),
    ];
    localStorage.setItem('manna/state/v1', JSON.stringify({
      hasSeenWelcome: true, hasSeenCoachMarks: true, pendingRole: 'chef',
      user: { id: 'u1', name: 'Susie Mae', email: 's@example.com', phone: '+14075550100', role: 'chef', neighborhood: 'College Park' },
      restaurants: [{
        id: 'r1', ownerId: 'u1', name: 'Susie’s Sweets', chefName: 'Mrs. Susie', chefBio: 'Forty years of church bake sales, and every recipe came from my mother’s kitchen in Macon.',
        verified: true, founding: true, prepMinutes: 35, cuisine: 'Bakery • Desserts', categories: ['bakery', 'sweet'], coverUris: ['demo:pound-cake'],
        address: '5 Willow Way', city: 'Orlando', areaCode: '32804', neighborhood: 'College Park',
        workingDays: ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday'], openTime: '09:00', closeTime: '17:00',
        rating: 4.9, ratingCount: 152, hasOffer: false, createdAt: '2026-04-03T12:00:00.000Z', acceptingOrders: true,
        signatureItemId: 'pc', documents: [], status: 'live', menu, inPerson: [],
      }],
      cart: { restaurantId: null, lines: [] }, orders, favoriteRestaurantIds: [], reviews: [],
      activitySeenAt: null, recentSearches: [], dietNudgeDismissed: true, growerApplication: null, reportedReviewIds: [],
    }));
  }, NOW.getTime());
  await page.goto(BASE + '/chef/dashboard');
  await shot('09-chef', 2500);
  await page.mouse.move(215, 600);
  await page.mouse.wheel(0, 700);
  await shot('10-chef-more', 1000);
  await page.goto(BASE + '/chef/share');
  await shot('11-share', 2500);
  console.log('ERRORS:', errors.join('\n'));
  await browser.close();
})();
