/* Demo walkthrough for the App Privacy Policy Generator.
 * Target: ~60s at 1280x720. Marks match tool.json video.scenes. */

const PAUSE = 900;

async function type(page, selector, value, delay = 55) {
  await page.click(selector);
  await page.type(selector, value, { delay });
}

async function tick(page, selector, wait = 420) {
  await page.check(selector);
  await page.waitForTimeout(wait);
}

export default async function demo(page, mark) {
  const root = '.t-app-privacy-policy-generator';
  await page.waitForSelector(root);
  await page.waitForTimeout(600);

  /* --- 1. intro: the privacy note and the empty-ish preview --- */
  await mark('intro');
  await page.hover(`${root} .ppg-privacy`);
  await page.waitForTimeout(1400);

  /* --- 2. app details --- */
  await mark('details');
  await type(page, '#ppg-app', 'Trailmark');
  await page.waitForTimeout(500);
  await type(page, '#ppg-company', 'Trailmark Labs LLC');
  await page.waitForTimeout(500);
  await type(page, '#ppg-email', 'privacy@trailmark.app', 40);
  await page.waitForTimeout(PAUSE);

  /* --- 3. what the app collects --- */
  await mark('data');
  await tick(page, '#ppg-acc-yes');
  await tick(page, '#ppg-d-name');
  await tick(page, '#ppg-d-photos');
  await tick(page, '#ppg-d-locPrecise');
  await tick(page, '#ppg-d-deviceId', 700);

  /* --- 4. third-party services --- */
  await mark('services');
  await tick(page, '#ppg-s-appleid');
  await tick(page, '#ppg-s-firebase');
  await tick(page, '#ppg-s-admob', 800);

  /* --- 5. regions --- */
  await mark('gdpr');
  await tick(page, '#ppg-gdpr');
  await tick(page, '#ppg-ccpa', 900);

  /* --- 6. the policy building live: scroll the preview pane --- */
  await mark('policy');
  const pane = `${root} #ppg-pane-policy`;
  for (let i = 0; i < 5; i++) {
    await page.hover(pane);
    await page.mouse.wheel(0, 320);
    await page.waitForTimeout(560);
  }
  await page.waitForTimeout(700);

  /* --- 7. the store cheat sheet --- */
  await mark('cheatsheet');
  await page.click('#ppg-tab-store');
  await page.waitForTimeout(1100);
  const store = `${root} #ppg-pane-store`;
  for (let i = 0; i < 5; i++) {
    await page.hover(store);
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(620);
  }
  await page.waitForTimeout(600);

  /* --- 8. copy and download --- */
  await mark('download');
  await page.click('#ppg-tab-policy');
  await page.waitForTimeout(700);
  await page.click('#ppg-copy-text');
  await page.waitForTimeout(1200);
  await page.click('#ppg-dl-html');
  await page.waitForTimeout(1800);
}
