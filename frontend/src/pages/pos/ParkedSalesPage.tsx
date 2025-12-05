import React, { useEffect, useState } from 'react';
import { parkedSalesService, ParkedSale, ParkedSaleWithItems } from '@/api/parkedSalesService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const ParkedSalesPage: React.FC = () => {
  const [parkedSales, setParkedSales] = useState<ParkedSale[]>([]);
  const [selectedSale, setSelectedSale] = useState<ParkedSaleWithItems | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('parked');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadParkedSales();
    loadStats();
  }, [filterStatus]);

  const loadParkedSales = async () => {
    try {
      setIsLoading(true);
      const response = await parkedSalesService.getParkedSales({
        status: filterStatus === 'all' ? undefined : filterStatus,
        limit: 50
      });
      setParkedSales(response.items);
    } catch (error: any) {
      console.error('Error loading parked sales:', error);
      toast.error('Error al cargar ventas aparcadas');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await parkedSalesService.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleViewDetails = async (sale: ParkedSale) => {
    try {
      const details = await parkedSalesService.getParkedSaleById(sale.id);
      setSelectedSale(details);
      setShowDetailsModal(true);
    } catch (error) {
      toast.error('Error al cargar detalles de la venta');
    }
  };

  const handleResumeSale = async (saleId: number) => {
    try {
      await parkedSalesService.resumeSale(saleId);
      toast.success('Venta reanudada exitosamente');
      loadParkedSales();
      setShowDetailsModal(false);
    } catch (error) {
      toast.error('Error al reanudar venta');
    }
  };

  const handleCancelSale = async (saleId: number) => {
    const reason = prompt('Motivo de cancelación:');
    if (!reason) return;

    try {
      await parkedSalesService.cancelParkedSale(saleId, reason);
      toast.success('Venta cancelada');
      loadParkedSales();
      setShowDetailsModal(false);
    } catch (error) {
      toast.error('Error al cancelar venta');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      parked: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Aparcada' },
      resumed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Reanudada' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelada' },
      expired: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Expirada' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.parked;

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const filteredSales = parkedSales.filter(sale =>
    searchTerm === '' ||
    sale.park_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.table_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Ventas Aparcadas</h1>
          <p className="text-gray-600 mt-1">Gestiona las ventas temporalmente aparcadas</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Actualmente Aparcadas</div>
              <div className="text-2xl font-bold text-yellow-600">{stats.currently_parked}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Total Reanudadas</div>
              <div className="text-2xl font-bold text-green-600">{stats.total_resumed}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Total Canceladas</div>
              <div className="text-2xl font-bold text-red-600">{stats.total_cancelled}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Monto Aparcado</div>
              <div className="text-2xl font-bold text-blue-600">
                ${stats.total_amount_parked?.toFixed(2) || '0.00'}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por número, cliente o mesa..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="parked">Aparcadas</option>
                <option value="resumed">Reanudadas</option>
                <option value="cancelled">Canceladas</option>
                <option value="expired">Expiradas</option>
                <option value="all">Todas</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sales List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Cargando...</div>
          ) : filteredSales.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No se encontraron ventas aparcadas
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Número
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mesa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aparcado Por
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {sale.park_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {sale.table_number || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {sale.customer_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {sale.items_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${sale.total_amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(sale.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {sale.parked_by_username || 'Usuario'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(sale.parked_at), 'dd/MM/yyyy HH:mm')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleViewDetails(sale)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Ver
                        </button>
                        {sale.status === 'parked' && (
                          <>
                            <button
                              onClick={() => handleResumeSale(sale.id)}
                              className="text-green-600 hover:text-green-900 mr-3"
                            >
                              Reanudar
                            </button>
                            <button
                              onClick={() => handleCancelSale(sale.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Cancelar
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold">Detalles de Venta Aparcada</h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Número de Parqueo</div>
                    <div className="font-medium">{selectedSale.park_number}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Estado</div>
                    <div>{getStatusBadge(selectedSale.status)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Mesa</div>
                    <div className="font-medium">{selectedSale.table_number || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Cliente</div>
                    <div className="font-medium">{selectedSale.customer_name || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Aparcado por</div>
                    <div className="font-medium">{selectedSale.parked_by_username}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Fecha</div>
                    <div className="font-medium">
                      {format(new Date(selectedSale.parked_at), 'dd/MM/yyyy HH:mm')}
                    </div>
                  </div>
                </div>

                {selectedSale.customer_notes && (
                  <div>
                    <div className="text-sm text-gray-600">Notas</div>
                    <div className="p-3 bg-gray-50 rounded">{selectedSale.customer_notes}</div>
                  </div>
                )}

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Items ({selectedSale.items.length})</h3>
                  <div className="space-y-2">
                    {selectedSale.items.map((item) => (
                      <div key={item.id} className="flex justify-between p-3 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium">{item.product_name}</div>
                          <div className="text-sm text-gray-600">
                            Cantidad: {item.quantity} × ${item.unit_price.toFixed(2)}
                          </div>
                          {item.notes && (
                            <div className="text-sm text-gray-500 italic">{item.notes}</div>
                          )}
                        </div>
                        <div className="font-medium">${item.total.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between mb-2">
                    <span>Subtotal:</span>
                    <span>${selectedSale.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span>Impuestos:</span>
                    <span>${selectedSale.tax_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span>Descuento:</span>
                    <span>-${selectedSale.discount_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>${selectedSale.total_amount.toFixed(2)}</span>
                  </div>
                </div>

                {selectedSale.status === 'parked' && (
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => handleResumeSale(selectedSale.id)}
                      className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
                    >
                      Reanudar Venta
                    </button>
                    <button
                      onClick={() => handleCancelSale(selectedSale.id)}
                      className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                    >
                      Cancelar Venta
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParkedSalesPage;
