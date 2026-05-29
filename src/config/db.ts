import postgres from 'postgres';
import { config } from './env';

export const sql = postgres(config.databaseUrl);
