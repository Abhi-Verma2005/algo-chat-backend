// lib/externalDb.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as externalSchema from '../models/algo-schema'; // adjust path

// External DB connection string (you can hardcode or use .env)
const externalClient = postgres(process.env.EXTERNAL_DATABASE_URL!, {
  max: 5, // optional: keep it light
});

export const externalDb = drizzle(externalClient, {
  schema: externalSchema,
});
