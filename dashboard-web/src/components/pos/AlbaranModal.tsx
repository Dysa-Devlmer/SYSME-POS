/**
 * Albaran Modal Component
 * Create delivery notes / packing slips
 */

import React, { useState } from 'react';
import { X, Save, Printer } from 'lucide-react';
import axios from 'axios';

interface AlbaranItem {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  subtotal: number;
}

interface AlbaranModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleId?: number;
  items?: AlbaranItem[];
}

export const AlbaranModal: React.FC<AlbaranModalProps> = ({
  isOpen,
  onClose,
  saleId,
  items = []
}) => {
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_address: '',
    customer_tax_id: '',
    delivery_address: '',
    delivery_date: '',
    notes: '',
    internal_notes: ''
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/api/v1/albaranes', {
        ...formData,
        sale_id: saleId,
        items: items,
        status: 'pending'
      });

      alert('Albarán creado exitosamente');
      onClose();
    } catch (error) {
      console.error('Error creating albaran:', error);
      alert('Error al crear el albarán');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    // Print functionality
    window.print();
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.subtotal, 0);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">
            📦 Crear Albarán / Guía de Despacho
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Customer Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Información del Cliente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre/Razón Social *
                </label>
                <input
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  RUT/DNI
                </label>
                <input
                  type="text"
                  value={formData.customer_tax_id}
                  onChange={(e) => setFormData({ ...formData, customer_tax_id: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección de Facturación
                </label>
                <textarea
                  value={formData.customer_address}
                  onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Delivery Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Información de Entrega</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección de Entrega
                </label>
                <textarea
                  value={formData.delivery_address}
                  onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  rows={2}
                  placeholder="Si es diferente a la dirección de facturación"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Entrega Estimada
                </label>
                <input
                  type="date"
                  value={formData.delivery_date}
                  onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Items */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Productos</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Producto</th>
                    <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">Cantidad</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Precio Unit.</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Descuento</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm">{item.product_name}</td>
                      <td className="px-4 py-3 text-sm text-center">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-right">${item.unit_price.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right">{item.discount}%</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">${item.subtotal.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-right font-bold">TOTAL:</td>
                    <td className="px-4 py-3 text-right font-bold text-lg">
                      ${calculateTotal().toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas para el Cliente
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg"
                rows={3}
                placeholder="Notas visibles en el albarán"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas Internas
              </label>
              <textarea
                value={formData.internal_notes}
                onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg"
                rows={3}
                placeholder="Notas solo para uso interno"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 text-blue-700 bg-blue-50 border border-blue-300 rounded-lg hover:bg-blue-100 flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !formData.customer_name}
            className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Guardando...' : 'Guardar Albarán'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlbaranModal;
