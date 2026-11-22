import type { Clash, Digest, Extraction, Recipient, TimeSaved } from '../types';
import { formatDeadline, formatTime } from '../time';

/** Pure helpers for COMPOSE: template fallback, per-audience clash lines, time-saved estimate. */

export const DIGEST_MAX_CHARS = 450;

export function clip(text: string, max = DIGEST_MAX_CHARS): string {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

/** Used when every LLM tier fails — built only from extracted fields. */
export function templateDigest(x: Extraction, now: Date = new Date()): string {
  const lines = [x.title];
  for (const a of x.actions) {
    lines.push(`• ${a.what}${a.deadline ? ` — due ${formatDeadline(a.deadline, now)}` : a.deadlineText ? ` — ${a.deadlineText}` : ''}`);
    if (a.requiredDocs.length) lines.push(`  Bring: ${a.requiredDocs.join(', ')}`);
  }
  for (const e of x.events) {
    lines.push(`• ${e.title}${e.start ? ` — ${formatDeadline(e.start, now)}` : e.dateText ? ` — ${e.dateText}` : ''}${e.venue ? `, ${e.venue}` : ''}`);
  }
  return clip(lines.join('\n'));
}

/** One digest per distinct clash situation: clash-free classes share the base text. */
export function buildDigests(base: string, recipients: Recipient[], clashes: Clash[]): Digest[] {
  const byLabel = new Map<string, string>();
  for (const r of recipients) {
    const own = clashes.filter((c) => c.audienceLabel === r.audienceLabel);
    const extra = own.map((c) => `⚠ Clash: ${c.withTitle} at ${formatTime(c.start)}`).join('\n');
    byLabel.set(r.audienceLabel, extra ? `${base}\n${extra}` : base);
  }
  const groups = new Map<string, string[]>();
  byLabel.forEach((text, label) => groups.set(text, [...(groups.get(text) ?? []), label]));
  return [...groups].map(([text, audienceLabels]) => ({ audienceLabels, text }));
}

/** Estimate from agents/graph.md, shown with its formula so judges can check it. */
export function estimateTimeSaved(x: Extraction, recipientGroups: number, durationMs: number): TimeSaved {
  const items = x.actions.length + x.events.length;
  const manualMin = Math.round(3 + 2 * recipientGroups + 1.5 * items + 2);
  return {
    manualMin,
    autoSec: Math.max(1, Math.round(durationMs / 1000)),
    formula: `3 min read + 2 min × ${recipientGroups} class groups + 1.5 min × ${items} dates/actions + 2 min timetable check`,
  };
}
