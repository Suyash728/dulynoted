import { describe, expect, it } from 'vitest';
import { formatMinutes, roiPercent, summarizeRuns } from '@/lib/stats';
import { tokenizeJson } from '@/lib/json-highlight';
import { engineLabel, stepKind } from '@/lib/step-kind';

describe('summarizeRuns', () => {
  it('counts students only for delivered runs, clashes and minutes for all', () => {
    const s = summarizeRuns([
      { status: 'delivered', students: 184, clashes: 2, manualMin: 19 },
      { status: 'awaiting_approval', students: 252, clashes: 0, manualMin: 18 },
      { status: 'failed', students: 0, clashes: 0, manualMin: null },
    ]);
    expect(s).toEqual({ circulars: 3, delivered: 1, studentsReached: 184, clashesCaught: 2, minutesSaved: 37 });
  });
});

describe('roiPercent / formatMinutes', () => {
  it('computes the share of manual time removed', () => {
    expect(roiPercent(19, 3)).toBe(99); // 1 - 3/1140 = 99.7 → floor, capped at 99
    expect(roiPercent(10, 60)).toBe(90);
    expect(roiPercent(0, 5)).toBe(0);
    expect(roiPercent(1, 120)).toBe(0);
  });
  it('formats minutes and hours', () => {
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(563)).toBe('9.4 h');
  });
});

describe('tokenizeJson', () => {
  it('classifies keys, strings, numbers and literals and round-trips the text', () => {
    const value = { a: '<b>"x"</b>', n: -1.5, ok: true, z: null };
    const tokens = tokenizeJson(value);
    expect(tokens.map((t) => t.text).join('')).toBe(JSON.stringify(value, null, 2));
    expect(tokens.find((t) => t.kind === 'key')?.text).toBe('"a"');
    expect(tokens.filter((t) => t.kind === 'literal').map((t) => t.text)).toEqual(['true', 'null']);
    expect(tokens.find((t) => t.kind === 'number')?.text).toBe('-1.5');
  });
});

describe('stepKind / engineLabel', () => {
  it('tags AI, code and human steps', () => {
    expect(stepKind({ step: 'EXTRACT', tier: 'groq' })).toBe('AI');
    expect(stepKind({ step: 'CLASH_CHECK' })).toBe('Code');
    expect(stepKind({ step: 'APPROVE' })).toBe('Human');
    expect(stepKind({ step: 'INGEST', tier: 'gemini' })).toBe('AI');
    expect(stepKind({ step: 'INGEST' })).toBe('Code');
    expect(stepKind({ step: 'COMPOSE', tier: 'none' })).toBe('Code');
  });
  it('labels engines', () => {
    expect(engineLabel({ step: 'EXTRACT', tier: 'groq', model: 'openai/gpt-oss-120b' })).toBe('Groq 120B');
    expect(engineLabel({ step: 'COMPOSE', tier: 'groq', model: 'openai/gpt-oss-20b' })).toBe('Groq 20B');
    expect(engineLabel({ step: 'NORMALIZE_DATES' })).toBe('chrono-node');
    expect(engineLabel({ step: 'EXTRACT', tier: 'cache' })).toBe('Cache');
  });
});
