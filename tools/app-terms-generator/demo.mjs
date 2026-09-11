/* Demo walkthrough for the App Terms of Service Generator.
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
  const root = '.t-app-terms-generator';
  await page.waitForSelector(root);
  await page.waitForTimeout(600);

  /* --- 1. intro: the privacy note --- */
  await mark('intro');
  await page.hover(`${root} .atg-privacy`);
  await page.waitForTimeout(1400);

  /* --- 2. app details --- */
  await mark('details');
  await type(page, '#atg-app', 'Trailmark');
  await page.waitForTimeout(500);
  await type(page, '#atg-company', 'Trailmark Labs LLC');
  await page.waitForTimeout(500);
  await type(page, '#atg-email', 'legal@trailmark.app', 40);
  await page.waitForTimeout(500);
  await type(page, '#atg-law', 'Delaware, United States', 40);
  await page.waitForTimeout(PAUSE);

  /* --- 3. accounts & content --- */
  await mark('content');
  await tick(page, '#atg-acc-yes');
  await tick(page, '#atg-ugc-yes', 700);

  /* --- 4. purchases & disputes --- */
  await mark('purchases');
  await tick(page, '#atg-buy-subscription');
  await tick(page, '#atg-trial');
  await tick(page, '#atg-dispute-arbitration', 700);

  /* --- 5. the document building live: scroll the preview pane --- */
  await mark('document');
  const pane = `${root} #atg-pane-terms`;
  for (let i = 0; i < 5; i++) {
    await page.hover(pane);
    await page.mouse.wheel(0, 320);
    await page.waitForTimeout(560);
  }
  await page.waitForTimeout(700);

  /* --- 6. the Apple minimum terms checklist --- */
  await mark('checklist');
  await page.click('#atg-tab-checklist');
  await page.waitForTimeout(1100);
  const checklist = `${root} #atg-pane-checklist`;
  for (let i = 0; i < 4; i++) {
    await page.hover(checklist);
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(620);
  }
  await page.waitForTimeout(600);

  /* --- 7. copy and download --- */
  await mark('download');
  await page.click('#atg-tab-terms');
  await page.waitForTimeout(700);
  await page.click('#atg-copy-text');
  await page.waitForTimeout(1200);
  await page.click('#atg-dl-html');
  await page.waitForTimeout(1800);
}
