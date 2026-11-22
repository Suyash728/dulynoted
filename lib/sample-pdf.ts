import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';

/**
 * Renders a circular as a printed A4 notice (real text layer, so INGEST reads it without OCR).
 * Built per request so its dates are always relative to today.
 */
const A4: [number, number] = [595.28, 841.89];
const MARGIN = 56;

/** pdf-lib standard fonts are WinAnsi-encoded; replace the few characters they cannot draw. */
function winAnsi(text: string): string {
  return text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^\x09\x0a\x0d\x20-\x7e -ÿ—–•]/g, '');
}

function wrap(line: string, width: number, measure: (s: string) => number): string[] {
  if (measure(line) <= width) return [line];
  const out: string[] = [];
  let current = '';
  for (const word of line.split(' ')) {
    const next = current ? `${current} ${word}` : word;
    if (measure(next) > width && current) {
      out.push(current);
      current = word;
    } else current = next;
  }
  if (current) out.push(current);
  return out;
}

export async function renderNoticePdf(text: string, stamp: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle('College circular');
  const page = pdf.addPage(A4);
  const regular = await pdf.embedFont(StandardFonts.TimesRoman);
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const size = 12;
  const lineHeight = 17;
  const width = A4[0] - MARGIN * 2;

  let y = A4[1] - MARGIN;
  winAnsi(text)
    .split('\n')
    .forEach((raw, i) => {
      const font = i < 2 ? bold : regular; // institution header lines in bold
      const lines = raw.trim() ? wrap(raw, width, (s) => font.widthOfTextAtSize(s, size)) : [''];
      for (const line of lines) {
        page.drawText(line, { x: MARGIN, y, size, font, color: rgb(0.07, 0.07, 0.07) });
        y -= lineHeight;
      }
    });

  // Rubber-stamp look under the signature.
  const sx = MARGIN + 260;
  const sy = Math.max(y - 40, MARGIN + 40);
  page.drawEllipse({ x: sx, y: sy, xScale: 62, yScale: 30, borderColor: rgb(0.12, 0.23, 0.54), borderWidth: 2, opacity: 0, borderOpacity: 0.75 });
  page.drawText(stamp, { x: sx - 40, y: sy - 4, size: 11, font: bold, color: rgb(0.12, 0.23, 0.54), opacity: 0.75, rotate: degrees(-8) });

  return pdf.save();
}
