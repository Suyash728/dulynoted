import { addDays, formatDMY, formatYMD, istYmd, type YMD } from './time';

export const SAMPLE_IDS = ['workshop', 'exam-form', 'scholarship'] as const;
export type SampleId = (typeof SAMPLE_IDS)[number];

export interface Sample {
  id: SampleId;
  label: string;
  file: string; // relative to seed/circulars
}

export const SAMPLES: readonly Sample[] = [
  { id: 'workshop', label: 'Workshop', file: 'workshop.txt' },
  { id: 'exam-form', label: 'Exam form', file: 'exam-form.txt' },
  { id: 'scholarship', label: 'Scholarship', file: 'scholarship.txt' },
];

export function isSampleId(value: unknown): value is SampleId {
  return typeof value === 'string' && (SAMPLE_IDS as readonly string[]).includes(value);
}

/**
 * Renders relative date tokens so seed data is valid on any day.
 *   {{D+n}}     → DD/MM/YYYY   (how a printed notice writes dates)
 *   {{ISO:D+n}} → YYYY-MM-DD   (used inside cached fixtures)
 */
export function renderDateTokens(text: string, today: YMD = istYmd()): string {
  return text.replace(/\{\{(ISO:)?D([+-]\d+)\}\}/g, (_, iso: string | undefined, offset: string) => {
    const day = addDays(today, Number(offset));
    return iso ? formatYMD(day) : formatDMY(day);
  });
}

function dayDiff(a: YMD, b: YMD): number {
  return Math.round((Date.UTC(a.year, a.month - 1, a.day) - Date.UTC(b.year, b.month - 1, b.day)) / 86_400_000);
}

/** Inverse of renderDateTokens: turns concrete dates back into tokens relative to `today` (used to build fixtures). */
export function tokenizeDates(text: string, today: YMD = istYmd()): string {
  const token = (d: YMD, iso: boolean) => {
    const n = dayDiff(d, today);
    return `{{${iso ? 'ISO:' : ''}D${n >= 0 ? '+' : ''}${n}}}`;
  };
  return text
    .replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (_, y: string, m: string, d: string) => token({ year: +y, month: +m, day: +d }, true))
    .replace(/\b(\d{2})\/(\d{2})\/(\d{4})\b/g, (_, d: string, m: string, y: string) => token({ year: +y, month: +m, day: +d }, false));
}
