/**
 * Reservations Page
 * Complete reservation management interface
 */

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, Phone, Mail, MapPin, Tag, FileText, Plus, Search, Filter, X, Check, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import reservationsService, {
  Reservation,
  ReservationSettings,
  CreateReservationData,
  reservationUtils
} from '../services/reservationsService';
import tablesService from '../services/tablesService';

interface Table {
  id: number;
  table_number: string;
  capacity: number;
  area: string;
}

const ReservationsPage: React.FC = () => {
  // State
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [settings, setSettings] = useState<ReservationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Filters
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchPhone, setSearchPhone] = useState('');

  // Form data
  const [formData, setFormData] = useState<CreateReservationData>({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    party_size: 2,
    reservation_date: new Date().toISOString().split('T')[0],
    reservation_time: '19:00',
    duration_minutes: 120,
    table_id: undefined,
    preferred_area: '',
    special_requests: '',
    occasion: ''
  });

  // Load data
  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (settings) {
      loadReservations();
    }
  }, [filterDate, filterStatus, searchPhone]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [settingsData, tablesData] = await Promise.all([
        reservationsService.settings.get(),
        tablesService.getAll()
      ]);
      setSettings(settingsData);
      setTables(tablesData.filter((t: any) => t.is_active));
      await loadReservations();
    } catch (error: any) {
      toast.error(error.message || 'Error cargando datos');
    } finally {
      setIsLoading(false);
    }
  };

  const loadReservations = async () => {
    try {
      const params: any = {};
      if (filterDate) params.date = filterDate;
      if (filterStatus !== 'all') params.status = filterStatus;
      if (searchPhone) params.customer_phone = searchPhone;

      const data = await reservationsService.getAll(params);
      setReservations(data);
    } catch (error: any) {
      toast.error(error.message || 'Error cargando reservas');
    }
  };

  // Create reservation
  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customer_name || !formData.customer_phone) {
      toast.error('Nombre y teléfono son obligatorios');
      return;
    }

    if (!reservationUtils.validatePhone(formData.customer_phone)) {
      toast.error('Formato de teléfono inválido');
      return;
    }

    try {
      await reservationsService.create(formData);
      toast.success('Reserva creada exitosamente');
      setShowCreateModal(false);
      resetForm();
      loadReservations();
    } catch (error: any) {
      toast.error(error.message || 'Error creando reserva');
    }
  };

  // Status actions
  const handleConfirm = async (id: number) => {
    try {
      await reservationsService.confirm(id);
      toast.success('Reserva confirmada');
      loadReservations();
    } catch (error: any) {
      toast.error(error.message || 'Error confirmando reserva');
    }
  };

  const handleCancel = async (id: number) => {
    const reason = prompt('Razón de cancelación (opcional):');
    try {
      await reservationsService.cancel(id, reason || undefined);
      toast.success('Reserva cancelada');
      loadReservations();
    } catch (error: any) {
      toast.error(error.message || 'Error cancelando reserva');
    }
  };

  const handleMarkAsSeated = async (id: number) => {
    try {
      await reservationsService.markAsSeated(id);
      toast.success('Cliente sentado en mesa');
      loadReservations();
    } catch (error: any) {
      toast.error(error.message || 'Error actualizando estado');
    }
  };

  const handleMarkAsCompleted = async (id: number) => {
    try {
      await reservationsService.markAsCompleted(id);
      toast.success('Reserva completada');
      loadReservations();
    } catch (error: any) {
      toast.error(error.message || 'Error completando reserva');
    }
  };

  const handleMarkAsNoShow = async (id: number) => {
    if (!confirm('¿Confirmar que el cliente no asistió?')) return;
    try {
      await reservationsService.markAsNoShow(id);
      toast.success('Marcado como no asistió');
      loadReservations();
    } catch (error: any) {
      toast.error(error.message || 'Error actualizando estado');
    }
  };

  const resetForm = () => {
    setFormData({
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      party_size: 2,
      reservation_date: new Date().toISOString().split('T')[0],
      reservation_time: '19:00',
      duration_minutes: settings?.default_duration_minutes || 120,
      table_id: undefined,
      preferred_area: '',
      special_requests: '',
      occasion: ''
    });
  };

  const viewDetails = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setShowDetailsModal(true);
  };

  // Summary stats
  const stats = {
    total: reservations.length,
    pending: reservations.filter(r => r.status === 'pending').length,
    confirmed: reservations.filter(r => r.status === 'confirmed').length,
    seated: reservations.filter(r => r.status === 'seated').length,
    completed: reservations.filter(r => r.status === 'completed').length
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
          <h1 className="text-3xl font-bold text-gray-900">Reservas</h1>
          <p className="text-gray-600 mt-1">Gestión de reservas de mesas</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="h-5 w-5" />
          Nueva Reserva
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg shadow">
          <div className="text-sm text-yellow-600">Pendientes</div>
          <div className="text-2xl font-bold text-yellow-900">{stats.pending}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg shadow">
          <div className="text-sm text-green-600">Confirmadas</div>
          <div className="text-2xl font-bold text-green-900">{stats.confirmed}</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg shadow">
          <div className="text-sm text-blue-600">En Mesa</div>
          <div className="text-2xl font-bold text-blue-900">{stats.seated}</div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Completadas</div>
          <div className="text-2xl font-bold text-gray-900">{stats.completed}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="h-4 w-4 inline mr-1" />
              Fecha
            </label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Filter className="h-4 w-4 inline mr-1" />
              Estado
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos</option>
              <option value="pending">Pendientes</option>
              <option value="confirmed">Confirmadas</option>
              <option value="seated">En Mesa</option>
              <option value="completed">Completadas</option>
              <option value="cancelled">Canceladas</option>
              <option value="no_show">No asistió</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Search className="h-4 w-4 inline mr-1" />
              Buscar por Teléfono
            </label>
            <input
              type="text"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              placeholder="Buscar..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Reservations List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {reservations.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No hay reservas para los filtros seleccionados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha/Hora</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Personas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mesa</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reservations.map((reservation) => (
                  <tr key={reservation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-gray-900">{reservation.reservation_code}</span>
                        {reservation.occasion && (
                          <span title={reservation.occasion}>{reservationUtils.getOccasionIcon(reservation.occasion)}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">{reservation.customer_name}</div>
                        <div className="text-gray-500">{reservationUtils.formatPhone(reservation.customer_phone)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="text-gray-900">{reservationUtils.formatDate(reservation.reservation_date)}</div>
                        <div className="text-gray-500">{reservation.reservation_time} - {reservation.end_time}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{reservation.party_size}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {reservation.table_number ? `Mesa ${reservation.table_number}` : <span className="text-gray-400">Sin asignar</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${reservationUtils.getStatusColor(reservation.status)}`}>
                        {reservationUtils.getStatusText(reservation.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        {reservation.status === 'pending' && (
                          <button
                            onClick={() => handleConfirm(reservation.id)}
                            className="text-green-600 hover:text-green-900"
                            title="Confirmar"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        {reservation.status === 'confirmed' && (
                          <button
                            onClick={() => handleMarkAsSeated(reservation.id)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Sentar en mesa"
                          >
                            <Users className="h-4 w-4" />
                          </button>
                        )}
                        {reservation.status === 'seated' && (
                          <button
                            onClick={() => handleMarkAsCompleted(reservation.id)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Completar"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        {['pending', 'confirmed'].includes(reservation.status) && (
                          <>
                            <button
                              onClick={() => handleCancel(reservation.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Cancelar"
                            >
                              <X className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleMarkAsNoShow(reservation.id)}
                              className="text-orange-600 hover:text-orange-900"
                              title="No asistió"
                            >
                              <AlertCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => viewDetails(reservation)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Ver detalles"
                        >
                          <FileText className="h-4 w-4" />
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
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Nueva Reserva</h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleCreateReservation} className="space-y-4">
                {/* Customer Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del Cliente *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.customer_phone}
                      onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                      placeholder="+56 9 XXXX XXXX"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email (opcional)
                  </label>
                  <input
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Reservation Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Número de Personas *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max={settings?.max_party_size}
                      value={formData.party_size}
                      onChange={(e) => setFormData({ ...formData, party_size: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.reservation_date}
                      onChange={(e) => setFormData({ ...formData, reservation_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hora *
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.reservation_time}
                      onChange={(e) => setFormData({ ...formData, reservation_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mesa (opcional)
                    </label>
                    <select
                      value={formData.table_id || ''}
                      onChange={(e) => setFormData({ ...formData, table_id: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sin asignar</option>
                      {tables.map((table) => (
                        <option key={table.id} value={table.id}>
                          Mesa {table.table_number} ({table.capacity} personas)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Área Preferida
                    </label>
                    <select
                      value={formData.preferred_area}
                      onChange={(e) => setFormData({ ...formData, preferred_area: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sin preferencia</option>
                      <option value="indoor">Interior</option>
                      <option value="outdoor">Terraza</option>
                      <option value="private">Privado</option>
                      <option value="bar">Barra</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ocasión
                  </label>
                  <select
                    value={formData.occasion}
                    onChange={(e) => setFormData({ ...formData, occasion: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Ninguna</option>
                    <option value="birthday">Cumpleaños 🎂</option>
                    <option value="anniversary">Aniversario 💑</option>
                    <option value="business">Negocios 💼</option>
                    <option value="celebration">Celebración 🎉</option>
                    <option value="romantic">Romántico ❤️</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Solicitudes Especiales
                  </label>
                  <textarea
                    value={formData.special_requests}
                    onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
                    rows={3}
                    placeholder="Alergias, restricciones dietéticas, preferencias de mesa, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    Crear Reserva
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

export default ReservationsPage;
