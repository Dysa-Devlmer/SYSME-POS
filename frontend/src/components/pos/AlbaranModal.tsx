/**
 * AlbaranModal Component
 * Modal para crear y gestionar Albaranes (Notas de Entrega)
 * Documento que acompaña la mercancía sin valor fiscal
 */

import React, { useState, useEffect } from 'react';
import { formatCurrency, formatDate } from '../../config/chile-config';

interface CartItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  sku?: string;
  notes?: string;
}

interface DeliveryAddress {
  street: string;
  number: string;
  commune: string;
  city: string;
  region: string;
  reference?: string;
}

interface AlbaranData {
  customer_name: string;
  customer_rut?: string;
  customer_phone?: string;
  delivery_address: DeliveryAddress;
  delivery_date: string;
  delivery_time?: string;
  driver_name?: string;
  vehicle_plate?: string;
  notes?: string;
  items: CartItem[];
  requires_signature: boolean;
}

interface AlbaranModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (data: AlbaranData) => void;
  items: CartItem[];
  customerName?: string;
  customerRut?: string;
}

export const AlbaranModal: React.FC<AlbaranModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
  items,
  customerName = '',
  customerRut = ''
}) => {
  const [formData, setFormData] = useState<AlbaranData>({
    customer_name: customerName,
    customer_rut: customerRut,
    customer_phone: '',
    delivery_address: {
      street: '',
      number: '',
      commune: '',
      city: '',
      region: 'Metropolitana'
    },
    delivery_date: new Date().toISOString().split('T')[0],
    delivery_time: '',
    driver_name: '',
    vehicle_plate: '',
    notes: '',
    items: items,
    requires_signature: true
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'customer' | 'delivery' | 'items'>('customer');

  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        customer_name: customerName,
        customer_rut: customerRut,
        items: items
      }));
    }
  }, [isOpen, customerName, customerRut, items]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await onGenerate(formData);
      onClose();
    } catch (error) {
      console.error('Error generating albaran:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const updateAddress = (field: keyof DeliveryAddress, value: string) => {
    setFormData({
      ...formData,
      delivery_address: {
        ...formData.delivery_address,
        [field]: value
      }
    });
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = items.reduce((sum, item) => sum + item.total_price, 0);

  const REGIONS_CHILE = [
    'Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama', 'Coquimbo',
    'Valparaíso', 'Metropolitana', "O'Higgins", 'Maule', 'Ñuble', 'Biobío',
    'La Araucanía', 'Los Ríos', 'Los Lagos', 'Aysén', 'Magallanes'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2">
              📋 Generar Albarán
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
          <p className="text-teal-100 mt-1">Nota de Entrega - Guía de Despacho</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {[
            { id: 'customer', label: '👤 Cliente', icon: '1' },
            { id: 'delivery', label: '🚚 Entrega', icon: '2' },
            { id: 'items', label: '📦 Productos', icon: '3' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 px-4 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-teal-50 text-teal-700 border-b-2 border-teal-500'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Tab: Cliente */}
          {activeTab === 'customer' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre / Razón Social *
                  </label>
                  <input
                    type="text"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-teal-500 focus:outline-none"
                    placeholder="Nombre del cliente"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RUT
                  </label>
                  <input
                    type="text"
                    value={formData.customer_rut}
                    onChange={(e) => setFormData({...formData, customer_rut: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-teal-500 focus:outline-none"
                    placeholder="12.345.678-9"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono de Contacto
                </label>
                <input
                  type="tel"
                  value={formData.customer_phone}
                  onChange={(e) => setFormData({...formData, customer_phone: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-teal-500 focus:outline-none"
                  placeholder="+56 9 1234 5678"
                />
              </div>
            </div>
          )}

          {/* Tab: Entrega */}
          {activeTab === 'delivery' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Calle *
                  </label>
                  <input
                    type="text"
                    value={formData.delivery_address.street}
                    onChange={(e) => updateAddress('street', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-teal-500 focus:outline-none"
                    placeholder="Av. Providencia"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número *
                  </label>
                  <input
                    type="text"
                    value={formData.delivery_address.number}
                    onChange={(e) => updateAddress('number', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-teal-500 focus:outline-none"
                    placeholder="1234"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comuna *
                  </label>
                  <input
                    type="text"
                    value={formData.delivery_address.commune}
                    onChange={(e) => updateAddress('commune', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-teal-500 focus:outline-none"
                    placeholder="Providencia"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ciudad
                  </label>
                  <input
                    type="text"
                    value={formData.delivery_address.city}
                    onChange={(e) => updateAddress('city', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-teal-500 focus:outline-none"
                    placeholder="Santiago"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Región
                  </label>
                  <select
                    value={formData.delivery_address.region}
                    onChange={(e) => updateAddress('region', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-teal-500 focus:outline-none"
                  >
                    {REGIONS_CHILE.map(region => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Referencia / Depto / Oficina
                </label>
                <input
                  type="text"
                  value={formData.delivery_address.reference}
                  onChange={(e) => updateAddress('reference', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-teal-500 focus:outline-none"
                  placeholder="Depto 501, Torre A"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Entrega *
                  </label>
                  <input
                    type="date"
                    value={formData.delivery_date}
                    onChange={(e) => setFormData({...formData, delivery_date: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hora Estimada
                  </label>
                  <input
                    type="time"
                    value={formData.delivery_time}
                    onChange={(e) => setFormData({...formData, delivery_time: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Conductor
                  </label>
                  <input
                    type="text"
                    value={formData.driver_name}
                    onChange={(e) => setFormData({...formData, driver_name: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-teal-500 focus:outline-none"
                    placeholder="Juan Pérez"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Patente Vehículo
                  </label>
                  <input
                    type="text"
                    value={formData.vehicle_plate}
                    onChange={(e) => setFormData({...formData, vehicle_plate: e.target.value.toUpperCase()})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-teal-500 focus:outline-none uppercase"
                    placeholder="ABCD-12"
                    maxLength={7}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.requires_signature}
                  onChange={(e) => setFormData({...formData, requires_signature: e.target.checked})}
                  className="w-5 h-5 rounded"
                />
                <span className="font-medium">Requiere firma de recepción</span>
              </label>
            </div>
          )}

          {/* Tab: Items */}
          {activeTab === 'items' && (
            <div className="space-y-4">
              <div className="bg-gray-100 rounded-lg p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="text-left py-2">Producto</th>
                      <th className="text-center py-2">Cant.</th>
                      <th className="text-right py-2">Precio</th>
                      <th className="text-right py-2">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index} className="border-b border-gray-200">
                        <td className="py-2">
                          <div className="font-medium">{item.product_name}</div>
                          {item.sku && (
                            <div className="text-xs text-gray-500">SKU: {item.sku}</div>
                          )}
                        </td>
                        <td className="text-center py-2">{item.quantity}</td>
                        <td className="text-right py-2">{formatCurrency(item.unit_price)}</td>
                        <td className="text-right py-2 font-medium">{formatCurrency(item.total_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold">
                      <td className="py-2">Total</td>
                      <td className="text-center py-2">{totalItems} items</td>
                      <td></td>
                      <td className="text-right py-2">{formatCurrency(totalValue)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-teal-500 focus:outline-none"
                  rows={3}
                  placeholder="Instrucciones especiales de entrega..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer con resumen */}
        <div className="border-t bg-gray-50 p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{totalItems}</span> productos |{' '}
              <span className="font-medium">{formatCurrency(totalValue)}</span> valor total
            </div>
            <div className="text-sm text-gray-500">
              Fecha emisión: {formatDate(new Date(), true)}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !formData.customer_name || !formData.delivery_address.street}
              className={`flex-1 py-3 px-4 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 ${
                isGenerating || !formData.customer_name || !formData.delivery_address.street
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-teal-500 hover:bg-teal-600 text-white'
              }`}
            >
              {isGenerating ? (
                <>Generando...</>
              ) : (
                <>📋 Generar Albarán</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlbaranModal;
