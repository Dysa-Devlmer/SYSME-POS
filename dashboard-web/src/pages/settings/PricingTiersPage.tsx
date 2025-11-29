/**
 * Pricing Tiers Management Page
 * CRUD for pricing tiers and product pricing per tier
 */

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  getAllTiers,
  createTier,
  updateTier,
  deleteTier,
  setAsDefault,
  toggleTierActive,
  getProductPrices,
  setProductPrice,
  type PricingTier,
  type ProductPrice,
  type CreateTierRequest
} from '@/api/pricingTiersService';

type TabType = 'tiers' | 'prices';

const WEEKDAYS = [
  { value: 'monday', label: 'Lunes' },
  { value: 'tuesday', label: 'Martes' },
  { value: 'wednesday', label: 'Miércoles' },
  { value: 'thursday', label: 'Jueves' },
  { value: 'friday', label: 'Viernes' },
  { value: 'saturday', label: 'Sábado' },
  { value: 'sunday', label: 'Domingo' }
];

const PricingTiersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('tiers');
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null);
  const [productPrices, setProductPrices] = useState<ProductPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateTierRequest>({
    code: '',
    name: '',
    description: '',
    is_default: false,
    is_active: true,
    valid_days: [],
    valid_start_time: '',
    valid_end_time: '',
    priority: 0
  });

  // Load tiers
  const loadTiers = async () => {
    try {
      setLoading(true);
      const data = await getAllTiers(includeInactive);
      setTiers(data);
    } catch (error: any) {
      toast.error('Error al cargar tarifas');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Load product prices for a tier
  const loadProductPrices = async (tierId: number) => {
    try {
      setLoading(true);
      const data = await getProductPrices(tierId);
      setProductPrices(data);
    } catch (error: any) {
      toast.error('Error al cargar precios');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTiers();
  }, [includeInactive]);

  // Handle create/update tier
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedTier) {
        await updateTier(selectedTier.id, formData);
        toast.success('Tarifa actualizada');
      } else {
        await createTier(formData);
        toast.success('Tarifa creada');
      }
      loadTiers();
      handleCloseModal();
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar tarifa');
    }
  };

  // Handle delete
  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta tarifa?')) return;
    try {
      await deleteTier(id);
      toast.success('Tarifa eliminada');
      loadTiers();
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar');
    }
  };

  // Handle toggle active
  const handleToggleActive = async (tier: PricingTier) => {
    try {
      await toggleTierActive(tier.id, !tier.is_active);
      toast.success(tier.is_active ? 'Tarifa desactivada' : 'Tarifa activada');
      loadTiers();
    } catch (error: any) {
      toast.error('Error al cambiar estado');
    }
  };

  // Handle set as default
  const handleSetDefault = async (id: number) => {
    try {
      await setAsDefault(id);
      toast.success('Tarifa establecida como predeterminada');
      loadTiers();
    } catch (error: any) {
      toast.error('Error al establecer predeterminada');
    }
  };

  // Open modal for edit
  const handleEdit = (tier: PricingTier) => {
    setSelectedTier(tier);
    setFormData({
      code: tier.code,
      name: tier.name,
      description: tier.description || '',
      is_default: tier.is_default,
      is_active: tier.is_active,
      valid_days: tier.valid_days ? JSON.parse(tier.valid_days as any) : [],
      valid_start_time: tier.valid_start_time || '',
      valid_end_time: tier.valid_end_time || '',
      priority: tier.priority
    });
    setShowModal(true);
  };

  // Open modal for new
  const handleNew = () => {
    setSelectedTier(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      is_default: false,
      is_active: true,
      valid_days: [],
      valid_start_time: '',
      valid_end_time: '',
      priority: 0
    });
    setShowModal(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTier(null);
  };

  // View prices
  const handleViewPrices = (tier: PricingTier) => {
    setSelectedTier(tier);
    loadProductPrices(tier.id);
    setShowPriceModal(true);
  };

  // Toggle day selection
  const toggleDay = (day: string) => {
    const days = formData.valid_days || [];
    if (days.includes(day)) {
      setFormData({ ...formData, valid_days: days.filter(d => d !== day) });
    } else {
      setFormData({ ...formData, valid_days: [...days, day] });
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Tarifas</h1>
        <button
          onClick={handleNew}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          ➕ Nueva Tarifa
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('tiers')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'tiers'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600'
            }`}
          >
            📋 Tarifas
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-600">Mostrar inactivas</span>
        </label>
      </div>

      {/* Tiers List */}
      {loading ? (
        <div className="text-center py-8">Cargando...</div>
      ) : (
        <div className="grid gap-4">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className="bg-white rounded-lg shadow p-4 border-l-4"
              style={{
                borderColor: tier.is_default ? '#10b981' : tier.is_active ? '#3b82f6' : '#9ca3af'
              }}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold">{tier.name}</h3>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">{tier.code}</code>
                    {tier.is_default && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        Predeterminada
                      </span>
                    )}
                    {!tier.is_active && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        Inactiva
                      </span>
                    )}
                  </div>

                  {tier.description && (
                    <p className="text-sm text-gray-600 mb-2">{tier.description}</p>
                  )}

                  <div className="flex gap-4 text-sm text-gray-600">
                    {tier.valid_start_time && tier.valid_end_time && (
                      <div>
                        🕐 {tier.valid_start_time} - {tier.valid_end_time}
                      </div>
                    )}
                    {tier.valid_days && JSON.parse(tier.valid_days as any).length > 0 && (
                      <div>
                        📅 {JSON.parse(tier.valid_days as any).join(', ')}
                      </div>
                    )}
                    <div>
                      ⭐ Prioridad: {tier.priority}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewPrices(tier)}
                    className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                  >
                    💰 Precios
                  </button>

                  {!tier.is_default && (
                    <button
                      onClick={() => handleSetDefault(tier.id)}
                      className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                    >
                      ✓ Por defecto
                    </button>
                  )}

                  <button
                    onClick={() => handleToggleActive(tier)}
                    className={`px-3 py-1 text-sm rounded ${
                      tier.is_active
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    {tier.is_active ? '⏸️ Desactivar' : '▶️ Activar'}
                  </button>

                  <button
                    onClick={() => handleEdit(tier)}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    ✏️ Editar
                  </button>

                  {!tier.is_default && (
                    <button
                      onClick={() => handleDelete(tier.id)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {selectedTier ? 'Editar Tarifa' : 'Nueva Tarifa'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Código *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="HAPPY_HOUR"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Nombre *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="Happy Hour"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  rows={2}
                  placeholder="Precios especiales de 18:00 a 20:00"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Hora inicio</label>
                  <input
                    type="time"
                    value={formData.valid_start_time}
                    onChange={(e) => setFormData({ ...formData, valid_start_time: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Hora fin</label>
                  <input
                    type="time"
                    value={formData.valid_end_time}
                    onChange={(e) => setFormData({ ...formData, valid_end_time: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Prioridad</label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Días válidos</label>
                <div className="grid grid-cols-4 gap-2">
                  {WEEKDAYS.map((day) => (
                    <label key={day.value} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.valid_days?.includes(day.value) || false}
                        onChange={() => toggleDay(day.value)}
                        className="rounded"
                      />
                      <span className="text-sm">{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Activa</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Predeterminada</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {selectedTier ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Prices Modal */}
      {showPriceModal && selectedTier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                Precios - {selectedTier.name}
              </h2>
              <button
                onClick={() => setShowPriceModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8">Cargando precios...</div>
            ) : productPrices.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay precios configurados para esta tarifa
              </div>
            ) : (
              <div className="space-y-2">
                {productPrices.map((pp) => (
                  <div key={pp.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">{pp.product_name}</div>
                      <div className="text-sm text-gray-600">
                        Precio base: ${pp.default_price.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-lg font-bold text-blue-600">
                      ${pp.price.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingTiersPage;
