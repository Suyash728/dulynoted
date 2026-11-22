import type { ReactNode } from 'react';

/** Panel title row: numbered gradient badge, heading and an optional right-hand slot. */
export function PanelHeader({ id, step, title, hint, right }: { id: string; step: number; title: ReactNode; hint?: string; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-semibold text-white shadow-sm">
          {step}
        </span>
        <div>
          <h2 id={id} className="text-sm font-semibold leading-tight">
            {title}
          </h2>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}
