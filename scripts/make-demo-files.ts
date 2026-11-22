/**
 * Renders the seed circulars as realistic demo uploads (dates for today):
 *   public/samples/exam-form.pdf   — printed A4 notice (has a text layer → PDF text path)
 *   public/samples/scholarship.jpg — skewed off-white "phone photo" (→ Gemini OCR path)
 * Usage: CHROMIUM_PATH=/usr/bin/chromium npx tsx scripts/make-demo-files.ts   (re-run on demo day)
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { renderDateTokens } from '../lib/samples';

const root = process.cwd();
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const circular = async (file: string) => renderDateTokens(await readFile(path.join(root, 'seed/circulars', file), 'utf8'));

const printed = (text: string) => `<!doctype html><html><head><style>
  @page { size: A4; margin: 22mm 20mm; }
  body { font-family: 'Times New Roman', Georgia, serif; color: #111; font-size: 12.5pt; }
  pre { font-family: inherit; white-space: pre-wrap; line-height: 1.55; margin: 0; }
  .stamp { margin-top: 18mm; display: inline-block; border: 2px solid #1f3a8a; color: #1f3a8a; border-radius: 50%;
           padding: 14px 18px; transform: rotate(-12deg); font: bold 10pt Arial, sans-serif; opacity: .75; }
</style></head><body><pre>${esc(text)}</pre><div class="stamp">EXAM CELL<br/>SVCE</div></body></html>`;

const photo = (text: string) => `<!doctype html><html><head><style>
  body { margin: 0; background: #6b5b4a; width: 1100px; height: 900px; display: grid; place-items: center; }
  .paper { width: 880px; padding: 48px 56px; background: #f4efe3; transform: rotate(-2.2deg);
           box-shadow: 0 18px 40px rgba(0,0,0,.45); font: 21px/1.5 Georgia, serif; color: #222;
           background-image: linear-gradient(115deg, rgba(255,255,255,.35), rgba(0,0,0,.06)); }
  pre { font: inherit; white-space: pre-wrap; margin: 0; }
</style></head><body><div class="paper"><pre>${esc(text)}</pre></div></body></html>`;

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });

  await page.setContent(printed(await circular('exam-form.txt')));
  await page.pdf({ path: path.join(root, 'public/samples/exam-form.pdf'), format: 'A4', printBackground: true });

  await page.setContent(photo(await circular('scholarship.txt')));
  await page.screenshot({ path: path.join(root, 'public/samples/scholarship.jpg'), type: 'jpeg', quality: 72 });

  await browser.close();
  console.log('wrote public/samples/exam-form.pdf and public/samples/scholarship.jpg');
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
