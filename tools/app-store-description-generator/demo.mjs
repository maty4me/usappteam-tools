/* Screen recording walkthrough for the App Store Description Generator.
 * 1280x720, about 55 seconds. Marks match tool.json video.scenes.
 *
 * The story: land on the pre-filled draft, change the app name and watch every
 * field update, add a feature, switch tone, shuffle the wording, then copy a
 * field out.
 */

const beat = (page, ms = 1000) => page.waitForTimeout(ms);

async function typeInto(page, locator, value) {
  await locator.scrollIntoViewIfNeeded();
  await locator.click();
  await locator.press('Control+a');
  await locator.type(value, { delay: 60 });
  await locator.dispatchEvent('input');
}

export default async function demo(page, mark) {
  await beat(page, 900);

  // Land on the pre-filled example — six real fields, already generated.
  const outputs = page.locator('.asg-outputs');
  await outputs.scrollIntoViewIfNeeded();
  await beat(page, 1300);
  await mark('intro');

  // Change the app name — every field rebuilds around it.
  const form = page.locator('.asg-form');
  await form.scrollIntoViewIfNeeded();
  await typeInto(page, page.locator('#asg-name'), 'RouteWise');
  await beat(page, 1100);
  await mark('name');

  // Add a new feature.
  await page.locator('#asg-add').click();
  await beat(page, 500);
  const lastFeature = page.locator('.asg-frow input').last();
  await typeInto(page, lastFeature, 'Live traffic rerouting');
  await beat(page, 1200);
  await mark('features');

  // Switch the tone — the wording shifts to match.
  await page.locator('input[name="asg-tone"][value="bold"]').click({ force: true });
  await beat(page, 1200);
  await mark('tone');

  // Shuffle wording for a second honest draft.
  await page.locator('#asg-shuffle').click();
  await beat(page, 1200);
  await mark('shuffle');

  // Copy a field straight out.
  await outputs.scrollIntoViewIfNeeded();
  const copyBtn = page.locator('.asg-copy[data-target="asg-out-keywords"]');
  await copyBtn.scrollIntoViewIfNeeded();
  await copyBtn.click();
  await beat(page, 1300);
  await mark('copy');

  await beat(page, 1000);
}
