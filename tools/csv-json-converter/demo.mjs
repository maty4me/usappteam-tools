/* Screen recording walkthrough for the CSV to JSON Converter.
 * 1280x720. Runs about 56 seconds. Marks match tool.json video.scenes.
 *
 * The story is correctness under privacy: a small CSV carrying the two things
 * that break cheap converters — a quoted field with a comma in it, and a ZIP
 * code with a leading zero — goes in, and the preview proves both survived.
 */

const beat = (page, ms = 1000) => page.waitForTimeout(ms);

const MESSY_CSV = [
  'name,email,city,zip,orders,active,notes',
  'Ada Lovelace,ada@example.com,Boston,02134,12,true,"Prefers email, not phone"',
  '"Knuth, Donald",don@example.com,Palo Alto,94301,3,true,"Said ""ship it"" twice"',
  'Grace Hopper,grace@example.com,Arlington,22201,7,false,call back after 3pm',
].join('\n');

export default async function demo(page, mark) {
  await page.waitForSelector('#cj-root');
  await page.evaluate(() => {
    document.getElementById('cj-root').scrollIntoView({ block: 'start' });
  });
  await beat(page, 1400);

  // ---- scene 1: the promise — this runs on your machine ----
  await mark('intro');
  await page.hover('.t-csv-json-converter .cj-privacy');
  await beat(page, 5500);

  // ---- scene 2: paste a CSV that breaks cheap converters ----
  await mark('paste');
  await page.click('#cj-input');
  await beat(page, 700);
  await page.fill('#cj-input', MESSY_CSV);
  await beat(page, 1600);
  await page.hover('#cj-output');
  await beat(page, 5000);

  // ---- scene 3: the preview proves the parse ----
  await mark('preview');
  await page.evaluate(() => {
    document.getElementById('cj-table-wrap').scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
  await beat(page, 1400);
  await page.hover('#cj-table-wrap');
  await beat(page, 6500);

  // ---- scene 4: type inference, and what it deliberately leaves alone ----
  await mark('types');
  await page.evaluate(() => {
    document.getElementById('cj-opts').scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
  await beat(page, 1200);
  await page.click('#cj-types');
  await beat(page, 4200);
  await page.click('#cj-types');
  await beat(page, 3600);

  // ---- scene 5: the other direction, nested objects and all ----
  await mark('direction');
  await page.evaluate(() => {
    document.getElementById('cj-root').scrollIntoView({ block: 'start', behavior: 'smooth' });
  });
  await beat(page, 1200);
  await page.click('#cj-dir-j2c');
  await beat(page, 1400);
  await page.click('#cj-sample');
  await beat(page, 1600);
  await page.hover('#cj-output');
  await beat(page, 5000);
  await page.evaluate(() => {
    document.getElementById('cj-table-wrap').scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
  await beat(page, 4500);

  // ---- scene 6: take it away ----
  await mark('copy');
  await page.evaluate(() => {
    document.getElementById('cj-output').scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
  await beat(page, 1200);
  await page.hover('#cj-copy');
  await beat(page, 1000);
  await page.click('#cj-copy');
  await beat(page, 2000); // the "Copied" badge resets after 2.4s — stay inside it
  await page.hover('#cj-download');
  await beat(page, 2800);
  await beat(page, 1800);
}
