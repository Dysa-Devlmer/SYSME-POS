/**
 * useParkedSalesCount Hook
 * Hook para obtener el conteo de ventas pendientes (parqueadas)
 * Actualiza automáticamente cada 30 segundos
 */

import { useState, useEffect, useCallback } from 'react';
import { parkedSalesService, ParkedSale } from '../api/parkedSalesService';

interface UseParkedSalesCountReturn {
  count: number;
  parkedSales: ParkedSale[];
  totalAmount: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useParkedSalesCount = (
  autoRefresh: boolean = true,
  refreshInterval: number = 30000 // 30 segundos
): UseParkedSalesCountReturn => {
  const [count, setCount] = useState<number>(0);
  const [parkedSales, setParkedSales] = useState<ParkedSale[]>([]);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchParkedSales = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const sales = await parkedSalesService.getActiveParkedSales();

      setParkedSales(sales);
      setCount(sales.length);
      setTotalAmount(sales.reduce((sum, sale) => sum + sale.total_amount, 0));
    } catch (err) {
      console.error('Error fetching parked sales:', err);
      setError(err instanceof Error ? err.message : 'Error al obtener ventas pendientes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cargar al montar
  useEffect(() => {
    fetchParkedSales();
  }, [fetchParkedSales]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchParkedSales, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchParkedSales]);

  return {
    count,
    parkedSales,
    totalAmount,
    isLoading,
    error,
    refresh: fetchParkedSales
  };
};

export default useParkedSalesCount;
