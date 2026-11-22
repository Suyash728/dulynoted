import type { SystemStatus } from '@/lib/dashboard';
import { cn } from '@/lib/utils';

const CHIPS: { key: keyof SystemStatus; on: string; off: string }[] = [
  { key: 'database', on: 'Database connected', off: 'Database unreachable' },
  { key: 'telegram', on: 'Telegram bot ready', off: 'Telegram not configured' },
  { key: 'scheduler', on: 'Reminder scheduler ready', off: 'Scheduler not configured' },
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
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 backdrop-blur',
              ok ? 'bg-emerald-400/15 text-emerald-50 ring-emerald-300/30' : 'bg-amber-400/20 text-amber-50 ring-amber-300/40',
            )}
          >
            <span aria-hidden className="relative flex h-2 w-2">
              {ok && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-60 motion-reduce:hidden" />}
              <span className={cn('relative inline-flex h-2 w-2 rounded-full', ok ? 'bg-emerald-300' : 'bg-amber-300')} />
            </span>
            {ok ? c.on : c.off}
          </li>
        );
      })}
    </ul>
  );
}
