// Browser check of the demo path: sample → run → clash banner → approve (dry run) → delivered,
// plus console errors, an axe WCAG 2 AA scan and a 390 px mobile overflow check.
// Usage: node scripts/e2e.mjs [BASE_URL]   (CHROMIUM_PATH=/usr/bin/chromium to use a system browser)
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

const base = process.argv[2] ?? 'http://localhost:3000';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.message));
// Never message the real Telegram group from an automated test.
await page.route('**/api/runs/*/approve', (route) => route.continue({ url: `${route.request().url().split('?')[0]}?dryRun=1` }));

await page.goto(base);
await page.getByRole('button', { name: /Workshop circular/ }).click();
let t0 = Date.now();
await page.getByRole('button', { name: 'Run automation' }).click();
await page.getByText(/Timetable clashes? detected/).waitFor({ timeout: 45_000 });
console.log(`clash banner after ${Date.now() - t0} ms`);
await page.getByRole('button', { name: /Extract actions & dates/ }).click();
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: 'docs/s1.png', fullPage: true });

const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

t0 = Date.now();
await page.getByRole('button', { name: /Approve & send/ }).click();
await page.getByRole('status').filter({ hasText: /Dry run|Delivered/ }).waitFor({ timeout: 30_000 });
console.log(`delivered (dry run) after ${Date.now() - t0} ms`);
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: 'docs/s2.png', fullPage: true });
const icsHref = await page.getByRole('link', { name: /\.ics/ }).getAttribute('href');
const ics = await (await page.request.get(new URL(icsHref, base).toString())).text();
console.log(`ics download has alarms: ${ics.includes('BEGIN:VALARM')}`);

const axe2 = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
const violations = [...axe.violations, ...axe2.violations];

// Upload path: the phone-photo sample goes through Gemini OCR and reaches the approval gate.
t0 = Date.now();
await page.getByRole('button', { name: /Scholarship · phone photo/ }).click();
await page.getByText(/Selected: scholarship\.png/).waitFor();
await page.getByRole('button', { name: 'Run automation' }).click();
await page.getByRole('button', { name: /Approve & send to \d+ classes/ }).waitFor({ timeout: 60_000 });
console.log(`photo upload → awaiting approval after ${Date.now() - t0} ms`);
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: 'docs/s3-upload.png', fullPage: true });

await page.goto(`${base}/history`);
await page.getByRole('heading', { name: 'Run history' }).waitFor();
const axeHistory = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
violations.push(...axeHistory.violations);
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: 'docs/s3-history.png' });
console.log(`history axe violations: ${axeHistory.violations.length}`);

await page.setViewportSize({ width: 390, height: 844 });
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: 'docs/s1-mobile.png', fullPage: true });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
console.log(`mobile horizontal overflow: ${overflow}`);
console.log(`axe violations (all pages): ${violations.length}`);
for (const v of violations) console.log(`  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length}) e.g. ${v.nodes[0]?.target}`);
console.log(`console errors: ${errors.length}`);
errors.forEach((e) => console.log('  ' + e));
await browser.close();
process.exit(errors.length || violations.length || overflow || !ics.includes('BEGIN:VALARM') ? 1 : 0);
