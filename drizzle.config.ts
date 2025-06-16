import type { Config } from 'drizzle-kit';
import { join } from 'path';

export default {
  schema: './src/db/schema.ts',
  out: './migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: join(process.cwd(), 'livion.db')
  }
} as Config; 