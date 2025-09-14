import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../models/schema';

// Local DB connection string
const client = postgres(process.env.POSTGRES_URL!, {
  max: 10,
});

export const db = drizzle(client, {
  schema,
});
