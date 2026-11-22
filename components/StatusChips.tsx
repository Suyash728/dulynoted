import type { SystemStatus } from '@/lib/dashboard';
import { cn } from '@/lib/utils';

const CHIPS: { key: keyof SystemStatus; on: string; off: string }[] = [
  { key: 'database', on: 'Database connected', off: 'Database unreachable' },
  { key: 'telegram', on: 'Telegram bot configured', off: 'Telegram not configured' },
  { key: 'scheduler', on: 'Reminder scheduler configured', off: 'Scheduler not configured' },
];

/** Each chip reflects a real server-side check at page render — never a hard-coded "all good". */
export function StatusChips({ status }: { status: SystemStatus }) {
  return (
    <ul aria-label="System status" className="flex flex-wrap gap-1.5">
      {CHIPS.map((c) => {
        const ok = status[c.key];
        return (
          <li
            key={c.key}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium',
              ok ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-300 bg-amber-50 text-amber-900',
            )}
          >
            <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', ok ? 'bg-emerald-600' : 'bg-amber-600')} />
            {ok ? c.on : c.off}
          </li>
        );
      })}
    </ul>
  );
}
