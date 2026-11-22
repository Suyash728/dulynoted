import type { StreamEvent } from './types';

/**
 * Splits a growing NDJSON buffer into complete events.
 * Returns the parsed events and the unfinished tail to prepend to the next chunk.
 */
export function parseNdjsonChunk(buffer: string): { events: StreamEvent[]; rest: string } {
  const lines = buffer.split('\n');
  const rest = lines.pop() ?? '';
  const events: StreamEvent[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line) as StreamEvent);
    } catch {
      // A malformed line never breaks the stream; skip it.
    }
  }
  return { events, rest };
}

/** Upserts a step by seq so 'running' rows are replaced by their final state. */
export function upsertStep<T extends { seq: number }>(steps: T[], step: T): T[] {
  const i = steps.findIndex((s) => s.seq === step.seq);
  if (i === -1) return [...steps, step].sort((a, b) => a.seq - b.seq);
  const next = steps.slice();
  next[i] = step;
  return next;
}
