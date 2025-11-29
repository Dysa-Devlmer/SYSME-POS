/**
 * MySQL Connection Test Script
 * Tests the MySQL connection and basic setup before migration
 */

import knex from 'knex';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load test environment
dotenv.config({ path: path.join(__dirname, '../../.env.test') });

const testMySQLConnection = async () => {
  console.log('🔧 Testing MySQL Connection for SYSME Production Migration\n');

  // Test database configuration
  const dbConfig = {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      charset: 'utf8mb4'
    }
  };

  let db = null;

  try {
    console.log('📊 Configuration:');
    console.log(`Host: ${dbConfig.connection.host}`);
    console.log(`Port: ${dbConfig.connection.port}`);
    console.log(`User: ${dbConfig.connection.user}`);
    console.log(`Password: ${dbConfig.connection.password ? '***hidden***' : 'empty'}\n`);

    // Test basic connection
    console.log('1. Testing basic MySQL connection...');
    db = knex(dbConfig);
    await db.raw('SELECT 1 as test');
    console.log('✅ MySQL connection successful\n');

    // Test database creation capabilities
    console.log('2. Testing database creation capabilities...');
    const testDbName = process.env.DB_NAME || 'sysme_test';

    try {
      await db.raw(`CREATE DATABASE IF NOT EXISTS ${testDbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      console.log(`✅ Database creation successful: ${testDbName}\n`);
    } catch (error) {
      console.log(`⚠️  Database creation warning: ${error.message}\n`);
    }

    // Test connecting to the specific database
    console.log('3. Testing connection to target database...');
    await db.destroy();

    const targetDbConfig = {
      ...dbConfig,
      connection: {
        ...dbConfig.connection,
        database: testDbName
      }
    };

    db = knex(targetDbConfig);
    await db.raw('SELECT 1 as test');
    console.log('✅ Target database connection successful\n');

    // Test table creation
    console.log('4. Testing table creation capabilities...');
    await db.schema.dropTableIfExists('migration_test');
    await db.schema.createTable('migration_test', (table) => {
      table.increments('id').primary();
      table.string('name', 100);
      table.json('data');
      table.boolean('active').defaultTo(true);
      table.timestamps(true, true);
    });
    console.log('✅ Table creation successful\n');

    // Test data insertion
    console.log('5. Testing data insertion...');
    await db('migration_test').insert({
      name: 'Test Record',
      data: JSON.stringify({ test: true }),
      active: true
    });
    console.log('✅ Data insertion successful\n');

    // Test data retrieval
    console.log('6. Testing data retrieval...');
    const testRecord = await db('migration_test').select('*').first();
    console.log('✅ Data retrieval successful');
    console.log('   Record:', testRecord, '\n');

    // Cleanup test table
    console.log('7. Cleaning up test data...');
    await db.schema.dropTable('migration_test');
    console.log('✅ Cleanup successful\n');

    console.log('🎉 All MySQL tests passed successfully!');
    console.log('📋 System is ready for production migration.\n');

    return true;

  } catch (error) {
    console.error('❌ MySQL test failed:', error.message);

    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Troubleshooting tips:');
      console.log('- Check MySQL username and password');
      console.log('- Ensure MySQL server is running');
      console.log('- Verify user has proper permissions');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Troubleshooting tips:');
      console.log('- Check if MySQL server is running');
      console.log('- Verify MySQL is listening on the correct port');
      console.log('- Check firewall settings');
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n💡 Troubleshooting tips:');
      console.log('- Check MySQL server hostname/IP address');
      console.log('- Verify network connectivity');
    }

    return false;
  } finally {
    if (db) {
      await db.destroy();
    }
  }
};

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testMySQLConnection().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { testMySQLConnection };