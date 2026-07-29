/* Screen recording walkthrough for the Free QR Code Generator.
 * 1280x720. Runs about 58 seconds. Marks match tool.json video.scenes.
 *
 * The story is the differentiator: the code redraws as you type because the
 * data is going *into* the pattern, not into someone's redirect table. So the
 * pacing lingers on the preview after every keystroke burst rather than on the
 * form fields, and it ends on a real download.
 */

const beat = (page, ms = 1000) => page.waitForTimeout(ms);

// Typing is what sells "this is encoding, live" — keep it human-paced.
const type = async (page, sel, text, delay = 55) => {
  await page.click(sel);
  await page.fill(sel, '');
  await page.type(sel, text, { delay });
};

export default async function demo(page, mark) {
  await page.waitForSelector('#qr-root');
  await page.evaluate(() => {
    document.getElementById('qr-root').scrollIntoView({ block: 'center' });
  });
  await beat(page, 1400);

  // ---- scene 1: a finished code is already on screen, nothing gated ----
  await mark('intro');
  await page.hover('#qr-out');
  await beat(page, 4200);

  // ---- scene 2: a website address, encoded as you type ----
  await mark('url');
  await page.click('#qr-type-url');
  await beat(page, 900);
  await type(page, '#qr-url', 'usappteam.com/app-brief');
  await beat(page, 2600);
  await page.hover('#qr-canvas');
  await beat(page, 3200);

  // ---- scene 3: WiFi — the payload people actually want ----
  await mark('wifi');
  await page.click('#qr-type-wifi');
  await beat(page, 1200);
  await type(page, '#qr-wifi-ssid', 'Front Desk Guest');
  await beat(page, 1800);
  await type(page, '#qr-wifi-pass', 'welcome-2026');
  await beat(page, 2600);
  await page.hover('#qr-canvas');
  await beat(page, 3200);
  await page.hover('#qr-notes');
  await beat(page, 3200);

  // ---- scene 4: colour, and the contrast guard rail ----
  await mark('style');
  await page.evaluate(() => {
    const fg = document.getElementById('qr-fg');
    fg.value = '#A83268';
    fg.dispatchEvent(new Event('input', { bubbles: true }));
    fg.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await beat(page, 2800);
  await page.evaluate(() => {
    const fg = document.getElementById('qr-fg');
    fg.value = '#2380B8';
    fg.dispatchEvent(new Event('input', { bubbles: true }));
    fg.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await beat(page, 2600);
  await page.hover('#qr-canvas');
  await beat(page, 2400);

  // ---- scene 5: take it away — PNG for screens, SVG for print ----
  await mark('download');
  await page.selectOption('#qr-size', '1024');
  await beat(page, 1400);
  await page.hover('#qr-png');
  await beat(page, 1100);
  await page.click('#qr-png');
  await beat(page, 3200);
  await page.hover('#qr-svg');
  await beat(page, 2200);
  await page.hover('.t-qr-code-generator .qr-privacy');
  await beat(page, 3600);
}
