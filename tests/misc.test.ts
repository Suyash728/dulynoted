import { describe, expect, it } from 'vitest';
import { renderDateTokens, isSampleId } from '@/lib/samples';
import { parseNdjsonChunk, upsertStep } from '@/lib/ndjson';
import { cleanText } from '@/lib/pipeline/ingest';
import { runInputSchema, extractionSchema } from '@/lib/schemas';
import { formatDeadline, toIstIso, istDate } from '@/lib/time';

describe('renderDateTokens', () => {
  const today = { year: 2026, month: 11, day: 29 };
  it('renders DD/MM/YYYY and ISO tokens across month ends', () => {
    expect(renderDateTokens('Date: {{D+0}} due {{D+5}} iso {{ISO:D+2}}', today)).toBe('Date: 29/11/2026 due 04/12/2026 iso 2026-12-01');
  });
  it('validates sample ids', () => {
    expect(isSampleId('workshop')).toBe(true);
    expect(isSampleId('../etc/passwd')).toBe(false);
  });
});

describe('time', () => {
  it('formats IST ISO with offset', () => expect(toIstIso(istDate(2026, 11, 27, 23, 59))).toBe('2026-11-27T23:59:00+05:30'));
  it('formats a relative deadline', () => {
    expect(formatDeadline('2026-11-25T17:00:00+05:30', new Date('2026-11-22T06:00:00Z'))).toBe('in 3 days · 25 Nov, 5:00 pm');
  });
});

describe('parseNdjsonChunk', () => {
  it('keeps the partial tail and skips bad lines', () => {
    const { events, rest } = parseNdjsonChunk('{"type":"error","error":"x"}\nnot json\n{"type":"err');
    expect(events).toEqual([{ type: 'error', error: 'x' }]);
    expect(rest).toBe('{"type":"err');
  });
  it('upserts by seq', () => {
    expect(upsertStep([{ seq: 1, v: 'a' }, { seq: 2, v: 'b' }], { seq: 1, v: 'c' })).toEqual([{ seq: 1, v: 'c' }, { seq: 2, v: 'b' }]);
  });
});

describe('input validation', () => {
  it('cleans whitespace but keeps line breaks', () => expect(cleanText('a\t\tb\r\n\n\n\nc  ')).toBe('a b\n\nc'));
  it('requires text or a sample', () => {
    expect(runInputSchema.safeParse({ inputType: 'text' }).success).toBe(false);
    expect(runInputSchema.safeParse({ inputType: 'text', sampleId: 'workshop' }).success).toBe(true);
    expect(runInputSchema.safeParse({ inputType: 'text', text: 'x'.repeat(20_001) }).success).toBe(false);
    expect(runInputSchema.safeParse({ inputType: 'text', sampleId: 'nope' }).success).toBe(false);
  });
  it('normalises model year spellings', () => {
    const r = extractionSchema.parse({ title: 't', audience: { years: ['T.E.', 'final year', 'se'] } });
    expect(r.audience.years).toEqual(['TE', 'BE', 'SE']);
    expect(r.actions).toEqual([]);
  });
});
