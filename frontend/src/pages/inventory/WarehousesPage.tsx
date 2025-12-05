import React, { useEffect, useState } from 'react';
import { warehousesService, Warehouse, StockTransfer, StockAlert } from '@/api/warehousesService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const WarehousesPage: React.FC = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [activeTab, setActiveTab] = useState<'warehouses' | 'transfers' | 'alerts'>('warehouses');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateWarehouseModal, setShowCreateWarehouseModal] = useState(false);
  const [showCreateTransferModal, setShowCreateTransferModal] = useState(false);

  const [warehouseForm, setWarehouseForm] = useState({
    code: '',
    name: '',
    type: 'secondary' as const,
    location: '',
    is_active: true,
    allow_negative_stock: false,
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'warehouses') {
        const data = await warehousesService.getAllWarehouses();
        setWarehouses(data);
      } else if (activeTab === 'transfers') {
        const data = await warehousesService.getTransfers({ limit: 50 });
        setTransfers(data.items);
      } else if (activeTab === 'alerts') {
        const data = await warehousesService.getStockAlerts();
        setAlerts(data);
      }
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await warehousesService.createWarehouse(warehouseForm);
      toast.success('Almacén creado exitosamente');
      setShowCreateWarehouseModal(false);
      loadData();
      setWarehouseForm({
        code: '',
        name: '',
        type: 'secondary',
        location: '',
        is_active: true,
        allow_negative_stock: false,
        notes: ''
      });
    } catch (error) {
      toast.error('Error al crear almacén');
    }
  };

  const handleApproveTransfer = async (transferId: number) => {
    try {
      await warehousesService.approveTransfer(transferId);
      toast.success('Traspaso aprobado');
      loadData();
    } catch (error) {
      toast.error('Error al aprobar traspaso');
    }
  };

  const handleCompleteTransfer = async (transferId: number) => {
    try {
      await warehousesService.completeTransfer(transferId);
      toast.success('Traspaso completado');
      loadData();
    } catch (error) {
      toast.error('Error al completar traspaso');
    }
  };

  const getTransferStatusBadge = (status: string) => {
    const config = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pendiente' },
      in_transit: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'En Tránsito' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completado' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelado' },
      rejected: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Rechazado' }
    };
    const c = config[status as keyof typeof config] || config.pending;
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>{c.label}</span>;
  };

  const getAlertBadge = (type: string) => {
    const config = {
      low_stock: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Stock Bajo' },
      out_of_stock: { bg: 'bg-red-100', text: 'text-red-800', label: 'Sin Stock' },
      reorder_needed: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Reorden Necesario' }
    };
    const c = config[type as keyof typeof config] || config.low_stock;
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>{c.label}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Almacenes</h1>
            <p className="text-gray-600 mt-1">Administra almacenes, traspasos y alertas de stock</p>
          </div>
          {activeTab === 'warehouses' && (
            <button
              onClick={() => setShowCreateWarehouseModal(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            >
              + Nuevo Almacén
            </button>
          )}
          {activeTab === 'transfers' && (
            <button
              onClick={() => setShowCreateTransferModal(true)}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
            >
              + Nuevo Traspaso
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6 bg-white rounded-lg shadow">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('warehouses')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'warehouses'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Almacenes
            </button>
            <button
              onClick={() => setActiveTab('transfers')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'transfers'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Traspasos
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'alerts'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Alertas de Stock ({alerts.length})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Cargando...</div>
          ) : (
            <>
              {/* Warehouses Tab */}
              {activeTab === 'warehouses' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ubicación</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {warehouses.map((warehouse) => (
                        <tr key={warehouse.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{warehouse.code}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{warehouse.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">{warehouse.type}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{warehouse.location || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs ${warehouse.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                              {warehouse.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button className="text-blue-600 hover:text-blue-900 mr-3">Ver Stock</button>
                            <button className="text-gray-600 hover:text-gray-900">Editar</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Transfers Tab */}
              {activeTab === 'transfers' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Origen</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destino</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transfers.map((transfer) => (
                        <tr key={transfer.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{transfer.transfer_number}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">Almacén {transfer.from_warehouse_id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">Almacén {transfer.to_warehouse_id}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{getTransferStatusBadge(transfer.status)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {format(new Date(transfer.requested_at), 'dd/MM/yyyy HH:mm')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {transfer.status === 'pending' && (
                              <button
                                onClick={() => handleApproveTransfer(transfer.id)}
                                className="text-green-600 hover:text-green-900 mr-3"
                              >
                                Aprobar
                              </button>
                            )}
                            {transfer.status === 'in_transit' && (
                              <button
                                onClick={() => handleCompleteTransfer(transfer.id)}
                                className="text-blue-600 hover:text-blue-900 mr-3"
                              >
                                Completar
                              </button>
                            )}
                            <button className="text-gray-600 hover:text-gray-900">Ver Detalles</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Alerts Tab */}
              {activeTab === 'alerts' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Almacén</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Actual</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Mínimo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo Alerta</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {alerts.map((alert, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{alert.warehouse_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{alert.product_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">{alert.current_stock}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{alert.min_stock}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{getAlertBadge(alert.alert_type)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button className="text-blue-600 hover:text-blue-900">Crear Traspaso</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Warehouse Modal */}
      {showCreateWarehouseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Nuevo Almacén</h2>
            <form onSubmit={handleCreateWarehouse} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                <input
                  type="text"
                  value={warehouseForm.code}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, code: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={warehouseForm.name}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={warehouseForm.type}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, type: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="main">Principal</option>
                  <option value="kitchen">Cocina</option>
                  <option value="bar">Bar</option>
                  <option value="secondary">Secundario</option>
                  <option value="external">Externo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                <input
                  type="text"
                  value={warehouseForm.location}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, location: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={warehouseForm.allow_negative_stock}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, allow_negative_stock: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm text-gray-700">Permitir stock negativo</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateWarehouseModal(false)}
                  className="flex-1 bg-gray-300 px-4 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancelar
                </button>
                <button type="submit" className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehousesPage;
