import { Users } from 'lucide-react';
import type { Recipient } from '@/lib/types';

export function AudienceChips({ recipients }: { recipients: Recipient[] }) {
  const total = recipients.reduce((s, r) => s + r.size, 0);
  return (
    <div>
      <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Users aria-hidden className="h-4 w-4" />
        For {recipients.length} classes · {total} students
      </p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {recipients.map((r) => (
          <li key={r.audienceLabel} className="rounded-full border bg-accent px-2.5 py-0.5 text-xs text-accent-foreground">
            {r.audienceLabel} <span className="text-muted-foreground">· {r.size}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
