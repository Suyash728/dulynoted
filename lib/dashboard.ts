import 'server-only';
import { env } from './env';
import { listRecentRuns, type RunSummary } from './db';
import { summarizeRuns, type DashboardStats } from './stats';

/** Server-side data for the dashboard header: real stats + real configuration checks (no hard-coded status). */

export interface SystemStatus {
  database: boolean;
  telegram: boolean;
  scheduler: boolean;
}

export interface DashboardData {
  stats: DashboardStats | null;
  runs: RunSummary[];
  status: SystemStatus;
  pendingApprovals: number;
}

export async function loadDashboard(limit = 500): Promise<DashboardData> {
  const e = env();
  let runs: RunSummary[] = [];
  let database = true;
  try {
    runs = await listRecentRuns(limit);
  } catch {
    database = false;
  }
  return {
    runs,
    pendingApprovals: runs.filter((r) => r.status === 'awaiting_approval').length,
    stats: database ? summarizeRuns(runs) : null,
    status: {
      database,
      telegram: Boolean(e.TELEGRAM_BOT_TOKEN && e.TELEGRAM_DEMO_CHAT_ID),
      scheduler: Boolean(e.CRON_SECRET),
    },
  };
}
