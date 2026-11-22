import 'server-only';
import type { RunStep, StepName, StepStatus, StreamEvent, Tier } from '../types';
import { LlmUnavailableError } from '../llm';
import { insertStep } from '../db';

/**
 * Emits RunSteps to the stream ('running' then final) and persists each final step.
 * Inserts run in the background and are awaited once in flush(), so the stream never waits on the DB.
 */

export interface StepOutcome<T> {
  status: Exclude<StepStatus, 'running'>;
  output: string;
  value: T;
  detail?: unknown;
  tier?: Tier;
  model?: string;
}

/** A step failure the user should read verbatim. */
export class StepError extends Error {}

export class Recorder {
  private seq: number;
  private pending: Promise<void>[] = [];
  readonly steps: RunStep[] = [];

  /** startSeq: last seq already stored for this run (approval continues the same log). */
  constructor(
    readonly runId: string,
    startSeq = 0,
  ) {
    this.seq = startSeq;
  }

  private make(step: StepName, status: StepStatus, input: string, extra: Partial<RunStep> = {}): RunStep {
    return { runId: this.runId, seq: this.seq, step, status, input, output: '', at: new Date().toISOString(), ...extra };
  }

  /** Persist without blocking the stream; flushed once before the run finishes. */
  private save(step: RunStep) {
    this.steps.push(step);
    this.pending.push(insertStep(step));
  }

  async *run<T>(name: StepName, input: string, fn: () => Promise<StepOutcome<T>>): AsyncGenerator<StreamEvent, T> {
    this.seq += 1;
    const started = Date.now();
    yield { type: 'step', step: this.make(name, 'running', input) };
    try {
      const out = await fn();
      const step = this.make(name, out.status, input, {
        output: out.output,
        detail: out.detail,
        tier: out.tier,
        model: out.model,
        ms: Date.now() - started,
      });
      this.save(step);
      yield { type: 'step', step };
      return out.value;
    } catch (err) {
      const message = err instanceof StepError ? err.message : `${name} failed unexpectedly — please retry or load a sample.`;
      const step = this.make(name, 'error', input, {
        output: message,
        detail: err instanceof LlmUnavailableError ? { attempts: err.attempts } : undefined,
        ms: Date.now() - started,
      });
      this.save(step);
      yield { type: 'step', step };
      throw new StepError(message);
    }
  }

  /** A step that already happened inside another one (REPAIR). */
  *note(name: StepName, status: Exclude<StepStatus, 'running'>, input: string, output: string, extra: Partial<RunStep>): Generator<StreamEvent> {
    this.seq += 1;
    const step = this.make(name, status, input, { output, ...extra });
    this.save(step);
    yield { type: 'step', step };
  }

  async flush(): Promise<void> {
    const results = await Promise.allSettled(this.pending);
    this.pending = [];
    const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (failed) console.error('[run] step persistence failed:', failed.reason instanceof Error ? failed.reason.message : 'unknown');
  }
}
