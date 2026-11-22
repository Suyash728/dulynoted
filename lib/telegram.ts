import type { RunResult } from './types';
import { formatTime } from './time';
import { actionCalendarUrl, eventCalendarUrl } from './gcal';

/**
 * Telegram delivery. Message building is pure (unit-tested); sending uses fetch with a timeout.
 * The bot token is only ever placed in the request URL — never logged or returned.
 */

const API = 'https://api.telegram.org';
const TIMEOUT_MS = 8_000;
const CLASH_PREFIX = '⚠ Clash:';

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

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
    .filter((line) => !line.startsWith(CLASH_PREFIX))
    .join('\n')
    .trim();
}

/** One Google Calendar template link per dated deadline and event. */
export function calendarLinks(run: RunResult): { label: string; url: string }[] {
  const x = run.extraction;
  if (!x) return [];
  const actions = x.actions.map((a) => ({ label: a.what, url: actionCalendarUrl(a, x.title) }));
  const events = x.events.map((e) => ({ label: e.title, url: eventCalendarUrl(e, x.title) }));
  return [...actions, ...events].filter((l): l is { label: string; url: string } => l.url !== null);
}

/** One message per Telegram chat; classes without their own chat go to the demo group. */
export function buildChatMessages(run: RunResult, demoChatId: string | undefined): ChatMessage[] {
  const byChat = new Map<string, string[]>();
  for (const r of run.recipients) {
    const chatId = r.chatId ?? demoChatId;
    if (!chatId) continue;
    byChat.set(chatId, [...(byChat.get(chatId) ?? []), r.audienceLabel]);
  }

  const title = run.extraction?.title ?? 'New circular';
  const body = escapeHtml(baseDigest(run));
  const calendarLines = calendarLinks(run).map(({ label, url }) => `➕ <a href="${escapeHtml(url)}">Add to Google Calendar: ${escapeHtml(label)}</a>`);
  // Credit Gemini only when Gemini really wrote this digest (COMPOSE step tier).
  const byGemini = run.steps.some((s) => s.step === 'COMPOSE' && s.tier === 'gemini');
  const footer = `Calendar file attached ⤵${byGemini ? ' · summarised by Gemini' : ''}`;

  return Array.from(byChat, ([chatId, labels]) => {
    const clashLines = run.clashes
      .filter((c) => labels.includes(c.audienceLabel))
      .map((c) => `${CLASH_PREFIX} ${escapeHtml(c.withTitle)} at ${formatTime(c.start)} (${escapeHtml(c.audienceLabel)})`);
    const html = [
      `📌 <b>DulyNoted · ${escapeHtml(title)}</b>`,
      `<i>For: ${escapeHtml(labels.join(', '))}</i>`,
      '',
      body,
      ...(clashLines.length ? ['', ...clashLines] : []),
      ...(calendarLines.length ? ['', ...calendarLines] : []),
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

export function sendDocument(token: string, chatId: string, file: { filename: string; body: string }, caption: string): Promise<TelegramResult> {
  const form = new FormData();
  form.set('chat_id', chatId);
  form.set('caption', caption);
  form.set('document', new Blob([file.body], { type: 'text/calendar' }), file.filename);
  return call(token, 'sendDocument', form);
}
