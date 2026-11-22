import 'server-only';
import { extractText } from 'unpdf';
import { z } from 'zod';
import type { Tier } from '../types';
import { chat, type Message } from '../llm';
import { toDataUrl, type ValidFile } from '../file-input';

/** INGEST for files: PDF text layer first (free, exact); scanned PDFs and photos go to Gemini OCR. */

export const MIN_PDF_TEXT_CHARS = 40;

const OCR_PROMPT =
  'Transcribe this college notice exactly as printed. Keep the original line breaks, numbering and dates. ' +
  'Do not summarise, translate or correct anything. Reply as JSON {"text": string}.';

const ocrSchema = z.object({ text: z.string().trim().min(20) });

export interface FileText {
  text: string;
  method: 'pdf-text' | 'ocr';
  tier?: Tier;
  model?: string;
}

export function ocrMessages(file: Pick<ValidFile, 'mime' | 'bytes'>): Message[] {
  return [
    {
      role: 'user',
      content: [
        { type: 'text', text: OCR_PROMPT },
        { type: 'image_url', image_url: { url: toDataUrl(file) } },
      ],
    },
  ];
}

async function pdfText(bytes: Uint8Array): Promise<string> {
  try {
    // unpdf may detach the buffer it receives, so hand it a copy.
    const { text } = await extractText(new Uint8Array(bytes), { mergePages: true });
    return text.trim();
  } catch {
    return '';
  }
}

/** `cachedText` = the known sample's text, used only when OCR is unavailable (offline demo). */
export async function readFileText(file: ValidFile, cachedText: string | null): Promise<FileText> {
  if (file.kind === 'pdf') {
    const text = await pdfText(file.bytes);
    if (text.length >= MIN_PDF_TEXT_CHARS) return { text, method: 'pdf-text' };
  }
  const res = await chat({
    task: 'ocr',
    schema: ocrSchema,
    messages: ocrMessages(file),
    cache: cachedText ? async () => ({ text: cachedText }) : undefined,
  });
  return { text: res.data.text, method: 'ocr', tier: res.tier, model: res.model };
}
