/**
 * Loyalty Program Routes
 * API endpoints for customer loyalty and rewards system
 * Full compatibility with loyaltyService.ts frontend
 */

import express from 'express';
import { authenticate, optionalAuthenticate } from '../../middleware/auth.js';
import {
  // Program Settings
  getProgramSettings,
  updateProgramSettings,

  // Members
  getMembers,
  getMemberById,
  getMemberByPhone,
  getMemberByCode,
  createMember,
  enrollMember,
  updateMember,

  // Points
  earnPoints,
  awardPoints,
  adjustPoints,
  redeemPoints,
  getMemberTransactions,
  getAllTransactions,

  // Rewards
  getRewards,
  getRewardById,
  createReward,
  updateReward,
  deleteReward,
  getAvailableRewardsForMember,
  useRedemption,

  // Tiers
  getAllTiers,

  // Analytics
  getLoyaltyDashboard,
  getMemberReport,
  getTopMembers,

  // Quick Actions
  quickLookup,
  calculatePointsPreview
} from './controller.js';

const router = express.Router();

// =============================================
// PROGRAM SETTINGS
// =============================================
router.get('/settings', getProgramSettings);
router.put('/settings', authenticate, updateProgramSettings);

// =============================================
// TIERS
// =============================================
router.get('/tiers', getAllTiers);

// =============================================
// MEMBERS
// =============================================
router.get('/members', authenticate, getMembers);
router.get('/members/:id', authenticate, getMemberById);
router.get('/members/phone/:phone', authenticate, getMemberByPhone);
router.get('/members/code/:code', authenticate, getMemberByCode);
router.post('/members', authenticate, createMember);
router.post('/members/enroll', authenticate, enrollMember);  // Alias for frontend
router.put('/members/:id', authenticate, updateMember);

// =============================================
// POINTS OPERATIONS
// =============================================
router.post('/points/earn', authenticate, earnPoints);
router.post('/points/award', authenticate, awardPoints);     // Frontend compatible
router.post('/points/adjust', authenticate, adjustPoints);   // Manual adjustment
router.post('/points/redeem', authenticate, redeemPoints);
router.get('/points/transactions', authenticate, getAllTransactions);
router.get('/members/:id/transactions', authenticate, getMemberTransactions);

// =============================================
// REWARDS CATALOG
// =============================================
router.get('/rewards', getRewards);  // Public - for customer-facing displays
router.get('/rewards/available/:memberId', authenticate, getAvailableRewardsForMember);
router.get('/rewards/:id', getRewardById);
router.post('/rewards', authenticate, createReward);
router.post('/rewards/redeem', authenticate, redeemPoints);  // Alias
router.post('/rewards/use/:redemptionCode', authenticate, useRedemption);
router.put('/rewards/:id', authenticate, updateReward);
router.delete('/rewards/:id', authenticate, deleteReward);

// =============================================
// ANALYTICS & REPORTS
// =============================================
router.get('/dashboard', authenticate, getLoyaltyDashboard);
router.get('/analytics/dashboard', authenticate, getLoyaltyDashboard);  // Alias
router.get('/analytics/top-members', authenticate, getTopMembers);
router.get('/reports/members', authenticate, getMemberReport);

// =============================================
// QUICK ACTIONS (FOR POS)
// =============================================
router.get('/lookup/:query', authenticate, quickLookup);
router.post('/calculate-points', authenticate, calculatePointsPreview);

export default router;
