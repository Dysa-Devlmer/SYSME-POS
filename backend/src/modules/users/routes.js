/**
 * User Routes
 */

import express from 'express';
import {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getUserProfile
} from './controller.js';

const router = express.Router();

// User routes
router.get('/', getUsers);
router.get('/profile', getUserProfile);
router.get('/:id', getUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;