/**
 * Table Map - Mapa Visual de Mesas
 * Vista principal del POS con drag-and-drop de mesas
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { tablesService, Table, Salon } from '@/api/tablesService';
import { cashService, CashSession } from '@/api/cashService';
import CashSessionStatus from '@/components/cash/CashSessionStatus';
import OpenCashSessionModal from '@/components/cash/OpenCashSessionModal';
import CloseCashSessionModal from '@/components/cash/CloseCashSessionModal';
import {
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Settings,
  LogOut,
  Grid,
  Plus
} from 'lucide-react';

// Colores según estado de mesa
const TABLE_COLORS = {
  free: 'bg-green-100 border-green-400 hover:bg-green-200',
  occupied: 'bg-red-100 border-red-400 hover:bg-red-200',
  reserved: 'bg-yellow-100 border-yellow-400 hover:bg-yellow-200',
  cleaning: 'bg-gray-100 border-gray-400 hover:bg-gray-200'
};

const TABLE_STATUS_ICONS = {
  free: <CheckCircle className="w-4 h-4 text-green-600" />,
  occupied: <Users className="w-4 h-4 text-red-600" />,
  reserved: <Clock className="w-4 h-4 text-yellow-600" />,
  cleaning: <AlertCircle className="w-4 h-4 text-gray-600" />
};

const TABLE_STATUS_TEXT = {
  free: 'Libre',
  occupied: 'Ocupada',
  reserved: 'Reservada',
  cleaning: 'Limpieza'
};

interface DraggingState {
  tableId: number;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
}

const TableMap: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const mapRef = useRef<HTMLDivElement>(null);

  // Estados
  const [tables, setTables] = useState<Table[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [selectedSalon, setSelectedSalon] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState<DraggingState | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Estados de caja
  const [cashSession, setCashSession] = useState<CashSession | null>(null);
  const [showOpenCashModal, setShowOpenCashModal] = useState(false);
  const [showCloseCashModal, setShowCloseCashModal] = useState(false);

  useEffect(() => {
    loadData();
    loadCashSession();
  }, []);

  useEffect(() => {
    if (selectedSalon) {
      loadTables();
    }
  }, [selectedSalon]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [salonsData] = await Promise.all([
        tablesService.getSalons()
      ]);
      setSalons(salonsData);

      // Seleccionar primer salón por defecto
      if (salonsData.length > 0) {
        setSelectedSalon(salonsData[0].id);
      }
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('Error cargando la información');
    } finally {
      setLoading(false);
    }
  };

  const loadTables = async () => {
    try {
      const tablesData = await tablesService.getTables(selectedSalon || undefined);
      setTables(tablesData);
    } catch (err) {
      console.error('Error cargando mesas:', err);
    }
  };

  const loadCashSession = async () => {
    try {
      const sessionData = await cashService.getCurrentSession();
      setCashSession(sessionData.session);
    } catch (err) {
      console.error('Error cargando sesión de caja:', err);
    }
  };

  const handleTableClick = (table: Table) => {
    if (editMode) return; // No navegar en modo edición

    if (table.status === 'free') {
      // Navegar a POSVentas con esta mesa
      navigate('/pos/ventas', { state: { selectedTable: table } });
    } else if (table.status === 'occupied') {
      // Navegar a la venta existente
      navigate('/pos/ventas', { state: { selectedTable: table } });
    }
  };

  // Drag and Drop handlers
  const handleMouseDown = (e: React.MouseEvent, table: Table) => {
    if (!editMode) return;

    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setDragging({
      tableId: table.id,
      startX: table.position_x,
      startY: table.position_y,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !mapRef.current) return;

    const mapRect = mapRef.current.getBoundingClientRect();
    const newX = e.clientX - mapRect.left - dragging.offsetX;
    const newY = e.clientY - mapRect.top - dragging.offsetY;

    // Actualizar posición temporalmente (sin guardar)
    setTables(prevTables =>
      prevTables.map(t =>
        t.id === dragging.tableId
          ? { ...t, position_x: Math.max(0, newX), position_y: Math.max(0, newY) }
          : t
      )
    );
  };

  const handleMouseUp = async () => {
    if (!dragging) return;

    const table = tables.find(t => t.id === dragging.tableId);
    if (table) {
      try {
        // Guardar la nueva posición en el servidor
        await tablesService.updateTablePosition(
          table.id,
          table.position_x,
          table.position_y
        );
      } catch (err) {
        console.error('Error actualizando posición:', err);
        // Revertir a posición original
        setTables(prevTables =>
          prevTables.map(t =>
            t.id === dragging.tableId
              ? { ...t, position_x: dragging.startX, position_y: dragging.startY }
              : t
          )
        );
      }
    }

    setDragging(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/pos/login');
  };

  const handleOpenCashSession = () => setShowOpenCashModal(true);
  const handleCloseCashSession = () => setShowCloseCashModal(true);

  const handleCashSessionOpened = async () => {
    await loadCashSession();
    setShowOpenCashModal(false);
  };

  const handleCashSessionClosed = async () => {
    await loadCashSession();
    setShowCloseCashModal(false);
  };

  // Estadísticas rápidas
  const stats = {
    total: tables.length,
    free: tables.filter(t => t.status === 'free').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    reserved: tables.filter(t => t.status === 'reserved').length
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando mapa de mesas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-blue-600 text-white px-6 py-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Grid className="w-6 h-6" />
            <div>
              <h1 className="text-xl font-bold">Mapa de Mesas - SYSME POS</h1>
              <p className="text-blue-100 text-sm">{user?.assigned_tpv || 'TPV Principal'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-semibold">{user?.username}</p>
              <p className="text-blue-200 text-xs">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Cash Session Status */}
      <div className="px-6 py-3 bg-white border-b border-gray-200">
        <CashSessionStatus
          session={cashSession}
          onOpenSession={handleOpenCashSession}
          onCloseSession={handleCloseCashSession}
        />
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Selector de Salón */}
          <div className="flex items-center gap-4">
            <label className="font-medium text-gray-700">Salón:</label>
            <select
              value={selectedSalon || ''}
              onChange={(e) => setSelectedSalon(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {salons.map(salon => (
                <option key={salon.id} value={salon.id}>
                  {salon.name}
                </option>
              ))}
            </select>
          </div>

          {/* Estadísticas */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <span className="text-gray-600">Libres: <strong>{stats.free}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <span className="text-gray-600">Ocupadas: <strong>{stats.occupied}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <span className="text-gray-600">Reservadas: <strong>{stats.reserved}</strong></span>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditMode(!editMode)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                editMode
                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Settings className="w-4 h-4" />
              {editMode ? 'Guardar Layout' : 'Editar Layout'}
            </button>
          </div>
        </div>
      </div>

      {/* Mapa de Mesas */}
      <div className="flex-1 p-6 overflow-auto">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {editMode && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Modo Edición:</strong> Arrastra las mesas para reorganizar el layout.
              Las posiciones se guardarán automáticamente.
            </p>
          </div>
        )}

        <div
          ref={mapRef}
          className="relative bg-white rounded-lg border-2 border-gray-300 min-h-[600px] w-full"
          style={{ height: 'calc(100vh - 320px)' }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {tables.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Grid className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No hay mesas en este salón</p>
                <p className="text-sm mt-2">Agrega mesas desde el panel de administración</p>
              </div>
            </div>
          ) : (
            tables.map(table => (
              <div
                key={table.id}
                className={`absolute w-24 h-24 rounded-lg border-2 flex flex-col items-center justify-center cursor-pointer transition-all shadow-md ${
                  TABLE_COLORS[table.status]
                } ${editMode ? 'cursor-move' : 'cursor-pointer'}`}
                style={{
                  left: `${table.position_x}px`,
                  top: `${table.position_y}px`,
                  userSelect: 'none'
                }}
                onMouseDown={(e) => handleMouseDown(e, table)}
                onClick={() => !dragging && handleTableClick(table)}
              >
                {TABLE_STATUS_ICONS[table.status]}
                <p className="font-bold text-lg mt-1">{table.table_number}</p>
                <p className="text-xs text-gray-600">{TABLE_STATUS_TEXT[table.status]}</p>
                {table.tarifa_name && (
                  <p className="text-xs text-gray-500">{table.tarifa_name}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modales */}
      <OpenCashSessionModal
        isOpen={showOpenCashModal}
        onClose={() => setShowOpenCashModal(false)}
        onSuccess={handleCashSessionOpened}
      />

      {cashSession && (
        <CloseCashSessionModal
          isOpen={showCloseCashModal}
          onClose={() => setShowCloseCashModal(false)}
          onSuccess={handleCashSessionClosed}
          session={cashSession}
        />
      )}
    </div>
  );
};

export default TableMap;
