import { MAX_TEXT_CHARS } from '../schemas';

/** INGEST (text) — normalise line endings and whitespace, keep line breaks (they carry meaning in notices). */
export function cleanText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/[\t ]+/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_TEXT_CHARS);
}

export function describeText(text: string): string {
  const lines = text.split('\n').filter((l) => l.trim()).length;
  return `${text.length.toLocaleString('en-IN')} chars · ${lines} lines`;
}
