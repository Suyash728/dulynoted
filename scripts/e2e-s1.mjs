// Slice 1 browser check: sample → run → clash banner → screenshot, plus console errors and an axe a11y scan.
// Usage: node scripts/e2e-s1.mjs [BASE_URL]
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

const base = process.argv[2] ?? 'http://localhost:3000';
// CHROMIUM_PATH lets the check run with a system browser (e.g. /usr/bin/chromium).
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(base);
await page.getByRole('button', { name: 'Load sample: Workshop' }).click();
const t0 = Date.now();
await page.getByRole('button', { name: 'Run automation' }).click();
await page.getByText(/Timetable clash/).waitFor({ timeout: 45_000 });
console.log(`clash banner after ${Date.now() - t0} ms`);
await page.getByRole('button', { name: /Extract actions & dates/ }).click();
await page.screenshot({ path: 'docs/s1.png', fullPage: true });

const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
console.log(`axe violations: ${axe.violations.length}`);
for (const v of axe.violations) console.log(`  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length}) e.g. ${v.nodes[0]?.target}`);

await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: 'docs/s1-mobile.png', fullPage: true });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
console.log(`mobile horizontal overflow: ${overflow}`);
console.log(`console errors: ${errors.length}`);
errors.forEach((e) => console.log('  ' + e));
await browser.close();
process.exit(errors.length || axe.violations.length || overflow ? 1 : 0);
