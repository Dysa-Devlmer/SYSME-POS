/**
 * Suppliers Page
 * Main suppliers management interface
 */

import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, TrendingUp, Package, DollarSign, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import suppliersService, { Supplier, supplierUtils } from '../services/suppliersService';

const SuppliersPage: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('active');

  // Form
  const [formData, setFormData] = useState({
    business_name: '',
    trade_name: '',
    tax_id: '',
    contact_person: '',
    email: '',
    phone: '',
    mobile: '',
    address: '',
    city: '',
    category: 'food' as const,
    payment_terms: 30,
    credit_limit: 0,
    notes: ''
  });

  // Load suppliers
  useEffect(() => {
    loadSuppliers();
  }, [categoryFilter, activeFilter]);

  const loadSuppliers = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (activeFilter !== 'all') params.is_active = activeFilter === 'active';

      const data = await suppliersService.suppliers.getAll(params);
      setSuppliers(data);
    } catch (error: any) {
      toast.error(error.message || 'Error cargando proveedores');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter suppliers by search term
  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.trade_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.tax_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Create supplier
  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate RUT if provided
    if (formData.tax_id && !supplierUtils.validateRUT(formData.tax_id)) {
      toast.error('RUT inválido');
      return;
    }

    try {
      await suppliersService.suppliers.create(formData);
      toast.success('Proveedor creado exitosamente');
      setShowCreateModal(false);
      resetForm();
      loadSuppliers();
    } catch (error: any) {
      toast.error(error.message || 'Error creando proveedor');
    }
  };

  // Delete supplier
  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este proveedor?')) return;

    try {
      await suppliersService.suppliers.delete(id);
      toast.success('Proveedor eliminado');
      loadSuppliers();
    } catch (error: any) {
      toast.error(error.message || 'Error eliminando proveedor');
    }
  };

  // Toggle active status
  const toggleActive = async (supplier: Supplier) => {
    try {
      await suppliersService.suppliers.update(supplier.id, {
        is_active: !supplier.is_active
      });
      toast.success(supplier.is_active ? 'Proveedor desactivado' : 'Proveedor activado');
      loadSuppliers();
    } catch (error: any) {
      toast.error(error.message || 'Error actualizando proveedor');
    }
  };

  const resetForm = () => {
    setFormData({
      business_name: '',
      trade_name: '',
      tax_id: '',
      contact_person: '',
      email: '',
      phone: '',
      mobile: '',
      address: '',
      city: '',
      category: 'food',
      payment_terms: 30,
      credit_limit: 0,
      notes: ''
    });
  };

  // Stats
  const stats = {
    total: suppliers.length,
    active: suppliers.filter(s => s.is_active).length,
    totalOwed: suppliers.reduce((sum, s) => sum + (s.current_balance || 0), 0),
    totalPurchases: suppliers.reduce((sum, s) => sum + (s.total_purchases || 0), 0)
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Proveedores</h1>
          <p className="text-gray-600 mt-1">Gestión de proveedores y compras</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="h-5 w-5" />
          Nuevo Proveedor
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Package className="h-4 w-4" />
            <span className="text-sm">Total Proveedores</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg shadow">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm">Activos</span>
          </div>
          <div className="text-2xl font-bold text-green-900">{stats.active}</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg shadow">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <DollarSign className="h-4 w-4" />
            <span className="text-sm">Total Compras</span>
          </div>
          <div className="text-2xl font-bold text-blue-900">
            {supplierUtils.formatCurrency(stats.totalPurchases)}
          </div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg shadow">
          <div className="flex items-center gap-2 text-red-600 mb-1">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Por Pagar</span>
          </div>
          <div className="text-2xl font-bold text-red-900">
            {supplierUtils.formatCurrency(stats.totalOwed)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Search className="h-4 w-4 inline mr-1" />
              Buscar
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nombre, RUT, contacto..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas</option>
              <option value="food">Alimentos</option>
              <option value="beverages">Bebidas</option>
              <option value="supplies">Insumos</option>
              <option value="equipment">Equipamiento</option>
              <option value="services">Servicios</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredSuppliers.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No hay proveedores registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proveedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saldo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSuppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/suppliers/${supplier.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{supplierUtils.getCategoryIcon(supplier.category)}</span>
                        <div>
                          <div className="font-medium text-gray-900">{supplier.business_name}</div>
                          {supplier.trade_name && (
                            <div className="text-sm text-gray-500">{supplier.trade_name}</div>
                          )}
                          <div className="text-xs text-gray-400">{supplier.supplier_code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {supplier.contact_person && (
                          <div className="text-gray-900">{supplier.contact_person}</div>
                        )}
                        {supplier.phone && (
                          <div className="text-gray-500">{supplier.phone}</div>
                        )}
                        {supplier.email && (
                          <div className="text-gray-500">{supplier.email}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 capitalize">
                        {supplier.category || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className={`font-medium ${(supplier.current_balance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {supplierUtils.formatCurrency(supplier.current_balance || 0)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Total: {supplierUtils.formatCurrency(supplier.total_purchases || 0)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleActive(supplier);
                        }}
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          supplier.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {supplier.is_active ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/suppliers/${supplier.id}/edit`);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(supplier.id);
                          }}
                          className="text-red-600 hover:text-red-900"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Nuevo Proveedor</h2>
              <form onSubmit={handleCreateSupplier} className="space-y-4">
                {/* Business Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Razón Social *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.business_name}
                      onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre Comercial
                    </label>
                    <input
                      type="text"
                      value={formData.trade_name}
                      onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      RUT
                    </label>
                    <input
                      type="text"
                      value={formData.tax_id}
                      onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                      placeholder="12.345.678-9"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Categoría *
                    </label>
                    <select
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="food">Alimentos</option>
                      <option value="beverages">Bebidas</option>
                      <option value="supplies">Insumos</option>
                      <option value="equipment">Equipamiento</option>
                      <option value="services">Servicios</option>
                    </select>
                  </div>
                </div>

                {/* Contact */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Persona de Contacto
                    </label>
                    <input
                      type="text"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Celular
                    </label>
                    <input
                      type="tel"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ciudad
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Plazo de Pago (días)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.payment_terms}
                      onChange={(e) => setFormData({ ...formData, payment_terms: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    Crear Proveedor
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuppliersPage;
