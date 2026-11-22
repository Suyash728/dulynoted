import 'server-only';
import type { Extraction, Tier } from '../types';
import { chat } from '../llm';
import { digestSchema } from '../schemas';
import { formatDeadline } from '../time';
import { DIGEST_MAX_CHARS, clip, templateDigest } from './digest';

/** COMPOSE — one short LLM call for a friendly class-group message; template fallback never fails. */

const SYSTEM = `You write short WhatsApp/Telegram-style class-group announcements for college students.
Reply with JSON {"digest": string}. Rules: max ${DIGEST_MAX_CHARS} characters; plain text, no markdown, no emoji except at most one;
lead with what to do and by when; keep every date and time EXACTLY as given; list required documents briefly; no greeting or sign-off.`;

export interface ComposeResult {
  text: string;
  tier: Tier;
  model: string;
  ms: number;
  usedFallback: boolean;
}

/** Facts handed to the model use already-normalised dates so it never re-computes them. */
function facts(x: Extraction, now: Date): string {
  return JSON.stringify({
    title: x.title,
    summary: x.summary,
    actions: x.actions.map((a) => ({
      what: a.what,
      by: a.deadline ? formatDeadline(a.deadline, now) : a.deadlineText,
      where: a.location,
      bring: a.requiredDocs,
      fee: a.fee,
    })),
    events: x.events.map((e) => ({ title: e.title, when: e.start ? formatDeadline(e.start, now) : e.dateText, venue: e.venue })),
  });
}

export async function composeDigest(x: Extraction, cachedDigest: string | null, now: Date = new Date()): Promise<ComposeResult> {
  const started = Date.now();
  try {
    const res = await chat({
      task: 'compose',
      schema: digestSchema,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: facts(x, now) },
      ],
      cache: async () => (cachedDigest ? { digest: cachedDigest } : null),
    });
    return { text: clip(res.data.digest), tier: res.tier, model: res.model, ms: res.ms, usedFallback: false };
  } catch {
    return { text: templateDigest(x, now), tier: 'none', model: 'template', ms: Date.now() - started, usedFallback: true };
  }
}
