import { Worker } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';
import { redis } from '../config/redis';
import { getMonitorForWorker } from '../services/monitor.service';
import { createCheck, getLastNChecks } from '../services/check.service';
import { getOpenAlert, createAlert, autoResolveAlert } from '../services/alert.service';

export function startWorker(): Worker {
  const worker = new Worker('monitor-checks', async (job) => {
    const { monitorId } = job.data as { monitorId: string };

    try {
      const monitor = await getMonitorForWorker(monitorId);
      if (!monitor) return;

      const start = Date.now();
      let status: 'up' | 'down';
      let responseTimeMs: number | null = null;
      let statusCodeReceived: number | null = null;
      let failureReason: string | null = null;

      try {
        const response = await fetch(monitor.url, { signal: AbortSignal.timeout(10000) });
        responseTimeMs = Date.now() - start;
        statusCodeReceived = response.status;
        status = response.status === monitor.expected_status_code ? 'up' : 'down';
        if (status === 'down') failureReason = `unexpected_status_${response.status}`;
      } catch (err: unknown) {
        status = 'down';
        if (err instanceof Error) {
          if (err.name === 'TimeoutError' || err.name === 'AbortError') {
            failureReason = 'timeout';
          } else {
            const nodeErr = err as Error & { cause?: { code?: string } };
            if (nodeErr.cause?.code === 'ECONNREFUSED') failureReason = 'connection_refused';
            else failureReason = err.message;
          }
        } else {
          failureReason = 'unknown_error';
        }
      }

      await createCheck({
        monitor_id: monitorId, status, response_time_ms: responseTimeMs,
        status_code_received: statusCodeReceived, failure_reason: failureReason,
      });

      if (status === 'down') {
        const lastThree = await getLastNChecks(monitorId, 3);
        if (lastThree.length === 3 && lastThree.every(c => c.status === 'down')) {
          const open = await getOpenAlert(monitorId);
          if (!open) {
            await createAlert(monitorId);
            // TODO Layer 11: sseManager.broadcast(monitorId, { status: 'down', checkedAt: new Date().toISOString() })
          }
        }
      }

      if (status === 'up') {
        const open = await getOpenAlert(monitorId);
        if (open) {
          await autoResolveAlert(open.id);
          // TODO Layer 11: sseManager.broadcast(monitorId, { status: 'up', checkedAt: new Date().toISOString() })
        }
      }
    } catch (err) {
      console.error('Worker error for monitor', monitorId, err);
    }
  }, {
    connection: redis as unknown as ConnectionOptions,
    concurrency: 5,
    autorun: false,
  });

  worker.on('failed', (job, err) => {
    console.error('Job failed for monitor', job?.data.monitorId, err);
  });

  worker.run();
  return worker;
}
