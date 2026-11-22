/** Pure Asia/Kolkata (UTC+05:30, no DST) date helpers. Safe on server and client. */

export const IST_OFFSET_MIN = 330;
const IST_OFFSET_MS = IST_OFFSET_MIN * 60_000;
const pad = (n: number) => String(n).padStart(2, '0');

export interface YMD {
  year: number;
  month: number; // 1-12
  day: number;
}

/** Calendar date in IST for an instant. */
export function istYmd(at: Date = new Date()): YMD {
  const shifted = new Date(at.getTime() + IST_OFFSET_MS);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

/** The instant for a wall-clock time in IST. */
export function istDate(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - IST_OFFSET_MS);
}

export function addDays(ymd: YMD, days: number): YMD {
  return istYmd(new Date(istDate(ymd.year, ymd.month, ymd.day, 12).getTime() + days * 86_400_000));
}

/** ISO 8601 with an explicit +05:30 offset, e.g. 2026-11-27T23:59:00+05:30 */
export function toIstIso(at: Date): string {
  const s = new Date(at.getTime() + IST_OFFSET_MS);
  return (
    `${s.getUTCFullYear()}-${pad(s.getUTCMonth() + 1)}-${pad(s.getUTCDate())}` +
    `T${pad(s.getUTCHours())}:${pad(s.getUTCMinutes())}:00+05:30`
  );
}

export const formatDMY = (d: YMD) => `${pad(d.day)}/${pad(d.month)}/${d.year}`;
export const formatYMD = (d: YMD) => `${d.year}-${pad(d.month)}-${pad(d.day)}`;

/** Parses YYYY-MM-DD; returns null for anything else. */
export function parseYMD(value: string | null | undefined): YMD | null {
  const m = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const ymd = { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  return ymd.month >= 1 && ymd.month <= 12 && ymd.day >= 1 && ymd.day <= 31 ? ymd : null;
}

function dayNumber(d: YMD): number {
  return Math.round(Date.UTC(d.year, d.month - 1, d.day) / 86_400_000);
}

/** "today" | "tomorrow" | "in 3 days" | "yesterday" | "2 days ago" — by IST calendar day. */
export function relativeDay(target: Date, now: Date = new Date()): string {
  const diff = dayNumber(istYmd(target)) - dayNumber(istYmd(now));
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff === -1) return 'yesterday';
  return diff > 0 ? `in ${diff} days` : `${-diff} days ago`;
}

const dateFmt = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' });
const timeFmt = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true });

/** "in 3 days · 27 Nov, 11:59 pm" */
export function formatDeadline(iso: string, now: Date = new Date()): string {
  const at = new Date(iso);
  return `${relativeDay(at, now)} · ${dateFmt.format(at)}, ${timeFmt.format(at).toLowerCase()}`;
}

export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso)).toLowerCase();
}
