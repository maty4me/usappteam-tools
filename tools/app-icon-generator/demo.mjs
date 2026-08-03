/* Screen recording walkthrough for the App Icon Generator.
 * 1280x720. Runs about 60 seconds. Marks match tool.json video.scenes.
 *
 * There is no OS file picker in a recording, so the demo draws a plausible
 * piece of icon artwork inside the page (canvas -> Blob -> File), hands it to
 * the file input through a DataTransfer, and fires the change event the tool
 * already listens for. It is drawn at 1024x1024 with a transparent background,
 * which is exactly the case the tool has opinions about: transparent artwork
 * that iOS will not accept until it is flattened.
 */

const beat = (page, ms = 1000) => page.waitForTimeout(ms);

async function seedArtwork(page) {
  await page.evaluate(async () => {
    const S = 1024;
    const c = document.createElement('canvas');
    c.width = S; c.height = S;
    const x = c.getContext('2d');

    // A bold mark on a transparent canvas — a rounded chat bubble with a bolt.
    const g = x.createLinearGradient(0, 0, S, S);
    g.addColorStop(0, '#FFFFFF');
    g.addColorStop(1, '#DCEAF5');

    x.fillStyle = g;
    const r = 150, m = 150, w = S - m * 2;
    x.beginPath();
    x.moveTo(m + r, m);
    x.arcTo(m + w, m, m + w, m + w, r);
    x.arcTo(m + w, m + w, m, m + w, r);
    x.arcTo(m, m + w, m, m, r);
    x.arcTo(m, m, m + w, m, r);
    x.closePath();
    x.fill();

    // tail
    x.beginPath();
    x.moveTo(S * 0.34, m + w - 8);
    x.lineTo(S * 0.40, S - 110);
    x.lineTo(S * 0.52, m + w - 8);
    x.closePath();
    x.fill();

    // bolt
    x.fillStyle = '#17202B';
    x.beginPath();
    x.moveTo(S * 0.545, S * 0.265);
    x.lineTo(S * 0.375, S * 0.545);
    x.lineTo(S * 0.495, S * 0.545);
    x.lineTo(S * 0.445, S * 0.755);
    x.lineTo(S * 0.635, S * 0.455);
    x.lineTo(S * 0.505, S * 0.455);
    x.closePath();
    x.fill();

    const file = await new Promise((res) =>
      c.toBlob((b) => res(new File([b], 'brand-mark.png', { type: 'image/png' })), 'image/png')
    );

    const dt = new DataTransfer();
    dt.items.add(file);
    const input = document.getElementById('ai-file');
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

const setRange = (page, id, value) =>
  page.evaluate(([i, v]) => {
    const el = document.getElementById(i);
    el.value = String(v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, [id, value]);

const scrollTo = (page, id) =>
  page.evaluate((i) => document.getElementById(i).scrollIntoView({ block: 'center', behavior: 'smooth' }), id);

export default async function demo(page, mark) {
  await page.waitForSelector('#ai-root');
  await page.evaluate(() => {
    document.getElementById('ai-root').scrollIntoView({ block: 'start' });
    window.scrollBy(0, -90);
  });
  await beat(page, 1200);

  // ---- scene 1: nothing leaves the browser ----
  await mark('intro');
  await page.hover('.t-app-icon-generator .ai-privacy');
  await beat(page, 2800);

  // ---- scene 2: one square image in ----
  await mark('load');
  await page.hover('#ai-drop');
  await beat(page, 1100);
  await seedArtwork(page);
  await page.waitForSelector('#ai-prev-wrap:not([hidden])', { timeout: 20000 });
  await beat(page, 1200);
  await scrollTo(page, 'ai-source');
  await beat(page, 2400);

  // ---- scene 3: real sizes, down to 40px ----
  await mark('preview');
  await scrollTo(page, 'ai-tiles');
  await beat(page, 900);
  await page.hover('#ai-tiles');
  await beat(page, 2800);

  // ---- scene 4: iOS cannot have alpha ----
  await mark('background');
  await scrollTo(page, 'ai-swatches');
  await beat(page, 900);
  await page.click('#ai-swatches [data-c="#17202B"]');
  await beat(page, 1500);
  await page.click('#ai-swatches [data-c="#A83268"]');
  await beat(page, 1500);
  await page.click('#ai-swatches [data-c="#2380B8"]');
  await beat(page, 1300);
  await page.hover('#ai-bg-note');
  await beat(page, 2400);

  // ---- scene 5: the 108dp adaptive canvas ----
  await mark('adaptive');
  await scrollTo(page, 'ai-ad-layers');
  await beat(page, 1000);
  await setRange(page, 'ai-scale', 84);
  await beat(page, 1800);
  await page.hover('#ai-ad-layers');
  await beat(page, 2600);

  // ---- scene 6: every mask, previewed ----
  await mark('mask');
  await page.click('#ai-mask-squircle');
  await beat(page, 1400);
  await page.click('#ai-mask-rounded');
  await beat(page, 1400);
  await page.click('#ai-mask-square');
  await beat(page, 1400);
  await page.click('#ai-mask-circle');
  await beat(page, 1600);

  // ---- scene 7: named and filed correctly ----
  await mark('export');
  await scrollTo(page, 'ai-set-ios2');
  await beat(page, 800);
  await page.click('#ai-set-ios2');
  await beat(page, 1400);
  await scrollTo(page, 'ai-export');
  await beat(page, 700);
  await page.click('#ai-export');
  await page.waitForSelector('#ai-results:not([hidden])', { timeout: 60000 });
  await beat(page, 1400);
  await scrollTo(page, 'ai-groups');
  await beat(page, 2600);
  await page.evaluate(() => {
    const rows = document.querySelectorAll('#ai-groups .ai-group');
    if (rows[2]) rows[2].scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
  await beat(page, 3000);
  await page.hover('#ai-dl-all');
  await beat(page, 1600);
  await page.click('#ai-dl-all');
  await beat(page, 2400);
}
