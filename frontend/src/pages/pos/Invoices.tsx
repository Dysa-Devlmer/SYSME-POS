/**
 * Invoices Management - Sistema de Facturación Completo
 * Gestión de facturas, boletas, notas de crédito y débito
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  Download,
  Eye,
  Ban,
  Plus,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface InvoiceSeries {
  id: number;
  series_code: string;
  series_name: string;
  document_type: string;
  prefix: string;
  current_number: number;
  requires_tax_id: boolean;
}

interface Invoice {
  id: number;
  invoice_number: string;
  series_id: number;
  sale_id: number;
  document_type: string;
  invoice_date: string;
  customer_name: string;
  customer_tax_id?: string;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
}

interface InvoiceStats {
  summary: {
    total: number;
    total_amount: number;
  };
  by_document_type: Array<{
    document_type: string;
    total_invoices: number;
    active_invoices: number;
    cancelled_invoices: number;
    total_amount: number;
  }>;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  boleta: 'Boleta',
  factura: 'Factura',
  nota_credito: 'Nota de Crédito',
  nota_debito: 'Nota de Débito'
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  credited: 'bg-orange-100 text-orange-800 border-orange-200'
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Activa',
  cancelled: 'Anulada',
  credited: 'Acreditada'
};

const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [series, setSeries] = useState<InvoiceSeries[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeries, setFilterSeries] = useState('');
  const [filterDocType, setFilterDocType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadSeries();
    loadStats();
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [currentPage, filterSeries, filterDocType, filterStatus, startDate, endDate]);

  const loadSeries = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/v1/invoices/series', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setSeries(data.data);
      }
    } catch (err) {
      console.error('Error loading series:', err);
    }
  };

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', '20');
      if (filterSeries) params.append('series_id', filterSeries);
      if (filterDocType) params.append('document_type', filterDocType);
      if (filterStatus) params.append('status', filterStatus);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await fetch(`http://localhost:3001/api/v1/invoices?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setInvoices(data.data);
        setTotalPages(data.pagination.totalPages);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error loading invoices:', err);
      setError('Error al cargar facturas');
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/v1/invoices/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const handleCancelInvoice = async (invoiceId: number) => {
    if (!confirm('¿Está seguro de anular esta factura? Esta acción no se puede deshacer.')) {
      return;
    }

    const reason = prompt('Ingrese el motivo de anulación:');
    if (!reason) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/v1/invoices/${invoiceId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cancellation_reason: reason })
      });

      if (response.ok) {
        alert('Factura anulada exitosamente');
        loadInvoices();
        loadStats();
      } else {
        const data = await response.json();
        alert(data.message || 'Error al anular factura');
      }
    } catch (err) {
      console.error('Error cancelling invoice:', err);
      alert('Error al anular factura');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const filteredInvoices = invoices.filter(invoice => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        invoice.invoice_number.toLowerCase().includes(search) ||
        invoice.customer_name.toLowerCase().includes(search) ||
        invoice.customer_tax_id?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  if (loading && invoices.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando facturas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Facturas y Documentos</h1>
                <p className="text-sm text-gray-500">Gestión completa de facturación</p>
              </div>
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Nueva Factura
            </button>
          </div>
        </div>
      </header>

      {/* Statistics Cards */}
      {stats && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Facturas</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.summary.total || 0}</p>
                </div>
                <FileText className="w-10 h-10 text-blue-500 opacity-50" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Monto Total</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(stats.summary.total_amount || 0)}
                  </p>
                </div>
                <DollarSign className="w-10 h-10 text-green-500 opacity-50" />
              </div>
            </div>

            {stats.by_document_type.map(docType => (
              <div key={docType.document_type} className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{DOCUMENT_TYPE_LABELS[docType.document_type]}</p>
                    <p className="text-2xl font-bold text-gray-900">{docType.active_invoices}</p>
                    <p className="text-xs text-gray-500">{formatCurrency(docType.total_amount)}</p>
                  </div>
                  <TrendingUp className="w-10 h-10 text-purple-500 opacity-50" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Número, cliente, RUT..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Series Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Serie
              </label>
              <select
                value={filterSeries}
                onChange={(e) => setFilterSeries(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todas</option>
                {series.map(s => (
                  <option key={s.id} value={s.id}>{s.series_name}</option>
                ))}
              </select>
            </div>

            {/* Document Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo Documento
              </label>
              <select
                value={filterDocType}
                onChange={(e) => setFilterDocType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos</option>
                <option value="boleta">Boleta</option>
                <option value="factura">Factura</option>
                <option value="nota_credito">Nota de Crédito</option>
                <option value="nota_debito">Nota de Débito</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos</option>
                <option value="active">Activa</option>
                <option value="cancelled">Anulada</option>
                <option value="credited">Acreditada</option>
              </select>
            </div>

            {/* Date Range */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Desde
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hasta
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Número
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    RUT/NIT
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">No se encontraron facturas</p>
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map(invoice => (
                    <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{invoice.invoice_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {DOCUMENT_TYPE_LABELS[invoice.document_type] || invoice.document_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{invoice.customer_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{invoice.customer_tax_id || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{formatDate(invoice.invoice_date)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(invoice.total_amount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${STATUS_COLORS[invoice.status]}`}>
                          {STATUS_LABELS[invoice.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            title="Ver detalles"
                            className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            title="Descargar PDF"
                            className="text-green-600 hover:text-green-900 p-1 hover:bg-green-50 rounded"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                          {invoice.status === 'active' && (
                            <button
                              onClick={() => handleCancelInvoice(invoice.id)}
                              title="Anular factura"
                              className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded"
                            >
                              <Ban className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Página <span className="font-medium">{currentPage}</span> de{' '}
                    <span className="font-medium">{totalPages}</span>
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Siguiente
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Invoices;
