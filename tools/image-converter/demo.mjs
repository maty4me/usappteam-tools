/* Screen recording walkthrough for the Image Converter & Compressor.
 * 1280x720. Runs about 55 seconds. Marks match tool.json video.scenes.
 *
 * There is no OS file picker in a recording, so the demo synthesises real
 * PNG files inside the page (canvas -> Blob -> File), hands them to the
 * file input through a DataTransfer, and fires the change event the tool
 * already listens for. From the tool's point of view that is indistinguishable
 * from a human choosing four photos.
 */

const beat = (page, ms = 1000) => page.waitForTimeout(ms);

async function seedImages(page) {
  await page.evaluate(async () => {
    function draw(w, h, name, palette) {
      var c = document.createElement('canvas');
      c.width = w; c.height = h;
      var x = c.getContext('2d');

      var g = x.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, palette[0]);
      g.addColorStop(0.55, palette[1]);
      g.addColorStop(1, palette[2]);
      x.fillStyle = g;
      x.fillRect(0, 0, w, h);

      // Noise + soft shapes so the encoder has something photographic to chew on;
      // a flat gradient compresses unrealistically well and the savings would lie.
      for (var i = 0; i < 220; i++) {
        var r = 20 + Math.random() * (Math.min(w, h) / 3);
        x.globalAlpha = 0.05 + Math.random() * 0.16;
        x.fillStyle = palette[i % palette.length];
        x.beginPath();
        x.arc(Math.random() * w, Math.random() * h, r, 0, Math.PI * 2);
        x.fill();
      }
      x.globalAlpha = 1;

      var img = x.getImageData(0, 0, w, h);
      for (var p = 0; p < img.data.length; p += 4) {
        var n = (Math.random() - 0.5) * 26;
        img.data[p] = Math.max(0, Math.min(255, img.data[p] + n));
        img.data[p + 1] = Math.max(0, Math.min(255, img.data[p + 1] + n));
        img.data[p + 2] = Math.max(0, Math.min(255, img.data[p + 2] + n));
      }
      x.putImageData(img, 0, 0);

      // Seed as JPEG, not PNG. A camera or phone hands you a JPEG, so starting
      // from one keeps the savings shown on screen in a range a real user will
      // actually see — a lossless PNG source would flatter the tool wildly.
      return new Promise(function (res) {
        c.toBlob(function (b) {
          res(new File([b], name, { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.92);
      });
    }

    var files = await Promise.all([
      draw(2400, 1600, 'harbour-sunrise.jpg', ['#F4A24C', '#C7476B', '#2E3A6B']),
      draw(2000, 2000, 'studio-portrait.jpg', ['#3FC0E0', '#2380B8', '#12314A']),
      draw(1800, 1200, 'product-shot-01.jpg', ['#F2F5F8', '#B9C6D4', '#4E6076']),
      draw(2560, 1440, 'city-at-night.jpg', ['#1B2340', '#A83268', '#F0C36B'])
    ]);

    var dt = new DataTransfer();
    files.forEach(function (f) { dt.items.add(f); });
    var input = document.getElementById('ic-file');
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

export default async function demo(page, mark) {
  await page.waitForSelector('#ic-root');
  await page.evaluate(() => {
    document.getElementById('ic-root').scrollIntoView({ block: 'start' });
    window.scrollBy(0, -90);
  });
  await beat(page, 1200);

  // ---- scene 1: the promise — nothing is uploaded ----
  await mark('intro');
  await page.hover('.t-image-converter .ic-privacy');
  await beat(page, 4200);

  // ---- scene 2: a whole batch goes in at once ----
  await mark('load');
  await page.hover('#ic-drop');
  await beat(page, 1400);
  await seedImages(page);
  await page.waitForSelector('#ic-results:not([hidden])', { timeout: 20000 });
  await page.waitForFunction(
    () => document.querySelectorAll('#ic-rows [data-dl]').length >= 4,
    null,
    { timeout: 30000 }
  );
  await beat(page, 3200);

  // ---- scene 3: pick the output format ----
  await mark('format');
  await page.evaluate(() => document.getElementById('ic-formats').scrollIntoView({ block: 'center', behavior: 'smooth' }));
  await beat(page, 900);
  await page.click('#ic-fmt-png');
  await beat(page, 1600);
  await page.click('#ic-fmt-webp');
  await beat(page, 2200);
  await page.hover('#ic-fmt-note');
  await beat(page, 2600);

  // ---- scene 4: quality ----
  await mark('quality');
  await page.hover('#ic-quality');
  await beat(page, 800);
  for (const q of [70, 58, 45, 76]) {
    await page.evaluate((v) => {
      const el = document.getElementById('ic-quality');
      el.value = String(v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, q);
    await beat(page, 1100);
  }
  await beat(page, 2200);

  // ---- scene 5: resize, never upscaling ----
  await mark('resize');
  await page.click('#ic-rz-maxw');
  await beat(page, 1200);
  await page.fill('#ic-size', '1600');
  await page.dispatchEvent('#ic-size', 'change');
  await beat(page, 1200);
  await page.hover('#ic-rz-note');
  await beat(page, 2600);

  // Settings changes re-convert the batch from the originals — wait for that
  // pass to land so the numbers on screen match the settings on screen.
  await page.waitForFunction(
    () => document.getElementById('ic-progress').hidden
      && document.querySelectorAll('#ic-rows [data-dl]').length >= 4,
    null,
    { timeout: 30000 }
  );
  await beat(page, 1800);

  // ---- scene 6: read what you actually saved ----
  await mark('results');
  await page.evaluate(() => document.getElementById('ic-results').scrollIntoView({ block: 'center', behavior: 'smooth' }));
  await beat(page, 1200);
  await page.hover('#ic-total');
  await beat(page, 3200);
  await page.hover('#ic-rows .ic-row:nth-child(1) .ic-stats');
  await beat(page, 2400);
  await page.hover('#ic-rows .ic-row:nth-child(3) .ic-stats');
  await beat(page, 2600);

  // ---- scene 7: take the files away ----
  await mark('download');
  await page.hover('#ic-rows .ic-row:nth-child(1) .ic-dl');
  await beat(page, 1200);
  await page.click('#ic-rows .ic-row:nth-child(1) .ic-dl');
  await beat(page, 1800);
  await page.hover('#ic-download-all');
  await beat(page, 2600);
  await page.hover('.t-image-converter .ic-privacy');
  await beat(page, 2600);
}
