/**
 * Albaranes Page
 * Delivery notes management with conversion to invoices
 */

import React, { useState, useEffect } from 'react';
import { FileText, Plus, Edit, Trash, Check, X, Printer } from 'lucide-react';
import axios from 'axios';

interface Albaran {
  id: number;
  albaran_number: string;
  customer_name: string;
  date: string;
  total: number;
  status: 'pending' | 'sent' | 'delivered' | 'cancelled';
  converted_to_invoice: boolean;
  invoice_number?: string;
}

export const AlbaranesPage: React.FC = () => {
  const [albaranes, setAlbaranes] = useState<Albaran[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchAlbaranes();
  }, []);

  const fetchAlbaranes = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/v1/albaranes');
      setAlbaranes(response.data);
    } catch (error) {
      console.error('Error fetching albaranes:', error);
    } finally {
      setLoading(false);
    }
  };

  const convertToInvoice = async (albaranId: number) => {
    if (!confirm('¿Convertir este albarán en factura?')) return;

    try {
      await axios.post(`/api/v1/albaranes/${albaranId}/convert-to-invoice`);
      fetchAlbaranes();
      alert('Albarán convertido a factura exitosamente');
    } catch (error) {
      console.error('Error converting:', error);
      alert('Error al convertir el albarán');
    }
  };

  const printAlbaran = async (albaranId: number) => {
    try {
      await axios.post(`/api/v1/print/albaran`, { albaranId });
      alert('Albarán impreso');
    } catch (error) {
      console.error('Error printing:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      sent: 'bg-blue-100 text-blue-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    const labels = {
      pending: 'Pendiente',
      sent: 'Enviado',
      delivered: 'Entregado',
      cancelled: 'Cancelado'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status as keyof typeof colors]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">📦 Albaranes</h1>
          <p className="text-gray-600">Gestión de albaranes y documentos de entrega</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nuevo Albarán
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando albaranes...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Número
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Factura
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {albaranes.map(albaran => (
                <tr key={albaran.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium">{albaran.albaran_number}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {albaran.customer_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(albaran.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">
                    ${albaran.total.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(albaran.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {albaran.converted_to_invoice ? (
                      <span className="text-green-600 text-sm">
                        ✓ {albaran.invoice_number}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => printAlbaran(albaran.id)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Imprimir"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      {!albaran.converted_to_invoice && (
                        <button
                          onClick={() => convertToInvoice(albaran.id)}
                          className="text-green-600 hover:text-green-800"
                          title="Convertir a factura"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        className="text-red-600 hover:text-red-800"
                        title="Eliminar"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {albaranes.length === 0 && !loading && (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No hay albaranes creados</p>
              <p className="text-sm text-gray-500 mt-2">
                Crea un nuevo albarán para comenzar
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AlbaranesPage;
