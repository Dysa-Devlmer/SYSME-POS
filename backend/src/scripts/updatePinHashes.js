/**
 * Update PIN hashes for POS employees
 */

import { connectDatabase, closeDatabase } from '../config/database.js';
import { logger } from '../config/logger.js';
import bcrypt from 'bcrypt';

const updatePinHashes = async () => {
  let db = null;

  try {
    logger.info('🔄 Updating PIN hashes...');

    db = await connectDatabase();

    // Generate correct PIN hashes
    const pin1234 = await bcrypt.hash('1234', 12);
    const pin5678 = await bcrypt.hash('5678', 12);

    // Update María's PIN (1234)
    await db.raw('UPDATE users SET pin_code = ? WHERE username = ?', [pin1234, 'maria_camarera']);
    logger.info('✅ Updated María\'s PIN hash');

    // Update Carlos's PIN (5678)
    await db.raw('UPDATE users SET pin_code = ? WHERE username = ?', [pin5678, 'carlos_camarero']);
    logger.info('✅ Updated Carlos\'s PIN hash');

    // Verify updates
    const users = await db.raw('SELECT id, username, pin_code FROM users WHERE pin_code IS NOT NULL');
    logger.info('📋 Users with PINs:', users);

    logger.info('🏗️ PIN hashes updated successfully');

  } catch (error) {
    logger.error('❌ PIN hash update failed:', error);
    throw error;
  } finally {
    if (db) {
      await closeDatabase();
    }
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  updatePinHashes()
    .then(() => {
      logger.info('✅ PIN hashes updated successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ PIN hash update failed:', error);
      process.exit(1);
    });
}

export default updatePinHashes;