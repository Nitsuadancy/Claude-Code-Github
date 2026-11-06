/* global __dirname */
/**
 * Renders Manna's cook-recruitment flyer (print PDF + PNG) and an Instagram post.
 *
 *   node marketing/render.js https://your-signup-link
 *
 * Without a link, the QR area is a labeled placeholder (for previews only).
 * Output: marketing/out/flyer.pdf, flyer.png, instagram-post.png
 * Needs Playwright (npx playwright install chromium) and this repo's node_modules.
 */
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const out = path.join(__dirname, 'out');
const url = process.argv[2] || '';
const file = (p) => 'file://' + path.join(root, p);
const font = (w) => file(`node_modules/@expo-google-fonts/hanken-grotesk/${w}/HankenGrotesk_${w}.ttf`);

const css = `
@font-face { font-family: H; font-weight: 400; src: url('${font('400Regular')}'); }
@font-face { font-family: H; font-weight: 500; src: url('${font('500Medium')}'); }
@font-face { font-family: H; font-weight: 600; src: url('${font('600SemiBold')}'); }
@font-face { font-family: H; font-weight: 700; src: url('${font('700Bold')}'); }
* { box-sizing: border-box; margin: 0; }
body { font-family: H, sans-serif; background: #0B0B0B; color: #F7F4EE; }
.gold { color: #D4B26E; }
.muted { color: #9A968F; }
.qr { background: #F7F4EE; border-radius: 18px; display: flex; flex-direction: column; align-items: center; }
.qr img { display: block; }
.qr span { color: #0B0B0B; font-weight: 600; }
.placeholder { border: 3px dashed #0B0B0B; display: flex; align-items: center; justify-content: center; text-align: center; color: #0B0B0B; font-weight: 600; }
`;

const qrBlock = (size, caption) =>
  url
    ? `<div class="qr" style="padding:${size * 0.09}px"><img src="QR" width="${size}" height="${size}"/><span style="font-size:${size * 0.085}px;margin-top:${size * 0.05}px">${caption}</span></div>`
    : `<div class="qr" style="padding:${size * 0.09}px"><div class="placeholder" style="width:${size}px;height:${size}px;font-size:${size * 0.09}px">Your sign-up<br/>link's QR<br/>goes here</div><span style="font-size:${size * 0.085}px;margin-top:${size * 0.05}px">${caption}</span></div>`;

/** US Letter, 8.5 × 11 in at 96 px per inch. */
const flyer = `<html><head><style>${css}
.page { width: 816px; height: 1056px; position: relative; overflow: hidden; }
.hero { height: 470px; background: url('${file('assets/photos/country-loaf.jpg')}') center/cover; position: relative; }
.hero::after { content: ''; position: absolute; inset: 0; background: linear-gradient(rgba(11,11,11,.35), transparent 35%, transparent 55%, #0B0B0B); }
.brand { position: absolute; top: 40px; left: 56px; z-index: 1; height: 26px; }
.body { padding: 0 56px; margin-top: -70px; position: relative; }
h1 { font-weight: 600; font-size: 64px; line-height: 1.02; letter-spacing: -2px; }
.lead { font-size: 21px; line-height: 1.45; margin-top: 18px; max-width: 600px; color: #ECE9E3; }
.row { display: flex; gap: 40px; margin-top: 40px; align-items: flex-end; }
ul { list-style: none; padding: 0; flex: 1; }
li { font-size: 18px; padding: 13px 0; border-top: 1px solid #272726; }
li b { font-weight: 600; }
.founding { margin-top: 30px; font-size: 18px; font-weight: 600; }
.foot { position: absolute; bottom: 34px; left: 56px; right: 56px; font-size: 12px; color: #64625D; }
</style></head><body><div class="page">
<img class="brand" src="${file('assets/images/wordmark.png')}"/>
<div class="hero"></div>
<div class="body">
  <div class="gold" style="font-size:18px;font-weight:600;margin-bottom:12px">Home cooks of College Park</div>
  <h1>Your kitchen.<br/>Your storefront.</h1>
  <p class="lead">Sell your breads, cakes, cookies and jams to neighbors on Manna. Keep posting on Instagram; let Manna take the orders.</p>
  <div class="row">
    <ul>
      <li><b>Orders paid upfront.</b> <span class="muted">No chasing payments.</span></li>
      <li><b>Pickup times, set by you.</b> <span class="muted">No back-and-forth in DMs.</span></li>
      <li><b>Daily limits.</b> <span class="muted">Never oversold again.</span></li>
      <li><b>Keep every dollar of your prices.</b> <span class="muted">Free to join.</span></li>
    </ul>
    ${qrBlock(170, 'Scan to join')}
  </div>
  <p class="founding"><span class="gold">Founding cooks wanted.</span> We set up your storefront for free and take your photos.</p>
</div>
<p class="foot">Manna · Orlando, Florida · For cottage foods: breads, cakes, cookies, pastries, candy, jams and dry mixes.</p>
</div></body></html>`;

/** Instagram portrait post, 1080 × 1350. */
const post = `<html><head><style>${css}
.page { width: 1080px; height: 1350px; position: relative; overflow: hidden; }
.hero { position: absolute; inset: 0; background: url('${file('assets/photos/cinnamon-rolls.jpg')}') center/cover; }
.hero::after { content: ''; position: absolute; inset: 0; background: linear-gradient(rgba(11,11,11,.55), rgba(11,11,11,.1) 30%, rgba(11,11,11,.6) 55%, #0B0B0B 82%); }
.brand { position: absolute; top: 64px; left: 72px; height: 34px; }
.text { position: absolute; left: 72px; right: 72px; bottom: 80px; }
h1 { font-weight: 600; font-size: 96px; line-height: 1; letter-spacing: -3px; }
.lead { font-size: 32px; line-height: 1.4; margin-top: 24px; color: #ECE9E3; max-width: 760px; }
.bottom { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; }
.cta { font-size: 30px; font-weight: 600; }
</style></head><body><div class="page"><div class="hero"></div>
<img class="brand" src="${file('assets/images/wordmark.png')}"/>
<div class="text">
  <div class="gold" style="font-size:30px;font-weight:600;margin-bottom:18px">Founding cooks wanted · College Park</div>
  <h1>Bake at home?<br/>Sell on Manna.</h1>
  <p class="lead">Your menu, paid orders and pickup times in one link. We set it up free for the first 20 kitchens.</p>
  <div class="bottom"><div class="cta">DM us “COOK”<br/><span class="muted" style="font-weight:500">or scan to join</span></div>${qrBlock(190, 'Scan to join')}</div>
</div></div></body></html>`;

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const qr = url ? await QRCode.toDataURL(url, { margin: 0, width: 600, color: { dark: '#0B0B0B', light: '#F7F4EE' } }) : '';
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const render = async (html, w, h, name, pdf) => {
    const f = path.join(out, `${name}.html`);
    fs.writeFileSync(f, html.replace(/src="QR"/g, `src="${qr}"`));
    await page.setViewportSize({ width: w, height: h });
    await page.goto('file://' + f);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(out, `${name}.png`), scale: 'device' });
    if (pdf) await page.pdf({ path: path.join(out, `${name}.pdf`), width: '8.5in', height: '11in', printBackground: true });
    fs.unlinkSync(f);
  };
  await render(flyer, 816, 1056, 'flyer', true);
  await render(post, 1080, 1350, 'instagram-post', false);
  await browser.close();
  console.log(url ? `Rendered with QR for ${url}` : 'Rendered previews with a QR placeholder. Pass your sign-up link to finish.');
})();
