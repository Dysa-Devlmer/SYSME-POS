/**
 * Kitchen Display System (KDS) Routes
 * Professional kitchen management API endpoints
 */

import express from 'express';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import {
  // Initialization
  initKDSTables,

  // Stations
  getStations,
  createStation,
  updateStation,

  // Category Routing
  getCategoryRouting,
  setCategoryRouting,

  // Order Display
  getStationOrders,
  getExpoView,

  // Bump Actions
  bumpItem,
  bumpOrder,

  // Recall
  recallOrder,
  getRecallableOrders,

  // Priority
  setOrderPriority,

  // Analytics
  getKDSAnalytics,

  // Integration
  routeOrderToKDS
} from './controller.js';

const router = express.Router();

// =============================================
// INITIALIZATION
// =============================================
router.post('/init', authenticate, async (req, res) => {
  try {
    await initKDSTables();
    res.json({ success: true, message: 'KDS tables initialized' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error initializing KDS' });
  }
});

// =============================================
// STATIONS
// =============================================
router.get('/stations', authenticate, getStations);
router.post('/stations', authenticate, createStation);
router.put('/stations/:id', authenticate, updateStation);

// =============================================
// CATEGORY ROUTING
// =============================================
router.get('/routing', authenticate, getCategoryRouting);
router.post('/routing', authenticate, setCategoryRouting);

// =============================================
// ORDER DISPLAY - Main KDS Views
// =============================================
// Station-specific view (for individual kitchen stations)
router.get('/station/:stationId/orders', authenticate, getStationOrders);

// Expo/Expeditor view (sees all stations)
router.get('/expo', authenticate, getExpoView);

// =============================================
// BUMP ACTIONS - Core KDS Functionality
// =============================================
// Bump single item (advance status)
router.post('/bump/item/:itemId', authenticate, bumpItem);

// Bump all items in order (or station-specific)
router.post('/bump/order/:saleId', authenticate, bumpOrder);

// =============================================
// RECALL - Recover completed orders
// =============================================
router.post('/recall/:saleId', authenticate, recallOrder);
router.get('/recallable', authenticate, getRecallableOrders);

// =============================================
// PRIORITY MANAGEMENT
// =============================================
router.put('/priority/:saleId', authenticate, setOrderPriority);

// =============================================
// ANALYTICS
// =============================================
router.get('/analytics', authenticate, getKDSAnalytics);

// =============================================
// ORDER INTEGRATION (internal use)
// =============================================
router.post('/route-order/:saleId', authenticate, async (req, res) => {
  try {
    await routeOrderToKDS(req.params.saleId);
    res.json({ success: true, message: 'Order routed to KDS' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error routing order' });
  }
});

export default router;
