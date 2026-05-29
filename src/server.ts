import app from './app';
import { config } from './config/env';
import { sql } from './config/db';
import { redis } from './config/redis';

async function start(): Promise<void> {
  try {
    await sql`SELECT 1`;
    await redis.ping();
    await app.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`Server running on port ${config.port}`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

process.on('SIGINT', async () => {
  await app.close();
  await sql.end();
  await redis.quit();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await app.close();
  await sql.end();
  await redis.quit();
  process.exit(0);
});
