/**
 * useReprintShortcut Hook
 * Hook para manejar el atajo F4 para reimprimir el último ticket
 * Compatible con el sistema legacy SYSME TPV v5.04
 */

import { useEffect, useCallback, useState } from 'react';
import { reprintLastTicket, getLastSale, LastSale } from '../api/reprintService';

interface UseReprintShortcutOptions {
  enabled?: boolean;
  onSuccess?: (result: any) => void;
  onError?: (error: Error) => void;
  showConfirmation?: boolean;
}

interface UseReprintShortcutReturn {
  isReprinting: boolean;
  lastSale: LastSale | null;
  error: string | null;
  reprint: () => Promise<void>;
  fetchLastSale: () => Promise<void>;
}

export const useReprintShortcut = (
  options: UseReprintShortcutOptions = {}
): UseReprintShortcutReturn => {
  const {
    enabled = true,
    onSuccess,
    onError,
    showConfirmation = false
  } = options;

  const [isReprinting, setIsReprinting] = useState(false);
  const [lastSale, setLastSale] = useState<LastSale | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Función para obtener la última venta
  const fetchLastSale = useCallback(async () => {
    try {
      const sale = await getLastSale();
      setLastSale(sale);
      setError(null);
    } catch (err) {
      console.error('Error fetching last sale:', err);
      setError(err instanceof Error ? err.message : 'Error al obtener última venta');
    }
  }, []);

  // Función para reimprimir
  const reprint = useCallback(async () => {
    if (isReprinting) return;

    // Confirmación opcional
    if (showConfirmation) {
      const confirmed = window.confirm('¿Desea reimprimir el último ticket?');
      if (!confirmed) return;
    }

    try {
      setIsReprinting(true);
      setError(null);

      const result = await reprintLastTicket();

      // Actualizar lastSale con el resultado
      setLastSale(prev => prev ? {
        ...prev,
        reprint_count: result.reprint_count
      } : null);

      onSuccess?.(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al reimprimir ticket';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsReprinting(false);
    }
  }, [isReprinting, showConfirmation, onSuccess, onError]);

  // Manejar el atajo F4
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // F4 para reimprimir
      if (event.key === 'F4') {
        event.preventDefault();
        reprint();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, reprint]);

  // Cargar última venta al montar
  useEffect(() => {
    if (enabled) {
      fetchLastSale();
    }
  }, [enabled, fetchLastSale]);

  return {
    isReprinting,
    lastSale,
    error,
    reprint,
    fetchLastSale
  };
};

export default useReprintShortcut;
