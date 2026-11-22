'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InputPanel, type InputMode, type SampleFile, type SampleText } from '@/components/InputPanel';
import { ResultPanel } from '@/components/ResultPanel';
import { RunLog } from '@/components/RunLog';
import { useRunStream } from '@/hooks/useRunStream';
import type { SampleId } from '@/lib/samples';

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const ACCEPTED = ['application/pdf', 'image/png', 'image/jpeg'];

function checkFile(file: File): string | null {
  if (!ACCEPTED.includes(file.type)) return 'Only PDF, PNG or JPG files are supported.';
  if (file.size > MAX_FILE_BYTES) return 'That file is larger than 4 MB.';
  return null;
}

interface Props {
  samples: SampleText[];
  fileSamples: SampleFile[];
  maxChars: number;
  /** Re-open a past run (from /history). */
  initialRunId?: string;
}

export function Workspace({ samples, fileSamples, maxChars, initialRunId }: Props) {
  const [mode, setMode] = useState<InputMode>('paste');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [activeSample, setActiveSample] = useState<SampleId | null>(null);
  const { state, start, approve, load, refresh } = useRunStream();
  const running = state.phase === 'running';
  const approving = state.phase === 'approving';

  useEffect(() => {
    if (initialRunId) void load(initialRunId);
  }, [initialRunId, load]);

  const loadSample = (id: SampleId) => {
    const s = samples.find((x) => x.id === id);
    if (!s) return;
    setMode('paste');
    setText(s.text);
    setActiveSample(id);
  };

  const loadFileSample = async (s: SampleFile) => {
    setMode('upload');
    setActiveSample(s.id);
    setFileError(null);
    try {
      const blob = await (await fetch(s.url)).blob();
      setFile(new File([blob], s.url.split('/').pop() ?? 'sample', { type: blob.type }));
    } catch {
      setFileError('Could not load the sample file.');
    }
  };

  const editText = (value: string) => {
    setText(value);
    // Once edited, it is no longer the sample — send the text itself.
    if (activeSample && value !== samples.find((x) => x.id === activeSample)?.text) setActiveSample(null);
  };

  const pickFile = (f: File | null) => {
    setFile(f);
    setActiveSample(null);
    setFileError(f ? checkFile(f) : null);
  };

  const run = () => {
    const body = new FormData();
    if (mode === 'upload' && file) {
      body.set('inputType', file.type === 'application/pdf' ? 'pdf' : 'image');
      body.set('file', file);
      if (activeSample) body.set('sampleId', activeSample); // cache key for the offline demo only
    } else {
      body.set('inputType', 'text');
      if (activeSample) body.set('sampleId', activeSample);
      else body.set('text', text);
    }
    void start(body);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)_minmax(0,5fr)]">
      <InputPanel
        samples={samples}
        fileSamples={fileSamples}
        mode={mode}
        text={text}
        file={file}
        fileError={fileError}
        maxChars={maxChars}
        busy={running || approving}
        activeSample={activeSample}
        onModeChange={setMode}
        onTextChange={editText}
        onFileChange={pickFile}
        onLoadSample={loadSample}
        onLoadFileSample={(s) => void loadFileSample(s)}
        onRun={run}
      />
      <div className="flex flex-col gap-4">
        {state.phase === 'error' && state.error && (
          <div role="alert" className="flex flex-col gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">
            <p className="flex items-start gap-2">
              <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              {state.error}
            </p>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={run}>
                <RotateCcw aria-hidden className="h-3.5 w-3.5" /> Retry
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => loadSample('workshop')}>
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
