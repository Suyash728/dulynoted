// The exact 90-second demo path, screenshotted step by step into docs/demo/.
// Usage: CHROMIUM_PATH=/usr/bin/chromium node scripts/demo-path.mjs [BASE_URL] [--dry-run]
// Step 6 really sends to the Telegram demo group unless --dry-run is given.
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'https://dulynoted.vercel.app';
const dryRun = process.argv.includes('--dry-run');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.message));
if (dryRun) await page.route('**/api/runs/*/approve', (r) => r.continue({ url: `${r.request().url().split('?')[0]}?dryRun=1` }));

const slow = [];
async function step(n, label, action) {
  const t0 = Date.now();
  await action();
  const ms = Date.now() - t0;
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `docs/demo/${n}-${label}.png`, fullPage: n !== 1 });
  console.log(`(${n}) ${label}: ${ms} ms`);
  if (ms > 5000) slow.push(`${n} ${label} (${ms} ms)`);
}

await step(1, 'open', () => page.goto(base));
await step(2, 'load-sample', () => page.getByRole('button', { name: /Workshop circular/ }).click());
await step(3, 'run', async () => {
  await page.getByRole('button', { name: 'Run automation' }).click();
  await page.getByText('Extract actions & dates').waitFor();
});
await step(4, 'clash', () => page.getByText(/Timetable clashes? detected/).waitFor({ timeout: 45_000 }));
await step(5, 'expand-extract', () => page.getByRole('button', { name: /Extract actions & dates/ }).click());
await step(6, 'approve', () => page.getByRole('button', { name: /Approve & send/ }).click());
await step(7, 'delivered', () => page.getByRole('status').filter({ hasText: /Delivered to|Dry run/ }).waitFor({ timeout: 30_000 }));
await step(8, 'download-ics', async () => {
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: 'Download .ics' }).click()]);
  console.log(`    downloaded ${download.suggestedFilename()}`);
});
await step(9, 'history', async () => {
  await page.getByRole('link', { name: 'History', exact: true }).click();
  await page.getByRole('heading', { name: 'Run history' }).waitFor();
});

console.log(`slow steps (> 5 s): ${slow.length ? slow.join(', ') : 'none'}`);
console.log(`console errors: ${errors.length}`);
errors.forEach((e) => console.log('  ' + e));
await browser.close();
process.exit(errors.length ? 1 : 0);
