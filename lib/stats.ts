/** Pure dashboard aggregates — every number shown in the KPI tiles comes from here. */

export interface RunStatsRow {
  status: string;
  students: number;
  clashes: number;
  manualMin: number | null;
}

export interface DashboardStats {
  circulars: number;
  delivered: number;
  studentsReached: number;
  clashesCaught: number;
  minutesSaved: number;
}

export function summarizeRuns(rows: RunStatsRow[]): DashboardStats {
  const delivered = rows.filter((r) => r.status === 'delivered');
  return {
    circulars: rows.length,
    delivered: delivered.length,
    studentsReached: delivered.reduce((s, r) => s + r.students, 0),
    clashesCaught: rows.reduce((s, r) => s + r.clashes, 0),
    minutesSaved: rows.reduce((s, r) => s + (r.manualMin ?? 0), 0),
  };
}

/** Share of manual time removed: 1 − automated seconds / manual seconds, as a whole percent (0–99). */
export function roiPercent(manualMin: number, autoSec: number): number {
  if (manualMin <= 0) return 0;
  const pct = Math.floor(100 * (1 - autoSec / (manualMin * 60)));
  return Math.max(0, Math.min(99, pct));
}

/** 563 → "9.4 h", 45 → "45 min" */
export function formatMinutes(min: number): string {
  return min >= 60 ? `${(min / 60).toFixed(1)} h` : `${min} min`;
}
