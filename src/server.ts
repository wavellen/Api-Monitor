import app from './app';
import { config } from './config/env';
import { sql } from './config/db';
import { redis } from './config/redis';
import { startWorker } from './workers/monitor.worker';

async function start(): Promise<void> {
  try {
    await sql`SELECT 1`;
    await redis.ping();
    await app.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`Server running on port ${config.port}`);
    const worker = startWorker();
    console.log('Worker started');

    const gracefulShutdown = async () => {
      await app.close();
      await worker.close();
      await redis.quit();
      await sql.end();
      process.exit(0);
    };

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
