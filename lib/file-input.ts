/** Upload validation: size cap, MIME allowlist and magic-byte sniffing (the browser's MIME is not trusted alone). */

export const MAX_FILE_BYTES = 4 * 1024 * 1024;

export type FileKind = 'pdf' | 'image';

export interface ValidFile {
  kind: FileKind;
  mime: 'application/pdf' | 'image/png' | 'image/jpeg';
  bytes: Uint8Array;
  name: string;
}

const startsWith = (bytes: Uint8Array, sig: number[]) => sig.every((b, i) => bytes[i] === b);

function sniff(bytes: Uint8Array): ValidFile['mime'] | null {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46])) return 'application/pdf'; // %PDF
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  return null;
}

export function validateFile(bytes: Uint8Array, name: string): { ok: true; file: ValidFile } | { ok: false; error: string } {
  if (bytes.byteLength === 0) return { ok: false, error: 'The file is empty' };
  if (bytes.byteLength > MAX_FILE_BYTES) return { ok: false, error: 'File is larger than 4 MB' };
  const mime = sniff(bytes);
  if (!mime) return { ok: false, error: 'Only PDF, PNG or JPG files are supported' };
  const safeName = name.replace(/[^\w.\- ]/g, '').slice(0, 80) || 'upload';
  return { ok: true, file: { kind: mime === 'application/pdf' ? 'pdf' : 'image', mime, bytes, name: safeName } };
}

export function toDataUrl(file: Pick<ValidFile, 'mime' | 'bytes'>): string {
  return `data:${file.mime};base64,${Buffer.from(file.bytes).toString('base64')}`;
}
