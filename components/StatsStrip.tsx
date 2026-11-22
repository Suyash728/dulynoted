import { AlertOctagon, Clock3, FileStack, Users } from 'lucide-react';
import type { DashboardStats } from '@/lib/stats';
import { formatMinutes } from '@/lib/stats';

/** KPI tiles shown in the hero band. Numbers are aggregates over stored runs (lib/stats.ts). */
export function StatsStrip({ stats }: { stats: DashboardStats | null }) {
  if (!stats) return null;
  const tiles = [
    { icon: FileStack, label: 'Circulars processed', value: stats.circulars.toLocaleString('en-IN'), note: `${stats.delivered} delivered`, tint: 'bg-sky-400/20 text-sky-100' },
    { icon: Users, label: 'Students reached', value: stats.studentsReached.toLocaleString('en-IN'), note: 'through delivered runs', tint: 'bg-emerald-400/20 text-emerald-100' },
    { icon: AlertOctagon, label: 'Timetable clashes caught', value: stats.clashesCaught.toLocaleString('en-IN'), note: 'before anyone was told', tint: 'bg-rose-400/20 text-rose-100' },
    { icon: Clock3, label: 'Manual work automated', value: formatMinutes(stats.minutesSaved), note: 'estimate · see formula on each run', tint: 'bg-amber-400/20 text-amber-100' },
  ];
  return (
    <section aria-label="Dashboard statistics" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map(({ icon: Icon, label, value, note, tint }) => (
        <div key={label} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-indigo-100">{label}</p>
            <span aria-hidden className={`flex h-7 w-7 items-center justify-center rounded-lg ${tint}`}>
              <Icon className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
          <p className="text-[11px] text-indigo-200">{note}</p>
        </div>
      ))}
    </section>
  );
}
