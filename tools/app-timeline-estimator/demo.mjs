/* Screen recording walkthrough for the App Development Timeline Estimator.
 * 1280x720. Marks match tool.json video.scenes.
 *
 * The story: set scope (screens, complexity), then platform and backend,
 * then design readiness - showing the week range and phase bar update after
 * each change so the video demonstrates the estimate reacting, not just a
 * filled-in form.
 */

const beat = (page, ms = 1000) => page.waitForTimeout(ms);

async function setNumber(page, id, value) {
  const el = page.locator(`#${id}`);
  await el.scrollIntoViewIfNeeded();
  await el.click();
  await el.press('Control+a');
  await el.type(String(value), { delay: 90 });
  await el.dispatchEvent('input');
}

export default async function demo(page, mark) {
  await beat(page, 900);

  await setNumber(page, 'te-features', 18);
  await beat(page, 1200);
  await mark('features');

  await page.locator('input[name="te-complexity"][value="complex"]').scrollIntoViewIfNeeded();
  await page.locator('input[name="te-complexity"][value="complex"]').click({ force: true });
  await beat(page, 1300);
  await mark('complexity');

  await page.locator('input[name="te-platform"][value="both"]').scrollIntoViewIfNeeded();
  await page.locator('input[name="te-platform"][value="both"]').click({ force: true });
  await beat(page, 1200);
  await mark('platform');

  await page.locator('input[name="te-backend"][value="complex"]').scrollIntoViewIfNeeded();
  await page.locator('input[name="te-backend"][value="complex"]').click({ force: true });
  await beat(page, 1300);
  await mark('backend');

  await page.locator('input[name="te-design"][value="scratch"]').scrollIntoViewIfNeeded();
  await page.locator('input[name="te-design"][value="scratch"]').click({ force: true });
  await beat(page, 1300);
  await mark('design');

  await beat(page, 1400);
  await mark('result');
}
