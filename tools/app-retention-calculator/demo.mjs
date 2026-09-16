/* Screen recording walkthrough for the App User Retention Calculator.
 * 1280x720. Marks match tool.json video.scenes.
 *
 * The story: set the cohort, then walk Day 1 -> Day 7 -> Day 30, pause on the
 * fit check (the tool's actual novelty), then land on the projected curve.
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

  await setNumber(page, 'rc-cohort', 2000);
  await beat(page, 1100);
  await mark('cohort');

  await setNumber(page, 'rc-d1', 28);
  await beat(page, 1000);
  await mark('day1');

  await setNumber(page, 'rc-d7', 11);
  await beat(page, 1000);
  await mark('day7');

  await setNumber(page, 'rc-d30', 5);
  await beat(page, 1200);
  await mark('day30');

  // The fit note is the tool's actual novelty - give it a beat on screen.
  await page.locator('.rc-fit').scrollIntoViewIfNeeded();
  await beat(page, 1400);
  await mark('fit');

  await page.locator('.rc-lines').scrollIntoViewIfNeeded();
  await beat(page, 1300);
  await mark('curve');
}
