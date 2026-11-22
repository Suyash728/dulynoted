import { AlertOctagon } from 'lucide-react';
import type { Clash } from '@/lib/types';
import { formatDeadline } from '@/lib/time';

export function ClashBanner({ clashes }: { clashes: Clash[] }) {
  if (clashes.length === 0) return null;
  return (
    <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">
      <p className="flex items-center gap-2 font-semibold">
        <AlertOctagon aria-hidden className="h-4 w-4" />
        Timetable clash{clashes.length > 1 ? 'es' : ''} detected
      </p>
      <ul className="mt-1.5 space-y-1 pl-6">
        {clashes.map((c, i) => (
          <li key={i}>
            <strong>{c.eventTitle}</strong> clashes with <strong>{c.withTitle}</strong> — {c.audienceLabel}, {formatDeadline(c.start)}
          </li>
        ))}
      </ul>
    </div>
  );
}
