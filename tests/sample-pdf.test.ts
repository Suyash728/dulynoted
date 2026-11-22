import { describe, expect, it } from 'vitest';
import { extractText } from 'unpdf';
import { renderNoticePdf } from '@/lib/sample-pdf';
import { renderDateTokens } from '@/lib/samples';

describe('renderNoticePdf', () => {
  it('produces a PDF whose text layer carries the dates for the given day', async () => {
    const text = renderDateTokens('COLLEGE\nEXAM CELL\nFill the form on or before {{D+5}} — late fee Rs. 500/-', { year: 2027, month: 1, day: 30 });
    const bytes = await renderNoticePdf(text, 'EXAM CELL');
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe('%PDF');
    const { text: layer } = await extractText(new Uint8Array(bytes), { mergePages: true });
    expect(layer).toContain('on or before 04/02/2027');
  });
  it('drops characters the standard PDF font cannot draw instead of crashing', async () => {
    await expect(renderNoticePdf('Fee ₹500 📌 “quoted”', 'X')).resolves.toBeInstanceOf(Uint8Array);
  });
});
