import { isDatabaseConnected } from '../config/db.js';
import { recordAllUsersHealthSnapshots } from '../modules/health-history/health-history.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export function startHealthHistoryScheduler() {
  const run = async () => {
    if (!isDatabaseConnected()) return;
    try {
      const result = await recordAllUsersHealthSnapshots();
      console.log(`[HealthHistory] Recorded snapshots for ${result.usersProcessed} users (${result.month}).`);
    } catch (error) {
      console.error('[HealthHistory] Scheduled run failed:', error instanceof Error ? error.message : error);
    }
  };

  void run();
  const interval = setInterval(run, DAY_MS);
  return () => clearInterval(interval);
}
