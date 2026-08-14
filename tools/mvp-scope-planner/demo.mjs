/* Screen recording walkthrough for the MVP Scope Planner.
 * 1280x720, about 60 seconds. Marks match tool.json video.scenes.
 *
 * The story mirrors the tool's actual argument: start from a pre-filled
 * example list, add a feature, rate it, flag a non-negotiable, then land on
 * the three sorted buckets and the suggested tier.
 */

const beat = (page, ms = 1000) => page.waitForTimeout(ms);

async function typeInto(page, locator, value) {
  await locator.scrollIntoViewIfNeeded();
  await locator.click();
  await locator.press('Control+a');
  await locator.type(value, { delay: 70 });
  await locator.dispatchEvent('input');
}

export default async function demo(page, mark) {
  await beat(page, 900);

  // Land on the pre-filled example list first — the tool is useful the
  // moment it loads, not just after you start typing.
  const rows = page.locator('.fp-row');
  await rows.first().scrollIntoViewIfNeeded();
  await beat(page, 1200);
  await mark('list');

  // Add a new feature and name it.
  await page.locator('#fp-add').click();
  await beat(page, 500);
  const newRow = rows.last();
  await typeInto(page, newRow.locator('.fp-name'), 'Offline mode');
  await beat(page, 900);
  await mark('add');

  // Rate the new feature's impact and effort — watch it join a bucket.
  await newRow.locator('input[name^="impact-"][value="3"]').click({ force: true });
  await beat(page, 700);
  await newRow.locator('input[name^="effort-"][value="1"]').click({ force: true });
  await beat(page, 1200);
  await mark('score');

  // Flag the booking flow as non-negotiable — it skips scoring entirely.
  const bookingRow = page.locator('.fp-row', { has: page.locator('.fp-name[value="Core booking flow"]') });
  await bookingRow.scrollIntoViewIfNeeded();
  await bookingRow.locator('.fp-must-cb').click({ force: true });
  await beat(page, 1200);
  await mark('musthave');

  // Land on the sorted buckets and the suggested starting tier.
  const out = page.locator('.fp-out');
  await out.scrollIntoViewIfNeeded();
  await beat(page, 1500);
  await mark('buckets');

  await beat(page, 1200);
}
