import { Info } from 'lucide-react';

const STEPS: [name: string, what: string, kind: 'AI' | 'Code' | 'Human'][] = [
  ['Read', 'Text, PDF text layer, or OCR for photos and scans', 'Code'],
  ['Extract', 'Actions, deadlines, events and audience as validated JSON', 'AI'],
  ['Resolve dates', '"tomorrow 5 pm" → exact IST time from the original wording', 'Code'],
  ['Find classes', 'Years, branches and divisions matched to the class list', 'Code'],
  ['Check timetable', 'Overlaps with each class’s existing exams and lectures', 'Code'],
  ['Write message', 'One short class-group message (template if AI is down)', 'AI'],
  ['Approve', 'Nothing is sent until a staff member clicks once', 'Human'],
  ['Deliver & remind', 'Telegram message + calendar file, reminders 24 h before', 'Code'],
];

const KIND_STYLE = {
  AI: 'bg-accent text-accent-foreground',
  Code: 'bg-muted text-foreground',
  Human: 'bg-emerald-50 text-emerald-900',
} as const;

/** Native <details> disclosure: keyboard and screen-reader accessible with no extra JS. */
export function HowItWorks() {
  return (
    <details className="group relative">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded text-sm font-medium text-primary underline-offset-4 hover:underline [&::-webkit-details-marker]:hidden">
        <Info aria-hidden className="h-4 w-4" />
        How it works
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-[min(92vw,26rem)] rounded-lg border bg-card p-4 text-sm shadow-lg">
        <p className="mb-3 text-muted-foreground">8 steps, 4 of them plain code — AI only where language needs understanding.</p>
        <ol className="space-y-2">
          {STEPS.map(([name, what, kind], i) => (
            <li key={name} className="flex gap-2">
              <span aria-hidden className="w-5 shrink-0 text-right font-mono text-xs leading-5 text-muted-foreground">
                {i + 1}
              </span>
              <span className="flex-1">
                <span className="font-semibold">{name}</span> — {what}
              </span>
              <span className={`h-fit rounded px-1.5 py-0.5 text-[11px] font-medium ${KIND_STYLE[kind]}`}>{kind}</span>
            </li>
          ))}
        </ol>
      </div>
    </details>
  );
}
