/**
 * QR Ordering Routes
 * Rutas para el sistema de pedidos por código QR
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import {
  // QR Codes
  createQRForTable,
  getQRForTable,
  getAllActiveQRs,
  regenerateAllQRs,

  // Sesiones (público)
  scanQR,
  getSession,
  closeSession,

  // Menú digital (público)
  getDigitalMenu,
  getProductDetails,

  // Carrito (público)
  addToCart,
  updateCartItem,
  removeFromCart,
  getCart,

  // Pedidos
  confirmOrder,
  getOrderStatus,
  getSessionOrders,

  // Mesero
  callWaiter,
  respondToWaiterCall,
  getPendingWaiterCalls,

  // Cuenta
  requestBill,
  getPendingBillRequests,
  processBillRequest,

  // Split Bill
  getSplitBillSummary,
  assignItemToGuest,

  // Configuración
  getMenuConfig,
  updateMenuConfig,

  // Dashboard y Analytics
  getQRDashboard,
  getQRAnalytics,
  getActiveSessions
} from './controller.js';

const router = Router();

// ============================================
// RUTAS PÚBLICAS (para clientes)
// ============================================

// Escanear QR y crear/unirse a sesión
router.post('/scan/:code', scanQR);

// Obtener menú digital
router.get('/menu/:sessionToken', getDigitalMenu);

// Detalles de producto
router.get('/product/:productId', getProductDetails);

// Sesión
router.get('/session/:sessionToken', getSession);

// Carrito
router.get('/cart/:sessionToken', getCart);
router.post('/cart/add', addToCart);
router.put('/cart/item/:cartItemId', updateCartItem);
router.delete('/cart/item/:cartItemId', removeFromCart);

// Confirmar pedido
router.post('/orders/confirm', confirmOrder);

// Estado de pedido
router.get('/orders/:orderId/status', getOrderStatus);

// Historial de pedidos de la sesión
router.get('/orders/session/:sessionToken', getSessionOrders);

// Llamar mesero
router.post('/waiter/call', callWaiter);

// Solicitar cuenta
router.post('/bill/request', requestBill);

// Split bill
router.get('/split/:sessionToken', getSplitBillSummary);
router.post('/split/assign', assignItemToGuest);

// ============================================
// RUTAS PROTEGIDAS (para dashboard)
// ============================================

// Gestión de códigos QR
router.post('/codes/table/:tableId', authenticate, createQRForTable);
router.get('/codes/table/:tableId', authenticate, getQRForTable);
router.get('/codes', authenticate, getAllActiveQRs);
router.post('/codes/regenerate-all', authenticate, regenerateAllQRs);

// Cerrar sesión
router.post('/session/:sessionId/close', authenticate, closeSession);

// Gestión de llamadas mesero
router.get('/waiter/calls/pending', authenticate, getPendingWaiterCalls);
router.post('/waiter/calls/:callId/respond', authenticate, respondToWaiterCall);

// Gestión de solicitudes de cuenta
router.get('/bill/requests/pending', authenticate, getPendingBillRequests);
router.post('/bill/requests/:requestId/process', authenticate, processBillRequest);

// Configuración del menú
router.get('/config', authenticate, getMenuConfig);
router.put('/config', authenticate, updateMenuConfig);

// Dashboard y Analytics
router.get('/dashboard', authenticate, getQRDashboard);
router.get('/analytics', authenticate, getQRAnalytics);
router.get('/sessions/active', authenticate, getActiveSessions);

export default router;
