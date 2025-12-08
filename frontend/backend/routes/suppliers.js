// =====================================================
// SYSME POS - Suppliers Routes
// =====================================================
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const suppliersController = require('../controllers/suppliersController');

// All routes require authentication
router.use(authenticateToken);

router.get('/', suppliersController.getSuppliers);
router.get('/:id', suppliersController.getSupplier);
router.post('/', requireRole(['admin', 'manager']), suppliersController.createSupplier);
router.put('/:id', requireRole(['admin', 'manager']), suppliersController.updateSupplier);
router.delete('/:id', requireRole(['admin']), suppliersController.deleteSupplier);

module.exports = router;
