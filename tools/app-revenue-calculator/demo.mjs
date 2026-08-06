/* Screen recording walkthrough for the App Revenue Calculator.
 * 1280x720, about 60 seconds. Marks match tool.json video.scenes.
 *
 * The story the recording tells is the tool's actual argument: a naive
 * downloads-x-price number, then churn capping the base, then the store taking
 * its cut, then ads showing what happens when no commission applies. Values are
 * typed a digit at a time because a filled field that appears instantly reads
 * as a page reload rather than an interaction.
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
  await mark('model');

  // Subscription is the default and the most interesting case - start there.
  await page.locator('input[name="rc-model"][value="sub"]').scrollIntoViewIfNeeded();
  await beat(page, 900);

  await setNumber(page, 'rc-downloads', 5000);
  await beat(page, 900);
  await setNumber(page, 'rc-conv', 3);
  await beat(page, 1100);
  await mark('inputs');

  await setNumber(page, 'rc-price', 9.99);
  await beat(page, 1200);
  await mark('price');

  // The point of the tool: churn moves the ceiling far more than price does.
  await setNumber(page, 'rc-churn', 12);
  await beat(page, 1300);
  await setNumber(page, 'rc-churn', 6);
  await beat(page, 1300);
  await mark('churn');

  // Commission comes off the top - flip tiers so the delta is visible.
  await page.locator('input[name="rc-comm"][value="30"]').scrollIntoViewIfNeeded();
  await page.locator('input[name="rc-comm"][value="30"]').click({ force: true });
  await beat(page, 1300);
  await page.locator('input[name="rc-comm"][value="15"]').click({ force: true });
  await beat(page, 1200);
  await mark('commission');

  // Ads: the commission block disappears entirely, which is the honest bit
  // most calculators get wrong.
  await page.locator('input[name="rc-model"][value="ads"]').scrollIntoViewIfNeeded();
  await page.locator('input[name="rc-model"][value="ads"]').click({ force: true });
  await beat(page, 1200);
  await setNumber(page, 'rc-ecpm', 6);
  await beat(page, 1000);
  await setNumber(page, 'rc-imp', 60);
  await beat(page, 1400);
  await mark('ads');

  await beat(page, 1200);
}
