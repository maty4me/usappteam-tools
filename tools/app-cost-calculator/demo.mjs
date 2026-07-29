/* Screen recording walkthrough for the App Development Cost Calculator.
 * 1280x720. Runs about 50 seconds. Marks match tool.json video.scenes.
 *
 * The story: the number is already on screen before you touch anything, and
 * every click moves it visibly. That is the whole differentiator, so the pacing
 * lingers on the result card rather than on the form.
 */

const beat = (page, ms = 1000) => page.waitForTimeout(ms);

export default async function demo(page, mark) {
  await page.waitForSelector('#acc-root');
  await page.evaluate(() => {
    document.getElementById('acc-root').scrollIntoView({ block: 'center' });
  });
  await beat(page, 1500);

  // ---- scene 1: the estimate is already there, nothing is gated ----
  await mark('intro');
  await page.hover('#acc-result');
  await beat(page, 6000);

  // ---- scene 2: platforms — both is the normal answer ----
  await mark('platform');
  await page.click('#acc-platform-ios');
  await beat(page, 1500);
  await page.click('#acc-platform-android');
  await beat(page, 1500);
  await page.click('#acc-platform-both');
  await beat(page, 3000);

  // ---- scene 3: app type sets the baseline ----
  await mark('apptype');
  await page.click('#acc-type-standard');
  await beat(page, 4000);

  // ---- scene 4: features, one at a time so the number visibly moves ----
  await mark('features');
  await page.click('#acc-f-accounts');
  await beat(page, 1400);
  await page.click('#acc-f-push');
  await beat(page, 1400);
  await page.click('#acc-f-maps');
  await beat(page, 1400);
  await page.click('#acc-f-media');
  await beat(page, 3000);

  // ---- scene 5: read the answer — price, timeline, drivers, care ----
  await mark('result');
  await page.evaluate(() => {
    document.getElementById('acc-result').scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
  await beat(page, 1500);
  await page.hover('#acc-drivers');
  await beat(page, 6000);
  await page.hover('#acc-care');
  await beat(page, 4000);
  await page.hover('.t-app-cost-calculator .acc-extra');
  await beat(page, 3000);

  // ---- scene 6: copy it and take it away ----
  await mark('copy');
  await page.hover('#acc-copy');
  await beat(page, 1200);
  await page.click('#acc-copy');
  await beat(page, 4000);
  await page.hover('.t-app-cost-calculator .acc-go');
  await beat(page, 2500);
  await beat(page, 2000);
}
