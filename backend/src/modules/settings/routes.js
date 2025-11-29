/**
 * Settings Routes
 */

import express from 'express';
import {
  getSettings,
  getSetting,
  createSetting,
  updateSetting,
  deleteSetting,
  getSettingsByCategory,
  bulkUpdateSettings
} from './controller.js';

const router = express.Router();

// Settings routes
router.get('/', getSettings);
router.get('/category/:category', getSettingsByCategory);
router.get('/:key', getSetting);
router.post('/', createSetting);
router.post('/bulk-update', bulkUpdateSettings);
router.put('/:key', updateSetting);
router.delete('/:key', deleteSetting);

export default router;
