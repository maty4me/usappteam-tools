/* Screen recording walkthrough for the App Store Screenshot Generator.
 * 1280x720. Runs about 60 seconds. Marks match tool.json video.scenes.
 *
 * There is no OS file picker in a recording, so the demo synthesises four
 * plausible app screens inside the page (canvas -> Blob -> File), hands them to
 * the file input through a DataTransfer, and fires the change event the tool
 * already listens for. From the tool's point of view that is indistinguishable
 * from someone selecting four files from their simulator output folder.
 *
 * The seeds are drawn at 1320x2868 — a real 6.9" iPhone capture size — so the
 * fitting on screen is what a viewer would actually get, not a lucky ratio.
 */

const beat = (page, ms = 1000) => page.waitForTimeout(ms);

async function seedScreens(page) {
  await page.evaluate(async () => {
    function screen(name, bg, accent, title, rows) {
      const w = 1320, h = 2868;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const x = c.getContext('2d');

      x.fillStyle = bg;
      x.fillRect(0, 0, w, h);

      // status bar
      x.fillStyle = 'rgba(0,0,0,.35)';
      x.font = '600 46px system-ui, sans-serif';
      x.textAlign = 'left';
      x.fillText('9:41', 90, 150);
      x.textAlign = 'right';
      x.fillText('LTE', w - 90, 150);

      // nav title
      x.fillStyle = '#11161f';
      x.textAlign = 'left';
      x.font = '700 108px system-ui, sans-serif';
      x.fillText(title, 90, 400);

      // accent hero card
      x.fillStyle = accent;
      const r = 44;
      const hx = 90, hy = 480, hw = w - 180, hh = 480;
      x.beginPath();
      x.moveTo(hx + r, hy);
      x.arcTo(hx + hw, hy, hx + hw, hy + hh, r);
      x.arcTo(hx + hw, hy + hh, hx, hy + hh, r);
      x.arcTo(hx, hy + hh, hx, hy, r);
      x.arcTo(hx, hy, hx + hw, hy, r);
      x.fill();
      x.fillStyle = 'rgba(255,255,255,.92)';
      x.font = '700 76px system-ui, sans-serif';
      x.fillText(rows[0], hx + 60, hy + 160);
      x.font = '500 52px system-ui, sans-serif';
      x.fillStyle = 'rgba(255,255,255,.75)';
      x.fillText(rows[1], hx + 60, hy + 260);

      // list rows
      let y = 1060;
      for (let i = 2; i < rows.length; i++) {
        x.fillStyle = '#ffffff';
        x.fillRect(90, y, w - 180, 200);
        x.fillStyle = accent;
        x.beginPath();
        x.arc(190, y + 100, 52, 0, Math.PI * 2);
        x.fill();
        x.fillStyle = '#1b2230';
        x.font = '600 56px system-ui, sans-serif';
        x.fillText(rows[i], 290, y + 90);
        x.fillStyle = '#93a0b0';
        x.font = '400 44px system-ui, sans-serif';
        x.fillText('Updated just now', 290, y + 152);
        y += 232;
      }

      // tab bar
      x.fillStyle = '#ffffff';
      x.fillRect(0, h - 260, w, 260);
      for (let i = 0; i < 4; i++) {
        x.fillStyle = i === 0 ? accent : '#c3ccd7';
        x.beginPath();
        x.arc(w / 8 + (i * w) / 4, h - 150, 40, 0, Math.PI * 2);
        x.fill();
      }

      return new Promise((res) => {
        c.toBlob((b) => res(new File([b], name, { type: 'image/png' })), 'image/png');
      });
    }

    const files = await Promise.all([
      screen('01-home.png', '#eef2f7', '#2380B8', 'Today',
        ['4 jobs today', 'Next at 10:30 — Riverside', 'Riverside deck', 'Kemp Street repair', 'Follow-up call']),
      screen('02-schedule.png', '#f2eef7', '#6C4BB6', 'Schedule',
        ['This week', '18 appointments booked', 'Monday', 'Tuesday', 'Wednesday']),
      screen('03-invoice.png', '#eef7f2', '#1FA971', 'Invoices',
        ['Paid this month', 'Everything settled', 'Riverside deck', 'Kemp Street', 'Harbour View']),
      screen('04-profile.png', '#f7f0ee', '#A83268', 'Team',
        ['5 on shift', 'All clocked in', 'Dana R.', 'Marcus T.', 'Priya S.'])
    ]);

    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    const input = document.getElementById('as-file');
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

const setSelect = (page, id, value) =>
  page.evaluate(([i, v]) => {
    const el = document.getElementById(i);
    el.value = v;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, [id, value]);

const setRange = (page, id, value) =>
  page.evaluate(([i, v]) => {
    const el = document.getElementById(i);
    el.value = String(v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, [id, value]);

export default async function demo(page, mark) {
  await page.waitForSelector('#as-root');
  await page.evaluate(() => {
    document.getElementById('as-root').scrollIntoView({ block: 'start' });
    window.scrollBy(0, -90);
  });
  await beat(page, 1200);

  // ---- scene 1: the stakes — exact sizes or rejection ----
  await mark('intro');
  await page.hover('.t-app-screenshot-generator .as-privacy');
  await beat(page, 3000);

  // ---- scene 2: load a whole batch, order preserved ----
  await mark('load');
  await page.hover('#as-drop');
  await beat(page, 1200);
  await seedScreens(page);
  await page.waitForFunction(
    () => document.querySelectorAll('#as-strip [data-go]').length >= 4,
    null,
    { timeout: 30000 }
  );
  await beat(page, 1400);
  await page.evaluate(() => document.getElementById('as-strip-wrap').scrollIntoView({ block: 'center', behavior: 'smooth' }));
  await beat(page, 2600);

  // ---- scene 3: every published Apple and Google slot ----
  await mark('size');
  await page.evaluate(() => document.getElementById('as-slot').scrollIntoView({ block: 'center', behavior: 'smooth' }));
  await beat(page, 900);
  await page.hover('#as-slot');
  await beat(page, 1200);
  await setSelect(page, 'as-slot', 'ipad-13');
  await beat(page, 1700);
  await setSelect(page, 'as-slot', 'gp-phone');
  await beat(page, 1700);
  await setSelect(page, 'as-slot', 'ios-69');
  await beat(page, 1300);

  // a slot with three accepted sizes — pick a different one
  await page.hover('#as-size');
  await beat(page, 900);
  await setSelect(page, 'as-size', '1');
  await beat(page, 1600);
  await setSelect(page, 'as-size', '0');
  await beat(page, 1100);

  // ---- scene 4: required vs optional, and which devices ----
  await mark('required');
  await page.hover('#as-slotinfo');
  await beat(page, 2600);
  await setSelect(page, 'as-slot', 'ios-63');
  await beat(page, 2000);
  await setSelect(page, 'as-slot', 'ios-69');
  await beat(page, 1400);

  // ---- scene 5: caption each slide ----
  await mark('caption');
  await page.evaluate(() => document.getElementById('as-caption').scrollIntoView({ block: 'center', behavior: 'smooth' }));
  await beat(page, 800);
  await page.click('#as-caption');
  await page.type('#as-caption', 'Every job, in one place', { delay: 55 });
  await beat(page, 1800);
  await page.click('#as-cap-below');
  await beat(page, 1500);
  await page.click('#as-cap-above');
  await beat(page, 1000);
  await setRange(page, 'as-fontsize', 42);
  await beat(page, 1400);

  // caption a second slide so the batch story is visible
  await page.click('#as-strip [data-go="1"]');
  await beat(page, 900);
  await page.type('#as-caption', 'See your week at a glance', { delay: 45 });
  await beat(page, 1500);

  // ---- scene 6: backgrounds ----
  await mark('background');
  await page.evaluate(() => document.getElementById('as-bgpreset').scrollIntoView({ block: 'center', behavior: 'smooth' }));
  await beat(page, 800);
  for (const p of ['ink', 'dusk', 'sunrise', 'brand']) {
    await setSelect(page, 'as-bgpreset', p);
    await beat(page, 1100);
  }
  await setRange(page, 'as-pad', 13);
  await beat(page, 1300);

  // ---- scene 7: frame, or no frame ----
  await mark('frame');
  await page.evaluate(() => document.getElementById('as-frame').scrollIntoView({ block: 'center', behavior: 'smooth' }));
  await beat(page, 800);
  await page.click('#as-frame');           // off — the bare screenshot
  await beat(page, 2200);
  await page.click('#as-frame');           // back on
  await beat(page, 1600);

  // ---- scene 8: export, and why JPEG ----
  await mark('export');
  await page.evaluate(() => document.getElementById('as-fmt-png').scrollIntoView({ block: 'center', behavior: 'smooth' }));
  await beat(page, 700);
  await page.click('#as-fmt-png');
  await page.waitForSelector('#as-png-warn:not([hidden])', { timeout: 5000 });
  await beat(page, 3000);
  await page.click('#as-fmt-jpeg');
  await beat(page, 1400);

  await page.evaluate(() => document.getElementById('as-dl-all').scrollIntoView({ block: 'center', behavior: 'smooth' }));
  await beat(page, 800);
  await page.hover('#as-dl');
  await beat(page, 1000);
  await page.click('#as-dl');
  await beat(page, 1600);
  await page.hover('#as-dl-all');
  await beat(page, 1200);
  await page.click('#as-dl-all');
  await beat(page, 2600);
  await page.hover('.t-app-screenshot-generator .as-privacy');
  await beat(page, 2000);
}
