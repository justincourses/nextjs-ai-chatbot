const { Client } = require('pg');
const fs = require('node:fs');
const path = require('node:path');

// Load environment variables - try multiple files
const envFiles = ['.env.local', '.env'];
for (const envFile of envFiles) {
  if (fs.existsSync(envFile)) {
    require('dotenv').config({ path: envFile });
    console.log(`Loaded environment variables from ${envFile}`);
    break;
  }
}

async function runMigration() {
  // Validate environment variables
  if (!process.env.POSTGRES_URL) {
    console.error('Error: POSTGRES_URL environment variable is not set');
    console.error('Please check your .env or .env.local file');
    process.exit(1);
  }

  console.log('Using database URL:', process.env.POSTGRES_URL.replace(/:[^:]*@/, ':****@'));

  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrate-to-nextauth.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running NextAuth migration...');
    await client.query(migrationSQL);
    console.log('Migration completed successfully');

  } catch (error) {
    console.error('Migration failed:', error);
    console.error('Error details:', error.message);
  } finally {
    await client.end();
  }
}

runMigration();
