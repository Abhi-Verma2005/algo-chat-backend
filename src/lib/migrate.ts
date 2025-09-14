import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from '../models/schema';

// Migration script to set up local database tables
async function runMigrations() {
  try {
    
    const client = postgres(process.env.POSTGRES_URL!, { max: 1 });
    const db = drizzle(client, { schema });
    
    // Run migrations
    await migrate(db, { migrationsFolder: './src/lib/drizzle' });
    
    
    
    await client.end();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}

export { runMigrations };
