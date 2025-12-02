/**
 * Keyboard Shortcuts Hook
 * Global keyboard shortcuts for POS operations
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface KeyboardShortcutsConfig {
  onNewSale?: () => void;
  onFinalizeSale?: () => void;
  onCancelSale?: () => void;
  onReprintLast?: () => void;
  onOpenSales?: () => void;
  onKitchenPanel?: () => void;
  onCashSession?: () => void;
  enabled?: boolean;
}

export const useKeyboardShortcuts = (config: KeyboardShortcutsConfig = {}) => {
  const navigate = useNavigate();
  const { enabled = true } = config;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyPress = async (event: KeyboardEvent) => {
      // Don't trigger if user is typing in input/textarea
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // F-key shortcuts
      if (event.key.startsWith('F') && !event.ctrlKey && !event.altKey) {
        event.preventDefault();

        switch (event.key) {
          case 'F1':
            // Nueva venta
            if (config.onNewSale) {
              config.onNewSale();
            } else {
              navigate('/pos');
            }
            break;

          case 'F2':
            // Finalizar venta
            if (config.onFinalizeSale) {
              config.onFinalizeSale();
            }
            break;

          case 'F3':
            // Cancelar venta
            if (config.onCancelSale) {
              config.onCancelSale();
            }
            break;

          case 'F4':
            // Reimprimir último ticket
            if (config.onReprintLast) {
              config.onReprintLast();
            } else {
              await reprintLastTicket();
            }
            break;

          case 'F5':
            // Ventas abiertas
            if (config.onOpenSales) {
              config.onOpenSales();
            } else {
              navigate('/pos/open-sales');
            }
            break;

          case 'F6':
            // Panel de cocina
            if (config.onKitchenPanel) {
              config.onKitchenPanel();
            } else {
              navigate('/kitchen');
            }
            break;

          case 'F7':
            // Apertura/Cierre de caja
            if (config.onCashSession) {
              config.onCashSession();
            } else {
              navigate('/cash-sessions');
            }
            break;

          case 'F8':
            // Reportes
            navigate('/reports');
            break;

          case 'F9':
            // Configuración
            navigate('/settings');
            break;
        }
      }

      // Ctrl shortcuts
      if (event.ctrlKey && !event.altKey) {
        switch (event.key.toLowerCase()) {
          case 'p':
            // Ctrl+P: Imprimir
            event.preventDefault();
            if (config.onReprintLast) {
              config.onReprintLast();
            }
            break;

          case 'n':
            // Ctrl+N: Nueva venta
            event.preventDefault();
            if (config.onNewSale) {
              config.onNewSale();
            }
            break;

          case 's':
            // Ctrl+S: Guardar (aparcar venta)
            event.preventDefault();
            // Lógica para aparcar venta
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [enabled, config, navigate]);

  return null;
};

/**
 * Reimprimir último ticket
 */
async function reprintLastTicket() {
  try {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');

    // Obtener último ticket del usuario
    const response = await fetch(`/api/v1/sales/last/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('No se encontró el último ticket');
    }

    const sale = await response.json();

    // Enviar a imprimir
    await fetch('/api/v1/print/ticket', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        saleId: sale.id,
        reprint: true
      })
    });

    // Mostrar notificación
    showNotification('Reimprimiendo último ticket...', 'success');

  } catch (error) {
    console.error('Error reimprimiendo ticket:', error);
    showNotification('Error al reimprimir ticket', 'error');
  }
}

/**
 * Mostrar notificación
 */
function showNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
  // Implementar sistema de notificaciones
  // Por ahora usamos alert simple
  if (type === 'error') {
    alert(message);
  } else {
    // Toast notification
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
      type === 'success' ? 'bg-green-500' : 'bg-blue-500'
    } text-white`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
}

export default useKeyboardShortcuts;