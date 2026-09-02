/* Screen recording walkthrough for the App Launch Checklist.
 * 1280x720, about 60 seconds. Marks match tool.json video.scenes.
 *
 * The story: filter to a platform, check off some store-listing items,
 * watch the progress bar and the "still required" list react, then reset
 * for a second app.
 */

const beat = (page, ms = 1000) => page.waitForTimeout(ms);

export default async function demo(page, mark) {
  await beat(page, 900);

  // Filter to iOS — platform-specific items (Apple's agreements, Google's
  // data safety form) show and hide as the filter changes.
  const root = page.locator('.t-app-launch-checklist');
  await root.scrollIntoViewIfNeeded();
  await page.locator('input[name="alc-platform"][value="ios"]').click({ force: true });
  await beat(page, 1200);
  await mark('filter');

  // Check off a couple of store-listing items.
  const items = page.locator('.alc-item');
  await items.nth(0).locator('input[type="checkbox"]').click({ force: true });
  await beat(page, 500);
  await items.nth(1).locator('input[type="checkbox"]').click({ force: true });
  await beat(page, 500);
  await items.nth(2).locator('input[type="checkbox"]').click({ force: true });
  await beat(page, 900);
  await mark('check');

  // Scroll to the summary card and let the progress bar settle.
  const out = page.locator('.alc-out');
  await out.scrollIntoViewIfNeeded();
  await beat(page, 1300);
  await mark('progress');

  // The "still required" list is right there in the same card.
  await beat(page, 1300);
  await mark('required');

  // Reset for a second app.
  await page.locator('#alc-reset').click();
  await beat(page, 1200);
  await mark('reset');

  await beat(page, 1000);
}
