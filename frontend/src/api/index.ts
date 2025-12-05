/**
 * API Services Index
 * Central export point for all API services
 */

// Core API client
export { api, apiClient, apiUtils } from './client';
export type { ApiResponse, PaginatedResponse } from './client';

// NEW Backend Services (v2.1)
export { default as authService } from './authService';
export { default as productsService } from './productsService';
export { default as inventoryService } from './inventoryService';
export { default as customersService } from './customersService';
export { default as analyticsService } from './analyticsService';
export { default as suppliersService } from './suppliersService';
export { default as reservationsService } from './reservationsService';
export { default as promotionsService } from './promotionsService';

// Legacy Services
export * from './cashService';
export * from './salesService';
export * from './tablesService';
export * from './modifiersService';
export * from './invoicesService';
export * from './warehousesService';
export * from './combosService';
export * from './permissionsService';
export * from './parkedSalesService';
export * from './pricingTiersService';

// Default export with all services
import authService from './authService';
import productsService from './productsService';
import inventoryService from './inventoryService';
import customersService from './customersService';
import analyticsService from './analyticsService';
import suppliersService from './suppliersService';
import reservationsService from './reservationsService';
import promotionsService from './promotionsService';
import cashService from './cashService';
import salesService from './salesService';
import tablesService from './tablesService';
import modifiersService from './modifiersService';
import invoicesService from './invoicesService';
import warehousesService from './warehousesService';
import combosService from './combosService';
import permissionsService from './permissionsService';
import parkedSalesService from './parkedSalesService';
import pricingTiersService from './pricingTiersService';

export default {
  auth: authService,
  products: productsService,
  inventory: inventoryService,
  customers: customersService,
  analytics: analyticsService,
  suppliers: suppliersService,
  reservations: reservationsService,
  promotions: promotionsService,
  cash: cashService,
  sales: salesService,
  tables: tablesService,
  modifiers: modifiersService,
  invoices: invoicesService,
  warehouses: warehousesService,
  combos: combosService,
  permissions: permissionsService,
  parkedSales: parkedSalesService,
  pricingTiers: pricingTiersService
};
