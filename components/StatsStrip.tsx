import { AlertOctagon, Clock3, FileStack, Users } from 'lucide-react';
import type { DashboardStats } from '@/lib/stats';
import { formatMinutes } from '@/lib/stats';

/** KPI tiles. Numbers are aggregates over stored runs (lib/stats.ts). */
export function StatsStrip({ stats }: { stats: DashboardStats | null }) {
  if (!stats) return null;
  const tiles = [
    { icon: FileStack, label: 'Circulars processed', value: stats.circulars.toLocaleString('en-IN'), note: `${stats.delivered} delivered` },
    { icon: Users, label: 'Students reached', value: stats.studentsReached.toLocaleString('en-IN'), note: 'via delivered runs' },
    { icon: AlertOctagon, label: 'Timetable clashes caught', value: stats.clashesCaught.toLocaleString('en-IN'), note: 'before anyone was told' },
    { icon: Clock3, label: 'Manual work automated', value: formatMinutes(stats.minutesSaved), note: 'estimated, see formula' },
  ];
  return (
    <section aria-label="Dashboard statistics" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map(({ icon: Icon, label, value, note }) => (
        <div key={label} className="rounded-lg border bg-card p-3 shadow-sm">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Icon aria-hidden className="h-3.5 w-3.5" />
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
          <p className="text-[11px] text-muted-foreground">{note}</p>
        </div>
      ))}
    </section>
  );
}
