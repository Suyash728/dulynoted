'use client';

import { useEffect, useRef } from 'react';
import { Info, X } from 'lucide-react';

const STEPS: [name: string, what: string, kind: 'AI' | 'Code' | 'Human'][] = [
  ['Read', 'Text or PDF text layer; Gemini vision for photos and scans', 'Code'],
  ['Extract', 'Gemini returns actions, deadlines and audience as schema-checked JSON', 'AI'],
  ['Resolve dates', '"tomorrow 5 pm" → exact IST time from the original wording', 'Code'],
  ['Find classes', 'Years, branches and divisions matched to the class list', 'Code'],
  ['Check timetable', 'Overlaps with each class’s existing exams and lectures', 'Code'],
  ['Write message', 'Gemini writes one short class message (template if AI is down)', 'AI'],
  ['Approve', 'Nothing is sent until a staff member clicks once', 'Human'],
  ['Deliver & remind', 'Telegram message with Google Calendar links; reminder 24 h before', 'Code'],
];

const KIND_STYLE = {
  AI: 'bg-violet-100 text-violet-900',
  Code: 'bg-emerald-100 text-emerald-900',
  Human: 'bg-sky-100 text-sky-900',
} as const;

/** Native <details> disclosure (keyboard + screen-reader friendly), closed by Escape or an outside click. */
export function HowItWorks() {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const close = (e: Event) => {
      const el = ref.current;
      if (!el?.open) return;
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !el.contains(e.target as Node)) {
        el.open = false;
        if (e instanceof KeyboardEvent) el.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('keydown', close);
    document.addEventListener('mousedown', close);
    return () => {
      document.removeEventListener('keydown', close);
      document.removeEventListener('mousedown', close);
    };
  }, []);

  return (
    <details ref={ref} className="group relative">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white group-open:bg-white/15 group-open:text-white [&::-webkit-details-marker]:hidden">
        <Info aria-hidden className="h-4 w-4" />
        How it works
      </summary>
      <div className="absolute right-0 top-full z-[60] mt-3 w-[min(92vw,28rem)] rounded-2xl border border-border bg-card p-5 text-sm text-foreground shadow-2xl ring-1 ring-black/5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">How DulyNoted works</p>
            <p className="text-xs text-muted-foreground">8 steps — AI only where language needs understanding.</p>
          </div>
          <button
            type="button"
            onClick={() => ref.current && (ref.current.open = false)}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close how it works"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>
        <ol className="space-y-2.5">
          {STEPS.map(([name, what, kind], i) => (
            <li key={name} className="flex items-start gap-3">
              <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[11px] font-semibold text-white">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 leading-snug">
                <span className="font-medium">{name}</span>
                <span className="block text-xs text-muted-foreground">{what}</span>
              </span>
              <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${KIND_STYLE[kind]}`}>{kind}</span>
            </li>
          ))}
        </ol>
      </div>
    </details>
  );
}
