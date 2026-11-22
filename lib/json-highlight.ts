/** Tiny JSON tokenizer for the run-log detail view. Output is rendered as React text (auto-escaped). */

export type JsonTokenKind = 'key' | 'string' | 'number' | 'literal' | 'punct' | 'space';
export interface JsonToken {
  kind: JsonTokenKind;
  text: string;
}

const TOKEN = /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(true|false|null)|([{}[\],:])|(\s+)/g;

export function tokenizeJson(value: unknown): JsonToken[] {
  const text = JSON.stringify(value, null, 2) ?? 'undefined';
  const out: JsonToken[] = [];
  for (const m of Array.from(text.matchAll(TOKEN))) {
    if (m[1] !== undefined) {
      out.push({ kind: m[2] ? 'key' : 'string', text: m[1] });
      if (m[2]) out.push({ kind: 'punct', text: m[2] });
    } else if (m[3] !== undefined) out.push({ kind: 'number', text: m[3] });
    else if (m[4] !== undefined) out.push({ kind: 'literal', text: m[4] });
    else if (m[5] !== undefined) out.push({ kind: 'punct', text: m[5] });
    else out.push({ kind: 'space', text: m[0] });
  }
  return out;
}
