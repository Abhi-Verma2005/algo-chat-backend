// lib/externalDb.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as externalSchema from '../models/algo-schema';

if (!process.env.EXTERNAL_DATABASE_URL) {
  throw new Error('EXTERNAL_DATABASE_URL environment variable is not set');
}

const externalClient = postgres(process.env.EXTERNAL_DATABASE_URL, { max: 5 });

export const externalDb = drizzle(externalClient, { schema: externalSchema });

export const closeExternalDb = async () => {
  await externalClient.end();
};
