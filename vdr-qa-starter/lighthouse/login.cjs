/**
 * Lighthouse CI auth preparation, NOT a benchmark in its own right.
 * VDR stores accessToken from /auth/login in localStorage['dataroom_token'].
 * LHCI must preserve localStorage (disableStorageReset=true).
 * @param {import('puppeteer').Browser} browser
 * @param {{url:string}} context
 */
module.exports = async (browser, context) => {
  const email = process.env.OWNER_EMAIL;
  const password = process.env.OWNER_PASSWORD;
  if (!email || !password) throw new Error('OWNER_EMAIL and OWNER_PASSWORD required');
  const target = new URL(context.url);
  const origin = target.origin;
  const page = await browser.newPage();
  try {
    await page.goto(`${origin}/login`, {waitUntil: 'domcontentloaded', timeout: 30000});
    // Start each audited URL with a fresh authenticated state, not a stale JWT.
    await page.evaluate(() => localStorage.removeItem('dataroom_token'));
    await page.goto(`${origin}/login`, {waitUntil: 'domcontentloaded', timeout: 30000});
    await page.waitForSelector('#email', {timeout: 15000});
    await page.type('#email', email);
    await page.type('#password', password);
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => Boolean(localStorage.getItem('dataroom_token')), {timeout: 30000});
    // Validate /auth/me, route identity and rendered content before collecting.
    await page.goto(context.url, {waitUntil: 'domcontentloaded', timeout: 30000});
    await page.waitForSelector('header button', {timeout: 30000});
    // Network-idle can time out indefinitely on SPAs with polling/analytics.
    // Instead verify the route, authenticated header and absence of known error states.
    const {pathname} = new URL(page.url());
    if (pathname === '/login' || pathname !== target.pathname) {
      throw new Error(`Auth preflight failed: expected ${target.pathname} but got ${pathname}`);
    }
    const headerHasSignout = await page.evaluate(() =>
      [...document.querySelectorAll('header button')].some(el => el.textContent?.includes('Sign out'))
    );
    if (!headerHasSignout) throw new Error('Auth preflight failed: no Sign out button (wrong page?)');
    const body = await page.evaluate(() => document.body.textContent || '');
    const errorIndicators = [
      'Could not load your data room.', 'Could not load this data room.',
      "Could not load what's been shared with you.", 'Data room not found',
      'Could not verify your session', 'Could not load this file.',
      'Could not load this folder.', 'File not found',
    ];
    if (errorIndicators.some((t) => body.includes(t))) {
      throw new Error('Auth preflight failed: target rendered an error or missing room');
    }
  } finally {
    await page.close();
  }
};
