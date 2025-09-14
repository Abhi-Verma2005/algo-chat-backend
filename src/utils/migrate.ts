import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

async function runMigrations() {
  try {
    

    // Primary database migration
    if (process.env.DATABASE_URL) {
      
      const primaryClient = postgres(process.env.DATABASE_URL);
      const primaryDb = drizzle(primaryClient);
      
      // Note: You'll need to create migration files for Drizzle
      // This is a placeholder for the migration process
      
      await primaryClient.end();
    }

    // External database migration
    if (process.env.EXTERNAL_DATABASE_URL) {
      
      const externalClient = postgres(process.env.EXTERNAL_DATABASE_URL);
      const externalDb = drizzle(externalClient);
      
      // Note: You'll need to create migration files for Drizzle
      // This is a placeholder for the migration process
      
      await externalClient.end();
    }

    
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