import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, {
  // Force public schema to avoid conflict with Supabase's auth.users
  connection: { search_path: 'public' },
});
export const db = drizzle(client, { schema });
