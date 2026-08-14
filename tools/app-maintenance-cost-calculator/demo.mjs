/* Screen recording walkthrough for the App Maintenance Cost Calculator.
 * 1280x720, about 60 seconds. Marks match tool.json video.scenes.
 *
 * The story mirrors the tool's actual argument: start from a build cost, then
 * show each lever - platforms, backend, activity - visibly moving the annual
 * estimate and the category breakdown, then land on the Care comparison.
 * Values are typed a digit at a time so a filled field reads as an
 * interaction rather than a page reload.
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

  // Use the quick-fill tier button rather than typing - it is the tool's own
  // pricing surfaced as a real interaction, not just decoration.
  const standard = page.locator('.mc-quick[data-cost="7500"]');
  await standard.scrollIntoViewIfNeeded();
  await standard.click();
  await beat(page, 1100);
  await mark('cost');

  // Both platforms is the default and the more interesting case to land on.
  const both = page.locator('input[name="mc-platform"][value="both"]');
  await both.scrollIntoViewIfNeeded();
  await page.locator('input[name="mc-platform"][value="ios"]').click({ force: true });
  await beat(page, 900);
  await both.click({ force: true });
  await beat(page, 1100);
  await mark('platform');

  // Step backend complexity up to show the breakdown bar visibly shift.
  await page.locator('input[name="mc-backend"][value="complex"]').scrollIntoViewIfNeeded();
  await page.locator('input[name="mc-backend"][value="complex"]').click({ force: true });
  await beat(page, 1300);
  await mark('backend');

  // Activity is the biggest lever in the model - show the swing from
  // maintenance mode up to active growth.
  await page.locator('input[name="mc-activity"][value="maintenance"]').scrollIntoViewIfNeeded();
  await page.locator('input[name="mc-activity"][value="maintenance"]').click({ force: true });
  await beat(page, 1100);
  await page.locator('input[name="mc-activity"][value="active"]').click({ force: true });
  await beat(page, 1300);
  await mark('activity');

  // Land on the Care comparison card.
  const care = page.locator('#mc-care');
  await care.scrollIntoViewIfNeeded();
  await beat(page, 1400);
  await mark('care');

  await beat(page, 1200);
}
