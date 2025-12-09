/**
 * Delivery Management System Routes
 * API endpoints for delivery and driver management
 */

import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import {
  // Initialization
  initDeliveryTables,

  // Drivers
  getDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  updateDriverStatus,
  updateDriverLocation,

  // Zones
  getDeliveryZones,
  createDeliveryZone,
  updateDeliveryZone,
  calculateDeliveryFee,

  // Deliveries
  createDelivery,
  getDeliveries,
  getDeliveryById,
  assignDriver,
  autoAssignDriver,
  updateDeliveryStatus,
  rateDelivery,

  // Dashboard
  getDeliveryDashboard,
  getDriverPerformance
} from './controller.js';

const router = express.Router();

// =============================================
// INITIALIZATION
// =============================================
router.post('/init', authenticate, async (req, res) => {
  try {
    await initDeliveryTables();
    res.json({ success: true, message: 'Delivery tables initialized' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error initializing tables' });
  }
});

// =============================================
// DRIVERS
// =============================================
router.get('/drivers', authenticate, getDrivers);
router.get('/drivers/:id', authenticate, getDriverById);
router.post('/drivers', authenticate, createDriver);
router.put('/drivers/:id', authenticate, updateDriver);
router.put('/drivers/:id/status', authenticate, updateDriverStatus);
router.post('/drivers/:id/location', authenticate, updateDriverLocation);

// =============================================
// DELIVERY ZONES
// =============================================
router.get('/zones', authenticate, getDeliveryZones);
router.post('/zones', authenticate, createDeliveryZone);
router.put('/zones/:id', authenticate, updateDeliveryZone);
router.post('/zones/calculate-fee', calculateDeliveryFee); // Public for checkout

// =============================================
// DELIVERIES
// =============================================
router.get('/deliveries', authenticate, getDeliveries);
router.post('/deliveries', authenticate, createDelivery);
router.get('/deliveries/:id', authenticate, getDeliveryById);

// Assignment
router.post('/deliveries/:id/assign', authenticate, assignDriver);
router.post('/deliveries/:id/auto-assign', authenticate, autoAssignDriver);

// Status updates
router.put('/deliveries/:id/status', authenticate, updateDeliveryStatus);

// Customer rating
router.post('/deliveries/:id/rate', rateDelivery); // Public for customer

// =============================================
// DASHBOARD & ANALYTICS
// =============================================
router.get('/dashboard', authenticate, getDeliveryDashboard);
router.get('/performance', authenticate, getDriverPerformance);

// =============================================
// TRACKING (for driver app)
// =============================================
router.get('/tracking/:deliveryNumber', async (req, res) => {
  // Public tracking endpoint for customers
  try {
    const { deliveryNumber } = req.params;
    const deliveries = await require('../../config/database.js').dbService.raw(`
      SELECT
        d.delivery_number,
        d.status,
        d.customer_address,
        d.estimated_delivery_at,
        d.actual_delivery_at,
        dr.first_name as driver_first_name,
        dr.current_latitude,
        dr.current_longitude,
        dr.vehicle_type
      FROM deliveries d
      LEFT JOIN delivery_drivers dr ON d.driver_id = dr.id
      WHERE d.delivery_number = ?
    `, [deliveryNumber]);

    if (!deliveries.length) {
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }

    res.json({ success: true, data: deliveries[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching tracking' });
  }
});

export default router;
