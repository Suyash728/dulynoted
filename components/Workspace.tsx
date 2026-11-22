'use client';

import { useState } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InputPanel, type SampleText } from '@/components/InputPanel';
import { ResultPanel } from '@/components/ResultPanel';
import { RunLog } from '@/components/RunLog';
import { useRunStream } from '@/hooks/useRunStream';
import type { SampleId } from '@/lib/samples';

export function Workspace({ samples, maxChars }: { samples: SampleText[]; maxChars: number }) {
  const [text, setText] = useState('');
  const [activeSample, setActiveSample] = useState<SampleId | null>(null);
  const { state, start } = useRunStream();
  const running = state.phase === 'running';

  const loadSample = (id: SampleId) => {
    const s = samples.find((x) => x.id === id);
    if (!s) return;
    setText(s.text);
    setActiveSample(id);
  };

  const editText = (value: string) => {
    setText(value);
    // Once edited, it is no longer the sample — send the text itself.
    if (activeSample && value !== samples.find((x) => x.id === activeSample)?.text) setActiveSample(null);
  };

  const run = () => {
    const body = new FormData();
    body.set('inputType', 'text');
    if (activeSample) body.set('sampleId', activeSample);
    else body.set('text', text);
    void start(body);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)_minmax(0,5fr)]">
      <InputPanel
        samples={samples}
        text={text}
        maxChars={maxChars}
        running={running}
        activeSample={activeSample}
        onTextChange={editText}
        onLoadSample={loadSample}
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
              <Button type="button" size="sm" variant="outline" onClick={run} disabled={!text.trim()}>
                <RotateCcw aria-hidden className="h-3.5 w-3.5" /> Retry
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => loadSample('workshop')}>
                Use sample instead
              </Button>
            </div>
          </div>
        )}
        <ResultPanel run={state.run} running={running} />
      </div>
      <RunLog steps={state.steps} active={running} />
    </div>
  );
}
