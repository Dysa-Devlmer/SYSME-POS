// =====================================================
// SYSME POS - Products Routes
// =====================================================
const express = require('express');
const router = express.Router();
const productsController = require('../controllers/productsController');
const { auth, checkPermission } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// =====================================================
// PRODUCTS
// =====================================================
router.get('/products', checkPermission('read_products'), productsController.getProducts);
router.post('/products', checkPermission('create_products'), productsController.createProduct);
router.get('/products/:id', checkPermission('read_products'), productsController.getProduct);
router.patch('/products/:id', checkPermission('update_products'), productsController.updateProduct);
router.delete('/products/:id', checkPermission('delete_products'), productsController.deleteProduct);

// =====================================================
// CATEGORIES
// =====================================================
router.get('/categories', checkPermission('read_products'), productsController.getCategories);
router.post('/categories', checkPermission('create_products'), productsController.createCategory);

module.exports = router;
