/* Walkthrough for the App Name Generator demo video.
 * Runs against a local build with real network access — the .com badges come
 * from live DNS-over-HTTPS lookups, so the waits around them are generous.
 * Target: 45-70s at 1280x720.
 */

const IDEA = 'book a dog walker';

async function typeSlowly(page, selector, text) {
  await page.click(selector);
  await page.type(selector, text, { delay: 85 });
}

export default async function demo(page, mark) {
  const root = '.t-app-name-generator';
  await page.waitForSelector(`${root} #ang-idea`);

  // --- scene: the naming problem ---
  await page.waitForTimeout(1200);
  await mark('intro');
  await page.waitForTimeout(1400);

  // --- scene: describe your app ---
  await typeSlowly(page, `${root} #ang-idea`, IDEA);
  await page.waitForTimeout(900);
  await mark('describe');
  await page.waitForTimeout(1100);

  // --- scene: pick naming styles ---
  // Toggle one style off and back on so the chips read as controls.
  await page.click(`${root} .ang-chip:nth-child(4) span`);
  await page.waitForTimeout(800);
  await page.click(`${root} .ang-chip:nth-child(4) span`);
  await page.waitForTimeout(700);
  await mark('styles');
  await page.waitForTimeout(900);

  // --- scene: 24 names, instantly ---
  await page.click(`${root} #ang-go`);
  await page.waitForSelector(`${root} .ang-row`);
  await page.waitForTimeout(1600);
  await mark('generate');
  await page.waitForTimeout(1600);

  // --- scene: live .com availability ---
  // Let the queue work through the list. Real DNS, so wait properly for a
  // resolved badge rather than assuming a fixed duration.
  await page
    .waitForFunction(
      (sel) => {
        const badges = document.querySelectorAll(`${sel} .ang-badge`);
        let settled = 0;
        badges.forEach((b) => {
          const s = b.getAttribute('data-state');
          if (s === 'free' || s === 'taken' || s === 'unknown') settled++;
        });
        return settled >= 8;
      },
      root,
      { timeout: 25000 }
    )
    .catch(() => {
      /* DNS blocked or slow — badges will read "unknown"; the demo continues. */
    });
  await page.waitForTimeout(1500);
  await mark('availability');
  await page.waitForTimeout(1800);

  // Scroll gently through the list so more results are on screen.
  await page.evaluate(() => window.scrollBy({ top: 240, behavior: 'smooth' }));
  await page.waitForTimeout(1400);

  // --- scene: shortlist your favourites ---
  const stars = await page.$$(`${root} .ang-row .ang-icon[aria-pressed]`);
  if (stars[2]) {
    await stars[2].click();
    await page.waitForTimeout(1100);
  }
  const starsAgain = await page.$$(`${root} .ang-row .ang-icon[aria-pressed]`);
  if (starsAgain[5]) {
    await starsAgain[5].click();
    await page.waitForTimeout(1100);
  }
  const starsThird = await page.$$(`${root} .ang-row .ang-icon[aria-pressed]`);
  if (starsThird[7]) {
    await starsThird[7].click();
    await page.waitForTimeout(1000);
  }
  await mark('shortlist');
  await page.waitForTimeout(1400);

  // --- scene: copy the shortlist ---
  await page.evaluate(() => window.scrollBy({ top: -200, behavior: 'smooth' }));
  await page.waitForTimeout(900);
  await page.click(`${root} #ang-copy-short`);
  await page.waitForTimeout(1300);
  await mark('copy');
  await page.waitForTimeout(2000);
}
