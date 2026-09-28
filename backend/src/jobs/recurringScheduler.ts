import { isDatabaseConnected } from '../config/db.js';
import { processRecurringForAllUsers } from '../modules/recurring/recurring.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export function startRecurringScheduler() {
  const run = async () => {
    if (!isDatabaseConnected()) return;
    try {
      const result = await processRecurringForAllUsers();
      if (result.totalCreated > 0) {
        console.log(
          `[Recurring] Created ${result.totalCreated} entries for ${result.usersProcessed} users (${result.month}).`
        );
      }
    } catch (error) {
      console.error('[Recurring] Scheduled run failed:', error instanceof Error ? error.message : error);
    }
  };

  void run();
  const interval = setInterval(run, DAY_MS);

  return () => clearInterval(interval);
}
