/**
 * Authentication Routes
 * Routes for login, logout, registration, and password management
 */

import express from 'express';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { validate, userSchemas } from '../../middleware/validation.js';
import { authenticate, userRateLimit } from '../../middleware/auth.js';
import * as authController from './controller.js';

const router = express.Router();

// Apply rate limiting to auth routes
router.use(userRateLimit(20, 900)); // 20 requests per 15 minutes

// Public routes
router.post('/login',
  validate(userSchemas.login),
  asyncHandler(authController.login)
);

// POS specific routes (replicating legacy behavior)
router.get('/pos/employees',
  asyncHandler(authController.getPosEmployees)
);

router.post('/pos/login',
  validate(userSchemas.posLogin),
  asyncHandler(authController.posLogin)
);

router.post('/register',
  validate(userSchemas.register), 
  asyncHandler(authController.register)
);

router.post('/forgot-password',
  validate(userSchemas.resetPassword),
  asyncHandler(authController.forgotPassword)
);

router.post('/reset-password/:token',
  validate(userSchemas.changePassword),
  asyncHandler(authController.resetPassword)
);

router.post('/refresh-token',
  asyncHandler(authController.refreshToken)
);

// Protected routes (require authentication)
router.post('/logout',
  authenticate,
  asyncHandler(authController.logout)
);

router.post('/change-password',
  authenticate,
  validate(userSchemas.changePassword),
  asyncHandler(authController.changePassword)
);

// Get current user (standard endpoint)
router.get('/me',
  authenticate,
  asyncHandler(authController.getProfile)
);

router.get('/profile',
  authenticate,
  asyncHandler(authController.getProfile)
);

router.put('/profile',
  authenticate,
  validate(userSchemas.updateProfile),
  asyncHandler(authController.updateProfile)
);

router.get('/sessions',
  authenticate,
  asyncHandler(authController.getUserSessions)
);

router.delete('/sessions/:sessionId',
  authenticate,
  asyncHandler(authController.revokeSession)
);

router.post('/enable-2fa',
  authenticate,
  asyncHandler(authController.enable2FA)
);

router.post('/verify-2fa',
  authenticate,
  asyncHandler(authController.verify2FA)
);

router.post('/disable-2fa',
  authenticate,
  asyncHandler(authController.disable2FA)
);

export default router;