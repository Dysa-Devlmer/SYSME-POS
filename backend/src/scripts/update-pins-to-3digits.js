/**
 * Script to update employee PINs to 3 digits
 * Generates bcrypt hashes and updates database
 */

import bcrypt from 'bcryptjs';
import { connectDatabase, initializeDbService, dbService } from '../config/database.js';
import { logger } from '../config/logger.js';

const newPins = {
  2: '123',  // María García
  3: '456'   // Carlos López
};

async function updatePins() {
  try {
    // Connect to database first
    await connectDatabase();
    initializeDbService();
    logger.info('Database connected successfully');

    logger.info('Starting PIN update to 3 digits...');

    for (const [userId, pin] of Object.entries(newPins)) {
      const hashedPin = await bcrypt.hash(pin, 10);

      await dbService.raw(`
        UPDATE users
        SET pin_code = ?
        WHERE id = ?
      `, [hashedPin, userId]);

      logger.info(`Updated PIN for user ID ${userId} to ${pin} (hashed)`);
    }

    logger.info('PIN update completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error updating PINs:', error);
    process.exit(1);
  }
}

updatePins();
