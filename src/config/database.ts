import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/models/schema';
import * as algoSchema from '@/models/algo-schema';

// Primary database connection

if (!process.env.POSTGRES_URL) {
  throw new Error("POSTGRES_URL environment variable is not set");
}

if (!process.env.EXTERNAL_DATABASE_URL) {
  throw new Error("EXTERNAL_DATABASE_URL environment variable is not set");
}

const primaryClient = postgres(process.env.POSTGRES_URL);
export const db = drizzle(primaryClient, { schema });

// External database connection
const externalClient = postgres(process.env.EXTERNAL_DATABASE_URL);
export const externalDb = drizzle(externalClient, { schema: algoSchema });

// Close connections on app shutdown
process.on('SIGINT', () => {
  primaryClient.end();
  externalClient.end();
  process.exit(0);
});

process.on('SIGTERM', () => {
  primaryClient.end();
  externalClient.end();
  process.exit(0);
}); 