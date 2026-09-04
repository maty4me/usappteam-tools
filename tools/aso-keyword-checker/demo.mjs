/* Screen recording walkthrough for the ASO Keyword Checker.
 * 1280x720, about 60 seconds. Marks match tool.json video.scenes.
 *
 * The story: fill in the iOS title/subtitle/keyword field, watch the
 * wasted/duplicate flags appear, copy the optimized field, then switch to
 * Google Play and check keyword density on a pasted description.
 */

const beat = (page, ms = 1000) => page.waitForTimeout(ms);

async function typeInto(page, selector, text) {
  const el = page.locator(selector);
  await el.click();
  await el.fill('');
  await el.type(text, { delay: 12 });
}

export default async function demo(page, mark) {
  const root = page.locator('.t-aso-keyword-checker');
  await root.scrollIntoViewIfNeeded();
  await beat(page, 700);

  // Fill in the iOS title, subtitle and keyword field.
  await typeInto(page, '#akc-title', 'FitTrack: Workout Planner');
  await beat(page, 400);
  await typeInto(page, '#akc-subtitle', 'Calorie & Workout Tracker');
  await beat(page, 400);
  await typeInto(
    page,
    '#akc-keywords',
    'fitness,workout,workout,calorie,tracker,gym,exercise,diet,health,nutrition'
  );
  await beat(page, 1000);
  await mark('ios-input');

  // The chips card is right below the fields — scroll it into view.
  const chips = page.locator('#akc-chips');
  await chips.scrollIntoViewIfNeeded();
  await beat(page, 1400);
  await mark('ios-flags');

  // The optimized field sits in the same card, just below.
  const optimized = page.locator('.akc-optimized');
  await optimized.scrollIntoViewIfNeeded();
  await beat(page, 900);
  await page.locator('#akc-copy').click();
  await beat(page, 1100);
  await mark('ios-optimized');

  // Switch to the Google Play tab.
  await page.locator('#akc-tab-play').click();
  await beat(page, 700);
  const playRoot = page.locator('#akc-panel-play');
  await playRoot.scrollIntoViewIfNeeded();

  await typeInto(page, '#akc-play-title', 'FitTrack - Workout & Calorie Tracker');
  await beat(page, 300);
  await typeInto(page, '#akc-play-short', 'Track workouts, calories and progress in one free app.');
  await beat(page, 300);
  await typeInto(page, '#akc-play-keyword', 'workout tracker');
  await beat(page, 300);
  await typeInto(
    page,
    '#akc-play-desc',
    'FitTrack is the workout tracker built for real routines. Log every workout in seconds, ' +
      'watch your workout tracker history build over time, and see calories and progress in one ' +
      'clean dashboard. Whether you are lifting, running or just getting started, FitTrack keeps ' +
      'every workout tracker entry organized and easy to review.'
  );
  await beat(page, 1000);
  await mark('play-input');

  const density = page.locator('#akc-density-body');
  await density.scrollIntoViewIfNeeded();
  await beat(page, 1500);
  await mark('play-density');

  await beat(page, 1000);
}
