/**
 * Reprint Service
 * API para reimprimir tickets de venta
 * Soporta atajo de teclado F4 como el sistema legacy SYSME TPV v5.04
 */

import apiClient from './client';

export interface LastSale {
  id: number;
  sale_number: string;
  customer_id?: number;
  table_number?: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  payment_method: string;
  payment_status: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  reprint_count?: number;
  last_reprinted_at?: string;
  items: Array<{
    id: number;
    product_id: number;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    notes?: string;
    modifiers?: Array<{
      modifier_name: string;
      modifier_price: number;
    }>;
  }>;
}

export interface ReprintResult {
  sale: {
    id: number;
    sale_number: string;
    total: number;
    created_at: string;
  };
  print_result: {
    success: boolean;
    method: string;
    filepath?: string;
    content?: string;
  };
  reprint_count: number;
}

/**
 * Obtener la última venta completada
 */
export const getLastSale = async (): Promise<LastSale> => {
  const response = await apiClient.get('/sales/last-sale');
  return response.data.data;
};

/**
 * Reimprimir el último ticket (F4)
 */
export const reprintLastTicket = async (): Promise<ReprintResult> => {
  const response = await apiClient.post('/sales/reprint-last');
  return response.data.data;
};

/**
 * Reimprimir ticket de una venta específica
 */
export const reprintTicket = async (saleId: number): Promise<{
  success: boolean;
  message: string;
}> => {
  const response = await apiClient.post(`/sales/${saleId}/print-receipt`);
  return response.data;
};

/**
 * Imprimir ticket de cocina de una venta específica
 */
export const printKitchenTicket = async (saleId: number): Promise<{
  success: boolean;
  message: string;
}> => {
  const response = await apiClient.post(`/sales/${saleId}/print-kitchen`);
  return response.data;
};

/**
 * Obtener estado de las impresoras
 */
export const getPrinterStatus = async (): Promise<{
  kitchen: {
    enabled: boolean;
    type: string;
    status: string;
  };
  receipt: {
    enabled: boolean;
    type: string;
    status: string;
  };
}> => {
  const response = await apiClient.get('/sales/printer/status');
  return response.data.data;
};

/**
 * Probar impresora
 */
export const testPrinter = async (type: 'kitchen' | 'receipt'): Promise<{
  success: boolean;
  method: string;
}> => {
  const response = await apiClient.post(`/sales/printer/test/${type}`);
  return response.data.data;
};

export default {
  getLastSale,
  reprintLastTicket,
  reprintTicket,
  printKitchenTicket,
  getPrinterStatus,
  testPrinter
};
