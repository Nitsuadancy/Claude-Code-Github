/* global __dirname */
/**
 * Frames raw app captures into App Store screenshots (1290 × 2796, iPhone 6.9").
 *
 *   node store/frame.js <folder of raw 1290 × 2796 captures>
 *
 * Captions live in SHOTS below. Output: store/screenshots/NN-name.jpg
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const raw = path.resolve(process.argv[2] || path.join(__dirname, 'raw'));
const out = path.join(__dirname, 'screenshots');
const font = (w) => 'file://' + path.join(root, `node_modules/@expo-google-fonts/hanken-grotesk/${w}/HankenGrotesk_${w}.ttf`);

const SHOTS = [
  ['01-home', 'Made in College Park', 'Homemade, from the kitchen next door.'],
  ['03-kitchen', 'Real cooks, verified', 'Meet the cook behind every dish.'],
  ['05-dish', 'Every ingredient, upfront', 'Know what’s in it before you order.'],
  ['08-order', 'Live from the kitchen', 'Follow your order from oven to pickup.'],
  ['07-cart-total', 'Cooks keep 100% of their prices', 'One small fee. Nothing hidden.'],
  ['09-chef', 'For home cooks', 'Your kitchen, now a storefront.'],
  ['11-share', 'Bring your followers', 'Turn your Instagram into orders.'],
];

const page = (img, kicker, title) => `<html><head><style>
@font-face { font-family: H; font-weight: 500; src: url('${font('500Medium')}'); }
@font-face { font-family: H; font-weight: 600; src: url('${font('600SemiBold')}'); }
* { margin: 0; box-sizing: border-box; }
body { width: 1290px; height: 2796px; overflow: hidden; background: #0B0B0B; font-family: H; position: relative; }
.glow { position: absolute; inset: 0; background: radial-gradient(1100px 700px at 50% 2300px, rgba(212,178,110,.16), transparent 70%); }
.text { position: absolute; top: 210px; left: 110px; right: 110px; }
.kicker { color: #D4B26E; font-weight: 500; font-size: 44px; letter-spacing: -0.5px; }
h1 { color: #F7F4EE; font-weight: 600; font-size: 108px; line-height: 1.04; letter-spacing: -3.4px; margin-top: 26px; }
.phone { position: absolute; left: 50%; top: 760px; width: 1030px; transform: translateX(-50%);
  border-radius: 92px; padding: 18px; background: #1F1F1E; box-shadow: 0 0 0 2px #3B3A37, 0 60px 160px rgba(0,0,0,.7); }
.phone img { display: block; width: 100%; border-radius: 76px; }
</style></head><body><div class="glow"></div>
<div class="text"><div class="kicker">${kicker}</div><h1>${title}</h1></div>
<div class="phone"><img src="file://${img}"/></div></body></html>`;

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const tab = await browser.newPage({ viewport: { width: 1290, height: 2796 }, deviceScaleFactor: 1 });
  let n = 0;
  for (const [name, kicker, title] of SHOTS) {
    const img = path.join(raw, `${name}.png`);
    if (!fs.existsSync(img)) { console.warn('missing', img); continue; }
    const html = path.join(out, '_frame.html');
    fs.writeFileSync(html, page(img, kicker, title));
    await tab.goto('file://' + html);
    await tab.waitForTimeout(300);
    const file = path.join(out, `${String(++n).padStart(2, '0')}-${name.replace(/^\d+-/, '')}.jpg`);
    await tab.screenshot({ path: file, type: 'jpeg', quality: 92 });
    fs.unlinkSync(html);
    console.log(path.relative(root, file));
  }
  await browser.close();
})();
