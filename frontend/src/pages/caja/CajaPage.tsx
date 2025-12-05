import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import cashService, { CashSession, CashMovement } from '@/api/cashService';

const CajaPage: React.FC = () => {
  const [currentSession, setCurrentSession] = useState<CashSession | null>(null);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  // Form states
  const [openingBalance, setOpeningBalance] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [transactionData, setTransactionData] = useState({
    type: 'in' as 'in' | 'out',
    amount: '',
    reason: ''
  });

  useEffect(() => {
    loadCurrentSession();
  }, []);

  const loadCurrentSession = async () => {
    try {
      setIsLoading(true);
      const data = await cashService.getCurrentSession();
      setCurrentSession(data.session);
      setMovements(data.movements || []);
    } catch (error: any) {
      console.error('Error loading current session:', error);
      toast.error('Error al cargar la sesión de caja');
    } finally {
      setIsLoading(false);
    }
  };

  const getMovementColor = (type: CashMovement['type']) => {
    switch (type) {
      case 'sale':
        return 'text-green-600';
      case 'in':
        return 'text-blue-600';
      case 'out':
        return 'text-red-600';
      case 'opening':
        return 'text-purple-600';
      case 'closing':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const getMovementIcon = (type: CashMovement['type']) => {
    switch (type) {
      case 'sale':
        return '💰';
      case 'in':
        return '📥';
      case 'out':
        return '📤';
      case 'opening':
        return '🔓';
      case 'closing':
        return '🔒';
      default:
        return '❓';
    }
  };

  const getPaymentIcon = (method: CashMovement['payment_method']) => {
    switch (method) {
      case 'cash':
        return '💵';
      case 'card':
        return '💳';
      case 'transfer':
        return '🏦';
      case 'other':
        return '💼';
      default:
        return '❓';
    }
  };

  const handleOpenRegister = async () => {
    if (!openingBalance || parseFloat(openingBalance) < 0) {
      toast.error('Por favor ingresa un saldo inicial válido');
      return;
    }

    try {
      const session = await cashService.openSession(parseFloat(openingBalance));
      setCurrentSession(session);
      setShowOpenModal(false);
      setOpeningBalance('');
      toast.success('Caja abierta exitosamente');

      // Reload session to get movements
      await loadCurrentSession();
    } catch (error: any) {
      console.error('Error opening register:', error);
      toast.error(error.response?.data?.message || 'Error al abrir la caja');
    }
  };

  const handleCloseRegister = async () => {
    if (!currentSession) return;

    if (!closingAmount || parseFloat(closingAmount) < 0) {
      toast.error('Por favor ingresa el efectivo contado');
      return;
    }

    try {
      const session = await cashService.closeSession(parseFloat(closingAmount));
      setCurrentSession(session);
      setShowCloseModal(false);
      setClosingAmount('');
      toast.success('Caja cerrada exitosamente');

      // Reload session to get final state
      await loadCurrentSession();
    } catch (error: any) {
      console.error('Error closing register:', error);
      toast.error(error.response?.data?.message || 'Error al cerrar la caja');
    }
  };

  const handleAddTransaction = async () => {
    if (!transactionData.amount || !transactionData.reason) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    if (parseFloat(transactionData.amount) <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }

    try {
      await cashService.addMovement(
        transactionData.type,
        parseFloat(transactionData.amount),
        transactionData.reason,
        'cash'
      );

      setShowTransactionModal(false);
      setTransactionData({ type: 'in', amount: '', reason: '' });
      toast.success('Transacción registrada exitosamente');

      // Reload session to get updated data
      await loadCurrentSession();
    } catch (error: any) {
      console.error('Error adding transaction:', error);
      toast.error(error.response?.data?.message || 'Error al registrar la transacción');
    }
  };

  const calculateCurrentCash = () => {
    if (!currentSession) return 0;
    return currentSession.opening_balance + currentSession.total_cash;
  };

  const calculateExpectedBalance = () => {
    if (!currentSession) return 0;
    return currentSession.opening_balance + currentSession.total_in - currentSession.total_out;
  };

  const todayMovements = movements.filter(m => {
    const today = new Date();
    const movementDate = new Date(m.created_at);
    return movementDate.toDateString() === today.toDateString();
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Caja</h1>
            <p className="text-gray-600 mt-1">
              Control de efectivo y transacciones del día
            </p>
          </div>
          <div className="flex space-x-2">
            {!currentSession || currentSession.status === 'closed' ? (
              <button
                onClick={() => setShowOpenModal(true)}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
              >
                🔓 Abrir Caja
              </button>
            ) : (
              <>
                <button
                  onClick={() => setShowTransactionModal(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  💰 Nueva Transacción
                </button>
                <button
                  onClick={() => setShowCloseModal(true)}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                >
                  🔒 Cerrar Caja
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Cash Register Status */}
      {currentSession && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-medium text-gray-900">Estado de Caja #{currentSession.session_number}</h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              currentSession.status === 'open'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {currentSession.status === 'open' ? '🔓 ABIERTA' : '🔒 CERRADA'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-600">Saldo Inicial</p>
              <p className="text-2xl font-bold text-blue-900">${currentSession.opening_balance.toFixed(2)}</p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-green-600">Efectivo Actual</p>
              <p className="text-2xl font-bold text-green-900">${calculateCurrentCash().toFixed(2)}</p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-purple-600">Total Ventas</p>
              <p className="text-2xl font-bold text-purple-900">${currentSession.total_sales.toFixed(2)}</p>
              <p className="text-xs text-purple-600 mt-1">{currentSession.sales_count} ventas</p>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-orange-600">Tiempo Abierta</p>
              <p className="text-lg font-bold text-orange-900">
                {Math.floor((Date.now() - new Date(currentSession.opened_at).getTime()) / (1000 * 60 * 60))}h {
                Math.floor(((Date.now() - new Date(currentSession.opened_at).getTime()) % (1000 * 60 * 60)) / (1000 * 60))
                }m
              </p>
            </div>
          </div>

          {currentSession.status === 'closed' && currentSession.closing_balance !== undefined && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Efectivo Esperado</p>
                  <p className="text-lg font-bold text-gray-900">${currentSession.expected_balance?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Efectivo Contado</p>
                  <p className="text-lg font-bold text-gray-900">${currentSession.closing_balance.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Diferencia</p>
                  <p className={`text-lg font-bold ${
                    (currentSession.closing_balance - (currentSession.expected_balance || 0)) >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    ${(currentSession.closing_balance - (currentSession.expected_balance || 0)).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment Methods Summary */}
      {currentSession && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Resumen por Método de Pago</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center">
                <span className="text-2xl mr-3">💵</span>
                <div>
                  <p className="text-sm font-medium text-green-600">Efectivo</p>
                  <p className="text-xl font-bold text-green-900">${currentSession.total_cash.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <span className="text-2xl mr-3">💳</span>
                <div>
                  <p className="text-sm font-medium text-blue-600">Tarjetas</p>
                  <p className="text-xl font-bold text-blue-900">${currentSession.total_card.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center">
                <span className="text-2xl mr-3">💼</span>
                <div>
                  <p className="text-sm font-medium text-purple-600">Otros</p>
                  <p className="text-xl font-bold text-purple-900">${currentSession.total_other.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center">
                <span className="text-2xl mr-3">📊</span>
                <div>
                  <p className="text-sm font-medium text-yellow-600">Total</p>
                  <p className="text-xl font-bold text-yellow-900">
                    ${(currentSession.total_cash + currentSession.total_card + currentSession.total_other).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Movements Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Movimientos de Hoy ({todayMovements.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Motivo/Referencia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Método
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {todayMovements.map((movement) => (
                <tr key={movement.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(movement.created_at).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      movement.type === 'sale' ? 'bg-green-100 text-green-800' :
                      movement.type === 'in' ? 'bg-blue-100 text-blue-800' :
                      movement.type === 'out' ? 'bg-red-100 text-red-800' :
                      movement.type === 'opening' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {getMovementIcon(movement.type)} {movement.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {movement.reason || 'Sin descripción'}
                    </div>
                    {movement.reference_type && movement.reference_id && (
                      <div className="text-sm text-gray-500">
                        {movement.reference_type} #{movement.reference_id}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center">
                      {getPaymentIcon(movement.payment_method)}
                      <span className="ml-1 text-sm text-gray-900">
                        {movement.payment_method.charAt(0).toUpperCase() + movement.payment_method.slice(1)}
                      </span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${getMovementColor(movement.type)}`}>
                      {movement.type === 'out' ? '-' : '+'}
                      ${movement.amount.toFixed(2)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {todayMovements.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay movimientos</h3>
            <p className="text-gray-600">
              No se han registrado movimientos para el día de hoy.
            </p>
          </div>
        )}
      </div>

      {/* Open Register Modal */}
      {showOpenModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Abrir Caja</h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Saldo Inicial de Efectivo
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="bg-blue-50 p-3 rounded">
                <p className="text-sm text-blue-800">
                  <strong>Nota:</strong> Cuenta el efectivo físico en la caja antes de abrir el turno.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex space-x-3">
              <button
                onClick={() => {
                  setShowOpenModal(false);
                  setOpeningBalance('');
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleOpenRegister}
                disabled={!openingBalance}
                className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                🔓 Abrir Caja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Register Modal */}
      {showCloseModal && currentSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Cerrar Caja #{currentSession.session_number}</h3>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded">
                <h4 className="font-medium text-gray-900 mb-2">Resumen del Turno</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Saldo inicial:</span>
                    <span className="font-medium">${currentSession.opening_balance.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total ventas:</span>
                    <span className="font-medium text-green-600">${currentSession.total_sales.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Entradas de efectivo:</span>
                    <span className="font-medium text-blue-600">+${currentSession.total_in.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Salidas de efectivo:</span>
                    <span className="font-medium text-red-600">-${currentSession.total_out.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 mt-1">
                    <span className="font-semibold">Efectivo esperado:</span>
                    <span className="font-semibold">${calculateExpectedBalance().toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Efectivo Contado en Caja
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={closingAmount}
                  onChange={(e) => setClosingAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  required
                  autoFocus
                />
              </div>

              {closingAmount && (
                <div className={`p-3 rounded ${
                  parseFloat(closingAmount) - calculateExpectedBalance() === 0
                    ? 'bg-green-50'
                    : Math.abs(parseFloat(closingAmount) - calculateExpectedBalance()) <= 1
                    ? 'bg-yellow-50'
                    : 'bg-red-50'
                }`}>
                  <p className="text-sm font-medium">
                    <strong>Diferencia:</strong> ${(parseFloat(closingAmount) - calculateExpectedBalance()).toFixed(2)}
                  </p>
                  <p className={`text-xs mt-1 ${
                    parseFloat(closingAmount) - calculateExpectedBalance() === 0
                      ? 'text-green-700'
                      : Math.abs(parseFloat(closingAmount) - calculateExpectedBalance()) <= 1
                      ? 'text-yellow-700'
                      : 'text-red-700'
                  }`}>
                    {parseFloat(closingAmount) - calculateExpectedBalance() === 0
                      ? '✅ Cuadre perfecto'
                      : parseFloat(closingAmount) - calculateExpectedBalance() > 0
                      ? `⚠️ Sobra dinero (+$${(parseFloat(closingAmount) - calculateExpectedBalance()).toFixed(2)})`
                      : `❌ Falta dinero ($${(parseFloat(closingAmount) - calculateExpectedBalance()).toFixed(2)})`
                    }
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex space-x-3">
              <button
                onClick={() => {
                  setShowCloseModal(false);
                  setClosingAmount('');
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCloseRegister}
                disabled={!closingAmount}
                className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                🔒 Cerrar Caja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {showTransactionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Nuevo Movimiento de Caja</h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={transactionData.type}
                  onChange={(e) => setTransactionData(prev => ({...prev, type: e.target.value as 'in' | 'out'}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="in">📥 Entrada de Efectivo</option>
                  <option value="out">📤 Salida de Efectivo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={transactionData.amount}
                  onChange={(e) => setTransactionData(prev => ({...prev, amount: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                <input
                  type="text"
                  value={transactionData.reason}
                  onChange={(e) => setTransactionData(prev => ({...prev, reason: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Motivo del movimiento"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Ejemplo: "Compra de suministros", "Cambio para caja", etc.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex space-x-3">
              <button
                onClick={() => {
                  setShowTransactionModal(false);
                  setTransactionData({ type: 'in', amount: '', reason: '' });
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddTransaction}
                disabled={!transactionData.amount || !transactionData.reason}
                className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                💰 Registrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CajaPage;