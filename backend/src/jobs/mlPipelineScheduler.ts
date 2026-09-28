import { isDatabaseConnected } from '../config/db.js';
import { runMlPipelineForAllUsers } from '../modules/ml-pipeline/ml-pipeline.service.js';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function startMlPipelineScheduler() {
  const run = async () => {
    if (!isDatabaseConnected()) return;
    try {
      const result = await runMlPipelineForAllUsers();
      const trained = result.trained ?? 0;
      const scanned = result.scanned ?? 0;
      if (trained > 0 || scanned > 0) {
        console.log(
          `[ML Pipeline] Processed ${result.usersProcessed} users — trained: ${trained}, scanned: ${scanned}.`
        );
      }
    } catch (error) {
      console.error('[ML Pipeline] Scheduled run failed:', error instanceof Error ? error.message : error);
    }
  };

  // First run after 2 minutes to allow DB + ML service startup
  setTimeout(() => void run(), 2 * 60 * 1000);
  const interval = setInterval(run, WEEK_MS);
  return () => clearInterval(interval);
}
