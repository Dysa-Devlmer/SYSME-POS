import React, { useEffect, useState } from 'react';
import {
  dashboardService,
  shiftService,
  waitlistService,
  noShowService,
  reminderService,
  widgetService,
  blockService,
  reportService,
  reservationUtils,
  type ReservationDashboard,
  type Shift,
  type WaitlistEntry,
  type NoShowHistory,
  type Reminder,
  type WidgetConfig,
  type Block,
  type NoShowReport
} from '@/services/advancedReservationsService';
import { useAuthStore } from '@/store/authStore';

const AdvancedReservationsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'shifts' | 'waitlist' | 'no-shows' | 'reminders' | 'widget' | 'blocks'>('dashboard');
  const [dashboard, setDashboard] = useState<ReservationDashboard | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [noShowReport, setNoShowReport] = useState<NoShowReport | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Formulario para nuevo turno
  const [newShift, setNewShift] = useState({
    name: '',
    shift_type: 'lunch' as 'lunch' | 'dinner' | 'brunch' | 'late_night',
    start_time: '',
    end_time: '',
    max_reservations: 0,
    max_covers: 0,
    overbooking_percentage: 10,
    days_of_week: [] as number[],
    is_active: true
  });

  // Formulario para nueva entrada en waitlist
  const [newWaitlistEntry, setNewWaitlistEntry] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    party_size: 2,
    requested_date: new Date().toISOString().slice(0, 10),
    preferred_time: '',
    flexible_time: true,
    notes: ''
  });

  // Formulario para bloqueos
  const [newBlock, setNewBlock] = useState({
    block_type: 'full_day' as 'full_day' | 'time_range' | 'specific_tables',
    block_date: new Date().toISOString().slice(0, 10),
    start_time: '',
    end_time: '',
    reason: ''
  });

  // Cargar dashboard
  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      const data = await dashboardService.get();
      setDashboard(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar turnos
  const fetchShifts = async () => {
    try {
      const data = await shiftService.getAll();
      setShifts(data);
    } catch (err) {
      console.error('Error fetching shifts:', err);
    }
  };

  // Cargar waitlist
  const fetchWaitlist = async () => {
    try {
      const data = await waitlistService.getAll();
      setWaitlist(data);
    } catch (err) {
      console.error('Error fetching waitlist:', err);
    }
  };

  // Cargar reporte de no-shows
  const fetchNoShowReport = async () => {
    try {
      const data = await reportService.getNoShowReport();
      setNoShowReport(data);
    } catch (err) {
      console.error('Error fetching no-show report:', err);
    }
  };

  // Cargar recordatorios
  const fetchReminders = async () => {
    try {
      const data = await reminderService.getPending();
      setReminders(data);
    } catch (err) {
      console.error('Error fetching reminders:', err);
    }
  };

  // Cargar bloqueos
  const fetchBlocks = async () => {
    try {
      const data = await blockService.getAll();
      setBlocks(data);
    } catch (err) {
      console.error('Error fetching blocks:', err);
    }
  };

  // Efecto inicial
  useEffect(() => {
    fetchDashboard();
    fetchShifts();
    fetchWaitlist();
    fetchReminders();
    fetchBlocks();
  }, []);

  // Handler para crear turno
  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await shiftService.create(newShift);
      await fetchShifts();
      setNewShift({
        name: '',
        shift_type: 'lunch',
        start_time: '',
        end_time: '',
        max_reservations: 0,
        max_covers: 0,
        overbooking_percentage: 10,
        days_of_week: [],
        is_active: true
      });
      alert('Turno creado exitosamente');
    } catch (err: any) {
      alert('Error al crear turno: ' + err.message);
    }
  };

  // Handler para agregar a waitlist
  const handleAddToWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await waitlistService.add(newWaitlistEntry);
      await fetchWaitlist();
      setNewWaitlistEntry({
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        party_size: 2,
        requested_date: new Date().toISOString().slice(0, 10),
        preferred_time: '',
        flexible_time: true,
        notes: ''
      });
      alert('Cliente agregado a lista de espera');
    } catch (err: any) {
      alert('Error al agregar a lista de espera: ' + err.message);
    }
  };

  // Handler para convertir waitlist a reserva
  const handleConvertWaitlist = async (waitlistId: number) => {
    try {
      await waitlistService.convert(waitlistId, {});
      await fetchWaitlist();
      await fetchDashboard();
      alert('Convertido a reserva exitosamente');
    } catch (err: any) {
      alert('Error al convertir: ' + err.message);
    }
  };

  // Handler para crear bloqueo
  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await blockService.create(newBlock);
      await fetchBlocks();
      setNewBlock({
        block_type: 'full_day',
        block_date: new Date().toISOString().slice(0, 10),
        start_time: '',
        end_time: '',
        reason: ''
      });
      alert('Bloqueo creado exitosamente');
    } catch (err: any) {
      alert('Error al crear bloqueo: ' + err.message);
    }
  };

  // Handler para eliminar bloqueo
  const handleDeleteBlock = async (blockId: number) => {
    if (!confirm('¿Eliminar este bloqueo?')) return;
    try {
      await blockService.delete(blockId);
      await fetchBlocks();
      alert('Bloqueo eliminado');
    } catch (err: any) {
      alert('Error al eliminar bloqueo: ' + err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando sistema de reservas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
          <h3 className="text-red-600 font-bold text-xl mb-2">Error</h3>
          <p className="text-gray-700">{error}</p>
          <button
            onClick={fetchDashboard}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Sistema Avanzado de Reservas</h1>
        <p className="text-gray-600 mt-1">Bienvenido, {user?.username}</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-4 overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'shifts', label: 'Turnos', icon: '⏰' },
            { id: 'waitlist', label: 'Lista de Espera', icon: '📝' },
            { id: 'no-shows', label: 'No-Shows', icon: '⚠️' },
            { id: 'reminders', label: 'Recordatorios', icon: '🔔' },
            { id: 'widget', label: 'Widget Público', icon: '🌐' },
            { id: 'blocks', label: 'Bloqueos', icon: '🚫' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && dashboard && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Reservas Hoy</h3>
              <p className="text-3xl font-bold text-blue-600">{dashboard.today.stats.total}</p>
              <p className="text-sm text-gray-500 mt-1">
                {dashboard.today.stats.confirmed} confirmadas
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Cubiertos</h3>
              <p className="text-3xl font-bold text-green-600">{dashboard.today.stats.total_covers}</p>
              <p className="text-sm text-gray-500 mt-1">
                {dashboard.today.stats.seated} sentados
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Lista de Espera</h3>
              <p className="text-3xl font-bold text-yellow-600">{dashboard.today.waitlist.length}</p>
              <p className="text-sm text-gray-500 mt-1">personas esperando</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">No-Shows</h3>
              <p className="text-3xl font-bold text-red-600">{dashboard.today.stats.no_shows}</p>
              <p className="text-sm text-gray-500 mt-1">
                {dashboard.today.stats.cancelled} canceladas
              </p>
            </div>
          </div>

          {/* Turnos Activos */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-bold text-gray-900 mb-4">🕐 Turnos de Hoy</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {dashboard.shifts.map((shift) => (
                <div
                  key={shift.id}
                  className={`p-4 rounded-lg border-2 ${
                    shift.is_active ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-gray-900">{shift.name}</h4>
                    <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                      {reservationUtils.getShiftLabel(shift.shift_type)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {reservationUtils.formatTime(shift.start_time)} - {reservationUtils.formatTime(shift.end_time)}
                  </p>
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Reservas:</span>
                      <span className="font-semibold">
                        {shift.current_reservations || 0} / {shift.max_reservations}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Cubiertos:</span>
                      <span className="font-semibold">
                        {shift.current_covers || 0} / {shift.max_covers}
                      </span>
                    </div>
                    {shift.occupancy_percentage !== undefined && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              reservationUtils.calculateOccupancyColor(shift.occupancy_percentage) === 'red'
                                ? 'bg-red-600'
                                : reservationUtils.calculateOccupancyColor(shift.occupancy_percentage) === 'orange'
                                ? 'bg-orange-500'
                                : reservationUtils.calculateOccupancyColor(shift.occupancy_percentage) === 'yellow'
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(shift.occupancy_percentage, 100)}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 text-right">
                          {shift.occupancy_percentage.toFixed(0)}% ocupado
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lista de espera actual */}
          {dashboard.today.waitlist.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-bold text-gray-900 mb-4">📝 Lista de Espera Hoy</h3>
              <div className="space-y-2">
                {dashboard.today.waitlist.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center font-bold">
                        {entry.position}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{entry.customer_name}</p>
                        <p className="text-sm text-gray-600">
                          {entry.party_size} personas • {entry.customer_phone}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs px-2 py-1 rounded bg-yellow-200 text-yellow-800">
                        {reservationUtils.getStatusLabel(entry.status)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Próximas reservas */}
          {dashboard.upcoming.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-bold text-gray-900 mb-4">📅 Próximos Días</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {dashboard.upcoming.slice(0, 7).map((day) => (
                  <div key={day.date} className="p-4 bg-blue-50 rounded-lg text-center">
                    <p className="text-sm font-semibold text-gray-600">
                      {new Date(day.date).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{day.count}</p>
                    <p className="text-xs text-gray-600">{day.covers} cubiertos</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Shifts Tab */}
      {activeTab === 'shifts' && (
        <div className="space-y-6">
          {/* Formulario nuevo turno */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-bold text-gray-900 mb-4">➕ Crear Nuevo Turno</h3>
            <form onSubmit={handleCreateShift} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={newShift.name}
                  onChange={(e) => setNewShift({ ...newShift, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={newShift.shift_type}
                  onChange={(e) => setNewShift({ ...newShift, shift_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="lunch">Almuerzo</option>
                  <option value="dinner">Cena</option>
                  <option value="brunch">Brunch</option>
                  <option value="late_night">Trasnoche</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hora Inicio</label>
                <input
                  type="time"
                  value={newShift.start_time}
                  onChange={(e) => setNewShift({ ...newShift, start_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hora Fin</label>
                <input
                  type="time"
                  value={newShift.end_time}
                  onChange={(e) => setNewShift({ ...newShift, end_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Máx. Reservas</label>
                <input
                  type="number"
                  value={newShift.max_reservations}
                  onChange={(e) => setNewShift({ ...newShift, max_reservations: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Máx. Cubiertos</label>
                <input
                  type="number"
                  value={newShift.max_covers}
                  onChange={(e) => setNewShift({ ...newShift, max_covers: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
                >
                  Crear Turno
                </button>
              </div>
            </form>
          </div>

          {/* Lista de turnos */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-bold text-gray-900 mb-4">📋 Turnos Configurados</h3>
            <div className="space-y-3">
              {shifts.map((shift) => (
                <div key={shift.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-gray-900">{shift.name}</h4>
                      <p className="text-sm text-gray-600">
                        {reservationUtils.getShiftLabel(shift.shift_type)} • {reservationUtils.formatTime(shift.start_time)} - {reservationUtils.formatTime(shift.end_time)}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Máx: {shift.max_reservations} reservas / {shift.max_covers} cubiertos
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        shift.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {shift.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Waitlist Tab */}
      {activeTab === 'waitlist' && (
        <div className="space-y-6">
          {/* Formulario nueva entrada */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-bold text-gray-900 mb-4">➕ Agregar a Lista de Espera</h3>
            <form onSubmit={handleAddToWaitlist} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={newWaitlistEntry.customer_name}
                  onChange={(e) => setNewWaitlistEntry({ ...newWaitlistEntry, customer_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={newWaitlistEntry.customer_phone}
                  onChange={(e) => setNewWaitlistEntry({ ...newWaitlistEntry, customer_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newWaitlistEntry.customer_email}
                  onChange={(e) => setNewWaitlistEntry({ ...newWaitlistEntry, customer_email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Personas</label>
                <input
                  type="number"
                  value={newWaitlistEntry.party_size}
                  onChange={(e) => setNewWaitlistEntry({ ...newWaitlistEntry, party_size: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                <input
                  type="date"
                  value={newWaitlistEntry.requested_date}
                  onChange={(e) => setNewWaitlistEntry({ ...newWaitlistEntry, requested_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hora Preferida</label>
                <input
                  type="time"
                  value={newWaitlistEntry.preferred_time}
                  onChange={(e) => setNewWaitlistEntry({ ...newWaitlistEntry, preferred_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  value={newWaitlistEntry.notes}
                  onChange={(e) => setNewWaitlistEntry({ ...newWaitlistEntry, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="w-full bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 font-medium"
                >
                  Agregar a Lista de Espera
                </button>
              </div>
            </form>
          </div>

          {/* Lista de espera */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-bold text-gray-900 mb-4">📝 Clientes en Espera ({waitlist.length})</h3>
            <div className="space-y-3">
              {waitlist.map((entry) => (
                <div key={entry.id} className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-yellow-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                        {entry.position}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{entry.customer_name}</h4>
                        <p className="text-sm text-gray-600">
                          📞 {entry.customer_phone} {entry.customer_email && `• ✉️ ${entry.customer_email}`}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          👥 {entry.party_size} personas • 📅 {new Date(entry.requested_date).toLocaleDateString('es-CL')}
                          {entry.preferred_time && ` • 🕐 ${reservationUtils.formatTime(entry.preferred_time)}`}
                        </p>
                        {entry.notes && (
                          <p className="text-sm text-gray-600 mt-1 italic">💬 {entry.notes}</p>
                        )}
                        <div className="mt-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            entry.status === 'waiting' ? 'bg-yellow-200 text-yellow-800' :
                            entry.status === 'notified' ? 'bg-blue-200 text-blue-800' :
                            entry.status === 'converted' ? 'bg-green-200 text-green-800' :
                            'bg-gray-200 text-gray-800'
                          }`}>
                            {reservationUtils.getStatusLabel(entry.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {entry.status === 'waiting' && (
                      <button
                        onClick={() => handleConvertWaitlist(entry.id)}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex-shrink-0"
                      >
                        ✓ Convertir a Reserva
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* No-Shows Tab */}
      {activeTab === 'no-shows' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-bold text-gray-900 mb-4">⚠️ Reporte de No-Shows</h3>
            <p className="text-gray-600">
              Sistema de seguimiento y penalizaciones para clientes que no asisten a sus reservas.
            </p>
            <button
              onClick={fetchNoShowReport}
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Cargar Reporte
            </button>
            {noShowReport && (
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-gray-600">Total No-Shows</p>
                    <p className="text-2xl font-bold text-red-600">{noShowReport.summary.total_no_shows}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600">Completadas</p>
                    <p className="text-2xl font-bold text-green-600">{noShowReport.summary.total_completed}</p>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-gray-600">Tasa No-Show</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {noShowReport.summary.overall_no_show_rate.toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">Total Reservas</p>
                    <p className="text-2xl font-bold text-blue-600">{noShowReport.summary.total_reservations}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reminders Tab */}
      {activeTab === 'reminders' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-bold text-gray-900 mb-4">🔔 Recordatorios Pendientes ({reminders.length})</h3>
            <div className="space-y-3">
              {reminders.map((reminder) => (
                <div key={reminder.id} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {reminder.customer_name} - {reminder.party_size} personas
                      </p>
                      <p className="text-sm text-gray-600">
                        📅 {new Date(reminder.reservation_date || '').toLocaleDateString('es-CL')}
                        • 🕐 {reminder.reservation_time && reservationUtils.formatTime(reminder.reservation_time)}
                      </p>
                      <p className="text-sm text-gray-600">
                        📞 {reminder.customer_phone} • Enviar: {new Date(reminder.scheduled_at).toLocaleString('es-CL')}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded text-sm font-medium ${
                      reminder.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      reminder.status === 'sent' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {reminder.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Widget Tab */}
      {activeTab === 'widget' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-bold text-gray-900 mb-4">🌐 Widget de Reservas Público</h3>
            <p className="text-gray-600 mb-4">
              Configura el widget público para que tus clientes puedan hacer reservas desde tu sitio web.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                💡 El widget permite a los clientes hacer reservas directamente desde tu sitio web,
                con personalización de colores, mensajes y restricciones.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Blocks Tab */}
      {activeTab === 'blocks' && (
        <div className="space-y-6">
          {/* Formulario nuevo bloqueo */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-bold text-gray-900 mb-4">➕ Crear Bloqueo</h3>
            <form onSubmit={handleCreateBlock} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Bloqueo</label>
                <select
                  value={newBlock.block_type}
                  onChange={(e) => setNewBlock({ ...newBlock, block_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="full_day">Día Completo</option>
                  <option value="time_range">Rango de Horas</option>
                  <option value="specific_tables">Mesas Específicas</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                <input
                  type="date"
                  value={newBlock.block_date}
                  onChange={(e) => setNewBlock({ ...newBlock, block_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {newBlock.block_type === 'time_range' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hora Inicio</label>
                    <input
                      type="time"
                      value={newBlock.start_time}
                      onChange={(e) => setNewBlock({ ...newBlock, start_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hora Fin</label>
                    <input
                      type="time"
                      value={newBlock.end_time}
                      onChange={(e) => setNewBlock({ ...newBlock, end_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Razón</label>
                <textarea
                  value={newBlock.reason}
                  onChange={(e) => setNewBlock({ ...newBlock, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Ej: Evento privado, Mantenimiento, Cerrado por festivo"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium"
                >
                  Crear Bloqueo
                </button>
              </div>
            </form>
          </div>

          {/* Lista de bloqueos */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-bold text-gray-900 mb-4">🚫 Bloqueos Activos ({blocks.length})</h3>
            <div className="space-y-3">
              {blocks.map((block) => (
                <div key={block.id} className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-gray-900">
                        {block.block_type === 'full_day' ? '🚫 Día Completo' :
                         block.block_type === 'time_range' ? '⏰ Rango de Horas' :
                         '🪑 Mesas Específicas'}
                      </h4>
                      <p className="text-sm text-gray-600">
                        📅 {new Date(block.block_date).toLocaleDateString('es-CL')}
                        {block.start_time && ` • ${reservationUtils.formatTime(block.start_time)} - ${reservationUtils.formatTime(block.end_time || '')}`}
                      </p>
                      {block.reason && (
                        <p className="text-sm text-gray-600 mt-1 italic">💬 {block.reason}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Creado: {new Date(block.created_at).toLocaleString('es-CL')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteBlock(block.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 flex-shrink-0"
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedReservationsPage;
