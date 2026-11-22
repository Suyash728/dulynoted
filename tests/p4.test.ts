import { describe, expect, it } from 'vitest';
import { MAX_FILE_BYTES, toDataUrl, validateFile } from '@/lib/file-input';
import { bearerMatches } from '@/lib/auth';
import { DEMO_DELAY_MS, groupReminders, planDeadlineReminders, planDemoReminders } from '@/lib/reminders';
import { ocrMessages } from '@/lib/pipeline/ingest-file';
import { sampleRun } from './fixtures';

const bytes = (...b: number[]) => new Uint8Array([...b, 0, 0, 0, 0, 0, 0, 0, 0]);

describe('validateFile', () => {
  it('accepts PDF, PNG and JPEG by magic bytes', () => {
    expect(validateFile(bytes(0x25, 0x50, 0x44, 0x46), 'a.pdf')).toMatchObject({ ok: true, file: { kind: 'pdf', mime: 'application/pdf' } });
    expect(validateFile(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), 'a.png')).toMatchObject({ ok: true, file: { kind: 'image', mime: 'image/png' } });
    expect(validateFile(bytes(0xff, 0xd8, 0xff), 'a.jpg')).toMatchObject({ ok: true, file: { kind: 'image', mime: 'image/jpeg' } });
  });
  it('rejects a renamed text file, empty files and files over 4 MB', () => {
    expect(validateFile(new TextEncoder().encode('hello world'), 'fake.pdf')).toEqual({ ok: false, error: 'Only PDF, PNG or JPG files are supported' });
    expect(validateFile(new Uint8Array(), 'x.pdf').ok).toBe(false);
    expect(validateFile(new Uint8Array(MAX_FILE_BYTES + 1), 'big.pdf')).toEqual({ ok: false, error: 'File is larger than 4 MB' });
  });
  it('sanitises the file name', () => {
    const r = validateFile(bytes(0x25, 0x50, 0x44, 0x46), '../../<script>.pdf');
    expect(r.ok && r.file.name).toBe('....script.pdf');
  });
  it('builds a base64 data URL for OCR', () => {
    expect(toDataUrl({ mime: 'image/png', bytes: new Uint8Array([1, 2, 3]) })).toBe('data:image/png;base64,AQID');
    const msg = ocrMessages({ mime: 'image/png', bytes: new Uint8Array([1]) })[0];
    expect(JSON.stringify(msg.content)).toContain('"image_url":{"url":"data:image/png;base64,AQ=="}');
  });
});

describe('bearerMatches', () => {
  it('only accepts the exact secret', () => {
    expect(bearerMatches('Bearer s3cret', 's3cret')).toBe(true);
    expect(bearerMatches('Bearer s3cret2', 's3cret')).toBe(false);
    expect(bearerMatches('s3cret', 's3cret')).toBe(false);
    expect(bearerMatches(null, 's3cret')).toBe(false);
    expect(bearerMatches('Bearer ', undefined)).toBe(false);
  });
});

describe('reminders', () => {
  const run = sampleRun();
  it('plans one reminder per class 24 h before each future deadline', () => {
    const now = new Date('2026-11-22T06:00:00Z');
    const rows = planDeadlineReminders(run, now);
    expect(rows).toHaveLength(3); // 1 dated action × 3 classes
    expect(rows[0]).toMatchObject({ audience_label: 'TE AI&DS A', due_at: '2026-11-22T11:30:00.000Z' });
  });
  it('skips reminders whose time has passed', () => {
    expect(planDeadlineReminders(run, new Date('2026-11-23T00:00:00Z'))).toEqual([]);
  });
  it('schedules the demo reminder 60 s out for every class', () => {
    const now = new Date('2026-11-22T06:00:00Z');
    const rows = planDemoReminders(run, now);
    expect(rows).toHaveLength(3);
    expect(new Date(rows[0].due_at).getTime() - now.getTime()).toBe(DEMO_DELAY_MS);
    expect(rows[0].message).toMatch(/^Register — due tomorrow/);
  });
  it('groups due reminders into one escaped message per run and chat', () => {
    const due = [
      { id: 1, run_id: 'r1', audience_label: 'TE AI&DS A', message: 'Pay <fee>' },
      { id: 2, run_id: 'r1', audience_label: 'TE AI&DS B', message: 'Pay <fee>' },
      { id: 3, run_id: 'r1', audience_label: 'TE COMP A', message: 'Pay <fee>' },
    ];
    const batches = groupReminders(due, (l) => (l === 'TE COMP A' ? '-200' : '-100'));
    expect(batches.map((b) => [b.chatId, b.ids])).toEqual([['-100', [1, 2]], ['-200', [3]]]);
    expect(batches[0].html).toContain('• Pay &lt;fee&gt;');
    expect(batches[0].html.match(/Pay/g)).toHaveLength(1);
  });
});
