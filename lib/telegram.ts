import type { RunResult } from './types';
import { escapeHtml } from './html';
import { formatTime } from './time';
import { actionCalendarUrl, eventCalendarUrl } from './gcal';
import { describeClasses } from './class-names';
import { planDeadlineReminders } from './reminders';

/**
 * Telegram delivery. Message building is pure (unit-tested); sending uses fetch with a timeout.
 * The bot token is only ever placed in the request URL — never logged or returned.
 */

const API = 'https://api.telegram.org';
const TIMEOUT_MS = 8_000;
const CLASH_PREFIX = '⚠️ Timetable clash:';

export { escapeHtml };

/** Digest lines that carry a per-class clash note (re-added per chat, merged). */
const DIGEST_CLASH_LINE = /^⚠/;

export interface ChatMessage {
  chatId: string;
  labels: string[];
  html: string;
}

/** The digest without per-class clash lines (those are re-added per chat below). */
export function baseDigest(run: RunResult): string {
  const text = run.digests[0]?.text ?? run.extraction?.summary ?? '';
  return text
    .split('\n')
    .filter((line) => !DIGEST_CLASH_LINE.test(line))
    .join('\n')
    .trim();
}

export interface CalendarLink {
  label: string;
  when: string;
  url: string;
}

/** One Google Calendar template link per dated deadline and event, with a readable time. */
export function calendarLinks(run: RunResult): CalendarLink[] {
  const x = run.extraction;
  if (!x) return [];
  const actions = x.actions.map((a) => ({ label: a.what, at: a.deadline, url: actionCalendarUrl(a, x.title) }));
  const events = x.events.map((e) => ({ label: e.title, at: e.start, url: eventCalendarUrl(e, x.title) }));
  return [...actions, ...events].flatMap(({ label, at, url }) => (url && at ? [{ label, when: formatShort(at), url }] : []));
}

const shortFmt = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' });
/** "Tue, 24 Nov, 10:00 am" */
function formatShort(iso: string): string {
  return `${shortFmt.format(new Date(iso))}, ${formatTime(iso)}`;
}

/** Clashes for the given classes, merged per timetable entry: one line lists every affected division. */
function clashLines(run: RunResult, labels: string[]): string[] {
  const merged = new Map<string, { title: string; start: string; labels: string[] }>();
  for (const c of run.clashes) {
    if (!labels.includes(c.audienceLabel)) continue;
    const key = `${c.withTitle}|${c.start}`;
    const m = merged.get(key) ?? { title: c.withTitle, start: c.start, labels: [] };
    m.labels.push(c.audienceLabel);
    merged.set(key, m);
  }
  return Array.from(merged.values(), (m) =>
    `${CLASH_PREFIX} <b>${escapeHtml(m.title)}</b> is on ${formatShort(m.start)} for ${escapeHtml(describeClasses(m.labels))}`,
  );
}

/**
 * One message per Telegram chat; classes without their own chat go to the demo group.
 * Calendar = one-tap Google Calendar links (no file to download or import).
 */
export function buildChatMessages(run: RunResult, demoChatId: string | undefined, now: Date = new Date()): ChatMessage[] {
  const byChat = new Map<string, string[]>();
  for (const r of run.recipients) {
    const chatId = r.chatId ?? demoChatId;
    if (!chatId) continue;
    byChat.set(chatId, [...(byChat.get(chatId) ?? []), r.audienceLabel]);
  }

  const title = run.extraction?.title ?? 'New circular';
  const body = escapeHtml(baseDigest(run));
  const links = calendarLinks(run);
  const calendarBlock = links.length
    ? ['', '📅 <b>Add to your Google Calendar</b> (one tap each):', ...links.map((l) => `• <a href="${escapeHtml(l.url)}">${escapeHtml(l.label)}</a> — ${l.when}`)]
    : [];
  const remindLine = planDeadlineReminders(run, now).length ? ['', '⏰ This group will get a reminder 24 h before each deadline.'] : [];
  // Credit Gemini only when Gemini really wrote this digest (COMPOSE step tier).
  const byGemini = run.steps.some((s) => s.step === 'COMPOSE' && s.tier === 'gemini');
  const footer = `<i>Sent by DulyNoted${byGemini ? ' · summarised by Gemini' : ''}</i>`;
  const sizeOf = new Map(run.recipients.map((r) => [r.audienceLabel, r.size]));

  return Array.from(byChat, ([chatId, labels]) => {
    const students = labels.reduce((n, l) => n + (sizeOf.get(l) ?? 0), 0);
    const clashes = clashLines(run, labels);
    const html = [
      `📌 <b>${escapeHtml(title)}</b>`,
      `👥 <b>For:</b> ${escapeHtml(describeClasses(labels))} (${students} students)`,
      '',
      body,
      ...(clashes.length ? ['', ...clashes] : []),
      ...calendarBlock,
      ...remindLine,
      '',
      footer,
    ].join('\n');
    return { chatId, labels, html };
  });
}

export interface TelegramResult {
  ok: boolean;
  description?: string;
  messageId?: number;
}

async function call(token: string, method: string, body: BodyInit): Promise<TelegramResult> {
  try {
    const res = await fetch(`${API}/bot${token}/${method}`, { method: 'POST', body, signal: AbortSignal.timeout(TIMEOUT_MS) });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; description?: string; result?: { message_id?: number } } | null;
    return { ok: Boolean(json?.ok), description: json?.description ?? (res.ok ? undefined : `HTTP ${res.status}`), messageId: json?.result?.message_id };
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') return { ok: false, description: 'timeout' };
    // Only the error class/code is reported — the message could echo the URL, which contains the token.
    const cause = err instanceof Error ? (err.cause as { code?: string } | undefined)?.code ?? err.name : 'unknown';
    return { ok: false, description: `network error (${cause})` };
  }
}

export function sendMessage(token: string, chatId: string, html: string): Promise<TelegramResult> {
  const body = new URLSearchParams({ chat_id: chatId, text: html, parse_mode: 'HTML', disable_web_page_preview: 'true' });
  return call(token, 'sendMessage', body);
}
