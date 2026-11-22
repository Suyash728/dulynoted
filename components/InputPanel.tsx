'use client';

import { useEffect, useId, useState } from 'react';
import { FileImage, FileText, Loader2, Paperclip, Type, Zap } from 'lucide-react';
import { PanelHeader } from './PanelHeader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { SampleId } from '@/lib/samples';
import type { Scenario } from '@/lib/scenarios';
import { cn } from '@/lib/utils';

export interface SampleText {
  id: SampleId;
  label: string;
  text: string;
}

export type InputMode = 'paste' | 'upload';

interface Props {
  scenarios: readonly Scenario[];
  activeScenario: Scenario['hotkey'] | null;
  mode: InputMode;
  text: string;
  file: File | null;
  fileError: string | null;
  maxChars: number;
  busy: boolean;
  onModeChange: (mode: InputMode) => void;
  onTextChange: (text: string) => void;
  onFileChange: (file: File | null) => void;
  onScenario: (s: Scenario) => void;
  onRun: () => void;
}

const KIND_ICON = { text: Type, pdf: FileText, image: FileImage } as const;
const KIND_TINT = { text: 'bg-sky-50 text-sky-700 ring-sky-200', pdf: 'bg-rose-50 text-rose-700 ring-rose-200', image: 'bg-amber-50 text-amber-800 ring-amber-200' } as const;

/** Object URL preview for images; revoked whenever the file changes. */
function useImagePreview(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) return setUrl(null);
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}

export function InputPanel(p: Props) {
  const fileInputId = useId();
  const [dragging, setDragging] = useState(false);
  const preview = useImagePreview(p.file);
  const ready = p.mode === 'paste' ? p.text.trim().length > 0 : p.file !== null && !p.fileError;

  return (
    <section aria-labelledby="input-title" className="surface flex flex-col gap-4 p-5">
      <PanelHeader id="input-title" step={1} title="Drop in a circular" hint="Text, PDF or a phone photo of the notice" />

      <div>
        <p id="scenario-hint" className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Demo scenarios — press <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">1</kbd>–<kbd className="rounded border bg-muted px-1 font-mono text-[10px]">5</kbd>
        </p>
        <ul aria-describedby="scenario-hint" className="grid gap-2">
          {p.scenarios.map((s) => {
            const Icon = KIND_ICON[s.kind];
            const active = p.activeScenario === s.hotkey;
            return (
              <li key={s.hotkey}>
                <button
                  type="button"
                  onClick={() => p.onScenario(s)}
                  disabled={p.busy}
                  aria-pressed={active}
                  aria-keyshortcuts={s.hotkey}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-left text-sm transition-all hover:-translate-y-px hover:border-indigo-300 hover:shadow-md disabled:opacity-60 motion-reduce:transition-none motion-reduce:hover:translate-y-0',
                    active && 'border-indigo-400 bg-indigo-50/60 shadow-sm ring-1 ring-indigo-300',
                  )}
                >
                  <span aria-hidden className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1', KIND_TINT[s.kind])}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{s.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{s.tag}</span>
                  </span>
                  <kbd aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border bg-muted font-mono text-[11px] text-muted-foreground group-hover:border-indigo-300">
                    {s.hotkey}
                  </kbd>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <Tabs value={p.mode} onValueChange={(v) => p.onModeChange(v as InputMode)}>
        <TabsList aria-label="Input type" className="grid w-full grid-cols-2">
          <TabsTrigger value="paste">Paste text</TabsTrigger>
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
            className="min-h-[200px] resize-y rounded-xl bg-muted/40 font-mono text-xs leading-relaxed"
            aria-describedby="circular-count"
            disabled={p.busy}
          />
          <p id="circular-count" className="mt-1 text-right text-[11px] text-muted-foreground">
            {p.text.length.toLocaleString('en-IN')} / {p.maxChars.toLocaleString('en-IN')} characters
          </p>
        </TabsContent>

        <TabsContent value="upload" className="mt-3 space-y-2">
          <label
            htmlFor={fileInputId}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (!p.busy) p.onFileChange(e.dataTransfer.files?.[0] ?? null);
            }}
            className={cn(
              'flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed bg-background px-4 py-6 text-center text-sm transition-colors hover:bg-muted/50',
              dragging && 'border-primary bg-accent',
            )}
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
              <img src={preview} alt="Preview of the selected photo" className="max-h-36 rounded border object-contain shadow-sm" />
            ) : (
              <Paperclip aria-hidden className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="font-medium">{dragging ? 'Drop to upload' : 'Drag a PDF or photo here, or click to choose'}</span>
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

      <Button type="button" onClick={p.onRun} disabled={p.busy || !ready} aria-keyshortcuts="Control+Enter Meta+Enter" className="btn-glow btn-gradient h-11 w-full rounded-xl text-sm font-semibold shadow-md">
        {p.busy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Zap aria-hidden className="h-4 w-4" />}
        {p.busy ? 'Running automation…' : 'Run automation'}
        {!p.busy && (
          <kbd aria-hidden className="ml-auto rounded border border-white/30 px-1.5 font-mono text-[10px] opacity-80">
            Ctrl ↵
          </kbd>
        )}
      </Button>
    </section>
  );
}
