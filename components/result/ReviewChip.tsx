import { AlertTriangle } from 'lucide-react';

export function ReviewChip() {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">
      <AlertTriangle aria-hidden className="h-3 w-3" />
      check date
    </span>
  );
}
