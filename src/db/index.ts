import { neon } from '@neondatabase/serverless';
import { drizzle, NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';

let _db: NeonHttpDatabase<typeof schema> | null = null;

export function getDb(): NeonHttpDatabase<typeof schema> {
  if (!_db) {
    const sql = neon(process.env.DATABASE_URL!);
    _db = drizzle(sql, { schema });
  }
  return _db;
}

// Default export for convenience - eagerly create if DATABASE_URL exists
export const db = (() => {
  if (process.env.DATABASE_URL) {
    return getDb();
  }
  // Return a lazy proxy for build time when DATABASE_URL isn't set
  return new Proxy({} as NeonHttpDatabase<typeof schema>, {
    get(_target, prop) {
      return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
    },
  });
})();
