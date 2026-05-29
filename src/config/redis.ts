import { Redis } from 'ioredis';
import { config } from './env';

export const redis = new Redis(config.redisUrl);

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});
