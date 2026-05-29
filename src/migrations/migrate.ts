import { readFile } from 'fs/promises';
import { join } from 'path';
import { sql } from '../config/db';

async function migrate(): Promise<void> {
  try {
    const filePath = join(__dirname, '001_init.sql');
    const query = await readFile(filePath, 'utf-8');
    await sql.unsafe(query);
    console.log('Migration complete');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
