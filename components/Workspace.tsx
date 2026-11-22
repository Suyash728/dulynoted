'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InputPanel, type InputMode, type SampleText } from '@/components/InputPanel';
import { ResultPanel } from '@/components/ResultPanel';
import { RunLog } from '@/components/RunLog';
import { useHotkeys } from '@/hooks/useHotkeys';
import { useRunStream } from '@/hooks/useRunStream';
import { SCENARIOS, type Scenario } from '@/lib/scenarios';

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const ACCEPTED = ['application/pdf', 'image/png', 'image/jpeg'];

function checkFile(file: File): string | null {
  if (!ACCEPTED.includes(file.type)) return 'Only PDF, PNG or JPG files are supported.';
  if (file.size > MAX_FILE_BYTES) return 'That file is larger than 4 MB.';
  return null;
}

interface Props {
  samples: SampleText[];
  maxChars: number;
  /** Re-open a past run (from /history). */
  initialRunId?: string;
}

export function Workspace({ samples, maxChars, initialRunId }: Props) {
  const [mode, setMode] = useState<InputMode>('paste');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const { state, start, approve, load, refresh } = useRunStream();
  const running = state.phase === 'running';
  const approving = state.phase === 'approving';
  const busy = running || approving;

  useEffect(() => {
    if (initialRunId) void load(initialRunId);
  }, [initialRunId, load]);

  const pickScenario = async (s: Scenario) => {
    setScenario(s);
    setFileError(null);
    if (s.kind === 'text') {
      setMode('paste');
      setText(samples.find((x) => x.id === s.sampleId)?.text ?? '');
      return;
    }
    setMode('upload');
    try {
      const blob = await (await fetch(s.url ?? '')).blob();
      setFile(new File([blob], (s.url ?? 'sample').split('/').pop() ?? 'sample', { type: blob.type }));
    } catch {
      setFileError('Could not load the sample file.');
    }
  };

  const editText = (value: string) => {
    setText(value);
    // Once edited, it is no longer the sample — send the text itself.
    if (scenario?.kind === 'text' && value !== samples.find((x) => x.id === scenario.sampleId)?.text) setScenario(null);
  };

  const pickFile = (f: File | null) => {
    setFile(f);
    setScenario(null);
    setFileError(f ? checkFile(f) : null);
  };

  const canRun = !busy && (mode === 'paste' ? text.trim().length > 0 : file !== null && !fileError);

  const run = () => {
    if (!canRun) return;
    const body = new FormData();
    const sampleId = scenario && (scenario.kind === 'text') === (mode === 'paste') ? scenario.sampleId : null;
    if (mode === 'upload' && file) {
      body.set('inputType', file.type === 'application/pdf' ? 'pdf' : 'image');
      body.set('file', file);
      if (sampleId) body.set('sampleId', sampleId); // cache key for the offline demo only
    } else {
      body.set('inputType', 'text');
      if (sampleId) body.set('sampleId', sampleId);
      else body.set('text', text);
    }
    void start(body);
  };

  useHotkeys({
    digit: (d) => {
      const s = SCENARIOS.find((x) => x.hotkey === d);
      if (s && !busy) void pickScenario(s);
    },
    submit: run,
  });

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)_minmax(0,5fr)]">
      <InputPanel
        scenarios={SCENARIOS}
        activeScenario={scenario?.hotkey ?? null}
        mode={mode}
        text={text}
        file={file}
        fileError={fileError}
        maxChars={maxChars}
        busy={busy}
        onModeChange={setMode}
        onTextChange={editText}
        onFileChange={pickFile}
        onScenario={(s) => void pickScenario(s)}
        onRun={run}
      />
      <div className="flex flex-col gap-4">
        {state.phase === 'error' && state.error && (
          <div role="alert" className="flex flex-col gap-2 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 shadow-sm">
            <p className="flex items-start gap-2">
              <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              {state.error}
            </p>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={run} disabled={!canRun}>
                <RotateCcw aria-hidden className="h-3.5 w-3.5" /> Retry
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => void pickScenario(SCENARIOS[0])}>
                Use sample instead
              </Button>
            </div>
          </div>
        )}
        <ResultPanel
          run={state.run}
          running={running}
          approving={approving}
          onApprove={() => state.run && void approve(state.run.id)}
          onRefresh={() => state.run && refresh(state.run.id)}
        />
      </div>
      <RunLog steps={state.steps} active={running} approving={approving} />
    </div>
  );
}
