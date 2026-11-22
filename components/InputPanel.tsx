'use client';

import { useId } from 'react';
import { FileImage, FileText, Loader2, Paperclip, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { SampleId } from '@/lib/samples';

export interface SampleText {
  id: SampleId;
  label: string;
  text: string;
}

export interface SampleFile {
  id: SampleId;
  label: string;
  url: string;
  kind: 'pdf' | 'image';
}

export type InputMode = 'paste' | 'upload';

interface Props {
  samples: SampleText[];
  fileSamples: SampleFile[];
  mode: InputMode;
  text: string;
  file: File | null;
  fileError: string | null;
  maxChars: number;
  busy: boolean;
  activeSample: SampleId | null;
  onModeChange: (mode: InputMode) => void;
  onTextChange: (text: string) => void;
  onFileChange: (file: File | null) => void;
  onLoadSample: (id: SampleId) => void;
  onLoadFileSample: (sample: SampleFile) => void;
  onRun: () => void;
}

export function InputPanel(p: Props) {
  const fileInputId = useId();
  const ready = p.mode === 'paste' ? p.text.trim().length > 0 : p.file !== null && !p.fileError;

  return (
    <section aria-labelledby="input-title" className="flex flex-col gap-4 rounded-lg border bg-card p-4">
      <h2 id="input-title" className="text-sm font-semibold">
        1 · Drop in a circular
      </h2>

      <div role="group" aria-label="Sample circulars" className="flex flex-wrap gap-2">
        {p.samples.map((s) => {
          const active = p.mode === 'paste' && p.activeSample === s.id;
          return (
            <Button key={s.id} type="button" size="sm" variant={active ? 'default' : 'outline'} aria-pressed={active} disabled={p.busy} onClick={() => p.onLoadSample(s.id)}>
              <FileText aria-hidden className="h-3.5 w-3.5" />
              Load sample: {s.label}
            </Button>
          );
        })}
        {p.fileSamples.map((s) => {
          const active = p.mode === 'upload' && p.activeSample === s.id;
          const Icon = s.kind === 'pdf' ? FileText : FileImage;
          return (
            <Button key={s.url} type="button" size="sm" variant={active ? 'default' : 'outline'} aria-pressed={active} disabled={p.busy} onClick={() => p.onLoadFileSample(s)}>
              <Icon aria-hidden className="h-3.5 w-3.5" />
              {s.label}
            </Button>
          );
        })}
      </div>

      <Tabs value={p.mode} onValueChange={(v) => p.onModeChange(v as InputMode)}>
        <TabsList aria-label="Input type">
          <TabsTrigger value="paste">Paste</TabsTrigger>
          <TabsTrigger value="upload">Upload PDF / photo</TabsTrigger>
        </TabsList>

        <TabsContent value="paste" className="mt-3">
          <label htmlFor="circular-text" className="sr-only">
            Circular text
          </label>
          <Textarea
            id="circular-text"
            value={p.text}
            onChange={(e) => p.onTextChange(e.target.value.slice(0, p.maxChars))}
            placeholder="Paste a college notice, WhatsApp forward or circular here…"
            className="min-h-[260px] resize-y bg-background font-mono text-xs leading-relaxed"
            aria-describedby="circular-count"
            disabled={p.busy}
          />
          <p id="circular-count" className="mt-1 text-right text-[11px] text-muted-foreground">
            {p.text.length.toLocaleString('en-IN')} / {p.maxChars.toLocaleString('en-IN')} characters
          </p>
        </TabsContent>

        <TabsContent value="upload" className="mt-3 space-y-2">
          <label htmlFor={fileInputId} className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed bg-background px-4 py-8 text-center text-sm hover:bg-muted/50">
            <Paperclip aria-hidden className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Choose a PDF or photo of the notice</span>
            <span className="text-xs text-muted-foreground">PDF, PNG or JPG · up to 4 MB · scanned notices are read with OCR</span>
          </label>
          <input
            id={fileInputId}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
            className="sr-only"
            disabled={p.busy}
            aria-describedby="file-status"
            onChange={(e) => p.onFileChange(e.target.files?.[0] ?? null)}
          />
          <p id="file-status" role={p.fileError ? 'alert' : undefined} className={p.fileError ? 'text-sm text-red-800' : 'text-sm text-muted-foreground'}>
            {p.fileError ?? (p.file ? `Selected: ${p.file.name} (${Math.ceil(p.file.size / 1024)} KB)` : 'No file selected')}
          </p>
        </TabsContent>
      </Tabs>

      <Button type="button" onClick={p.onRun} disabled={p.busy || !ready} className="w-full">
        {p.busy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Play aria-hidden className="h-4 w-4" />}
        {p.busy ? 'Running automation…' : 'Run automation'}
      </Button>
    </section>
  );
}
