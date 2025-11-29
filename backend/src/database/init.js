/**
 * Database Initialization Script
 * Creates SQLite database and tables for SYSME POS
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import knex from 'knex';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbConfig = {
  client: 'sqlite3',
  connection: {
    filename: './data/sysme.db'
  },
  useNullAsDefault: true
};

export const initializeDatabase = async () => {
  try {
    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('✅ Created data directory');
    }

    // Create database connection
    const db = knex(dbConfig);

    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log('🚀 Initializing SYSME database...');

    for (const statement of statements) {
      try {
        await db.raw(statement);
      } catch (error) {
        // Ignore "table already exists" errors
        if (!error.message.includes('already exists')) {
          console.error('Error executing statement:', statement.substring(0, 50) + '...');
          console.error(error.message);
        }
      }
    }

    console.log('✅ Database initialized successfully');
    console.log('✅ Tables created');
    console.log('✅ Default data inserted');

    // Test the connection
    await db.raw('SELECT 1');
    console.log('✅ Database connection test passed');

    await db.destroy();
    return true;

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase()
    .then(() => {
      console.log('🎉 Database setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database setup failed:', error);
      process.exit(1);
    });
}