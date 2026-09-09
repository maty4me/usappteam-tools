/* Screen recording walkthrough for the Subscription Break-Even Calculator.
 * 1280x720. Marks match tool.json video.scenes.
 *
 * The story: fill in costs, then price and commission, then growth - and show
 * churn moving the break-even month rather than treating it as a constant.
 * Values are typed a digit at a time because a filled field that appears
 * instantly reads as a page reload rather than an interaction.
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

  await page.locator('.bc-quick[data-target="bc-upfront"][data-value="7500"]').scrollIntoViewIfNeeded();
  await page.locator('.bc-quick[data-target="bc-upfront"][data-value="7500"]').click();
  await beat(page, 1100);
  await mark('upfront');

  await page.locator('.bc-quick[data-target="bc-fixed"][data-value="399"]').scrollIntoViewIfNeeded();
  await page.locator('.bc-quick[data-target="bc-fixed"][data-value="399"]').click();
  await beat(page, 1100);
  await mark('fixed');

  await setNumber(page, 'bc-price', 9.99);
  await beat(page, 900);
  await page.locator('input[name="bc-comm"][value="15"]').scrollIntoViewIfNeeded();
  await page.locator('input[name="bc-comm"][value="15"]').click({ force: true });
  await beat(page, 1200);
  await mark('price');

  await setNumber(page, 'bc-newsubs', 40);
  await beat(page, 1200);
  await mark('growth');

  // Churn moves the break-even month more than any other single input -
  // flip it up, then settle on a realistic rate.
  await setNumber(page, 'bc-churn', 12);
  await beat(page, 1300);
  await setNumber(page, 'bc-churn', 6);
  await beat(page, 1400);
  await mark('churn');

  await beat(page, 1400);
  await mark('result');
}
