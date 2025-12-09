/**
 * Executive Dashboard Routes
 * Rutas para el dashboard ejecutivo
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import {
  getExecutiveDashboard,
  getQuickSummary,
  getRealTimeMetrics,
  getPeriodComparison,
  exportDashboardReport,
  getSalesByDayOfWeek,
  getSalesByHour,
  getServerPerformance
} from './controller.js';

const router = Router();

// Dashboard principal
router.get('/', authenticate, getExecutiveDashboard);

// Resumen rápido (para widgets)
router.get('/quick-summary', authenticate, getQuickSummary);

// Métricas en tiempo real
router.get('/realtime', authenticate, getRealTimeMetrics);

// Comparativa de períodos
router.get('/compare', authenticate, getPeriodComparison);

// Exportar reporte
router.get('/export', authenticate, exportDashboardReport);

// Gráficos específicos
router.get('/charts/by-day-of-week', authenticate, getSalesByDayOfWeek);
router.get('/charts/by-hour', authenticate, getSalesByHour);
router.get('/charts/server-performance', authenticate, getServerPerformance);

export default router;
