import { Queue } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';
import { redis } from '../config/redis';

export const monitorQueue = new Queue('monitor-checks', { connection: redis as unknown as ConnectionOptions });

export async function scheduleMonitor(monitorId: string, intervalSeconds: number): Promise<void> {
  await monitorQueue.add('check', { monitorId }, {
    jobId: `monitor:${monitorId}`,
    repeat: { every: intervalSeconds * 1000 },
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
}

export async function removeMonitor(monitorId: string): Promise<void> {
  await monitorQueue.removeJobScheduler(`monitor:${monitorId}`);
}
