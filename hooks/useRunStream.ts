'use client';

import { useCallback, useRef, useState } from 'react';
import type { ApiEnvelope, RunResult, RunStep, StreamEvent } from '@/lib/types';
import { parseNdjsonChunk, upsertStep } from '@/lib/ndjson';

export type RunPhase = 'idle' | 'running' | 'approving' | 'done' | 'error';

export interface RunState {
  phase: RunPhase;
  steps: RunStep[];
  run: RunResult | null;
  error: string | null;
}

const INITIAL: RunState = { phase: 'idle', steps: [], run: null, error: null };

/** Streams the pipeline (POST /api/runs) and the approval (POST /api/runs/:id/approve) into one run log. */
export function useRunStream() {
  const [state, setState] = useState<RunState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  const apply = useCallback((ev: StreamEvent) => {
    setState((s) => {
      if (ev.type === 'step') return { ...s, steps: upsertStep(s.steps, ev.step) };
      if (ev.type === 'result') return { ...s, run: ev.run, steps: ev.run.steps.length ? ev.run.steps : s.steps };
      return { ...s, error: ev.error };
    });
  }, []);

  const stream = useCallback(
    async (url: string, init: RequestInit, phase: 'running' | 'approving') => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setState((s) => (phase === 'running' ? { ...INITIAL, phase } : { ...s, phase, error: null }));

      try {
        const res = await fetch(url, { ...init, signal: controller.signal });
        if (!res.ok || !res.body) {
          const env = (await res.json().catch(() => null)) as ApiEnvelope<never> | null;
          throw new Error(env?.error ?? `Request failed (${res.status})`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const parsed = parseNdjsonChunk(buffer + decoder.decode(value, { stream: true }));
          buffer = parsed.rest;
          parsed.events.forEach(apply);
        }
        parseNdjsonChunk(`${buffer}\n`).events.forEach(apply);
        setState((s) => ({ ...s, phase: s.error || s.run?.status === 'failed' ? 'error' : 'done' }));
      } catch (err) {
        if (controller.signal.aborted) return;
        setState((s) => ({ ...s, phase: 'error', error: err instanceof Error ? err.message : 'Something went wrong' }));
      }
    },
    [apply],
  );

  const start = useCallback((body: FormData) => stream('/api/runs', { method: 'POST', body }, 'running'), [stream]);

  const approve = useCallback(
    (runId: string, dryRun = false) =>
      stream(`/api/runs/${encodeURIComponent(runId)}/approve${dryRun ? '?dryRun=1' : ''}`, { method: 'POST' }, 'approving'),
    [stream],
  );

  /** Fetches a stored run (history links, reminder polling). Returns the run or null. */
  const refresh = useCallback(async (runId: string): Promise<RunResult | null> => {
    try {
      const res = await fetch(`/api/runs/${encodeURIComponent(runId)}`, { cache: 'no-store' });
      const env = (await res.json()) as ApiEnvelope<RunResult>;
      if (!env.success || !env.data) throw new Error(env.error ?? 'Run not found');
      const run = env.data;
      setState((s) => ({ ...s, run, steps: run.steps }));
      return run;
    } catch (err) {
      setState((s) => ({ ...s, error: err instanceof Error ? err.message : 'Could not load the run' }));
      return null;
    }
  }, []);

  const load = useCallback(
    async (runId: string) => {
      setState({ ...INITIAL, phase: 'running' });
      const run = await refresh(runId);
      setState((s) => ({ ...s, phase: run ? 'done' : 'error' }));
    },
    [refresh],
  );

  return { state, start, approve, load, refresh };
}
