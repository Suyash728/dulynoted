'use client';

import { FileText, Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { SampleId } from '@/lib/samples';

export interface SampleText {
  id: SampleId;
  label: string;
  text: string;
}

interface Props {
  samples: SampleText[];
  text: string;
  maxChars: number;
  running: boolean;
  activeSample: SampleId | null;
  onTextChange: (text: string) => void;
  onLoadSample: (id: SampleId) => void;
  onRun: () => void;
}

export function InputPanel({ samples, text, maxChars, running, activeSample, onTextChange, onLoadSample, onRun }: Props) {
  const empty = text.trim().length === 0;

  return (
    <section aria-labelledby="input-title" className="flex flex-col gap-4 rounded-lg border bg-card p-4">
      <h2 id="input-title" className="text-sm font-semibold">
        1 · Drop in a circular
      </h2>

      <div role="group" aria-label="Sample circulars" className="flex flex-wrap gap-2">
        {samples.map((s) => (
          <Button
            key={s.id}
            type="button"
            variant={activeSample === s.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => onLoadSample(s.id)}
            disabled={running}
            aria-pressed={activeSample === s.id}
          >
            <FileText aria-hidden className="h-3.5 w-3.5" />
            Load sample: {s.label}
          </Button>
        ))}
      </div>

      <Tabs defaultValue="paste">
        <TabsList aria-label="Input type">
          <TabsTrigger value="paste">Paste</TabsTrigger>
          <TabsTrigger value="upload" disabled>
            Upload (coming soon)
          </TabsTrigger>
        </TabsList>
        <TabsContent value="paste" className="mt-3">
          <label htmlFor="circular-text" className="sr-only">
            Circular text
          </label>
          <Textarea
            id="circular-text"
            value={text}
            onChange={(e) => onTextChange(e.target.value.slice(0, maxChars))}
            placeholder="Paste a college notice, WhatsApp forward or circular here…"
            className="min-h-[260px] resize-y bg-background font-mono text-xs leading-relaxed"
            aria-describedby="circular-count"
            disabled={running}
          />
          <p id="circular-count" className="mt-1 text-right text-[11px] text-muted-foreground">
            {text.length.toLocaleString('en-IN')} / {maxChars.toLocaleString('en-IN')} characters
          </p>
        </TabsContent>
      </Tabs>

      <Button type="button" onClick={onRun} disabled={running || empty} className="w-full">
        {running ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Play aria-hidden className="h-4 w-4" />}
        {running ? 'Running automation…' : 'Run automation'}
      </Button>
    </section>
  );
}
