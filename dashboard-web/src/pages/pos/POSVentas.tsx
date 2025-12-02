import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import ProductModifiersSelectionModal, { SelectedModifier } from '@/components/ProductModifiersSelectionModal';
import MixedPaymentModal from '@/components/MixedPaymentModal';
import SplitBillModal from '@/components/SplitBillModal';
import TipSelectionModal from '@/components/TipSelectionModal';
import OpenCashSessionModal from '@/components/cash/OpenCashSessionModal';
import CloseCashSessionModal from '@/components/cash/CloseCashSessionModal';
import CashSessionStatus from '@/components/cash/CashSessionStatus';
import { salesService, PaymentDetails } from '@/api/salesService';
import { cashService, CashSession } from '@/api/cashService';
import tipsService from '@/api/tipsService';

// Nuevos componentes integrados
import VirtualKeyboard from '@/components/ui/VirtualKeyboard';
import QuickNotes from '@/components/kitchen/QuickNotes';
import FavoritesFilter from '@/components/pos/FavoritesFilter';
import PaymentMethodsExtended from '@/components/pos/PaymentMethodsExtended';
import PendingSalesBadge from '@/components/layout/PendingSalesBadge';
import useKeyboardShortcuts from '@/hooks/useKeyboardShortcuts';

interface Mesa {
  id: number;
  table_number: string;
  salon_name: string;
  status: string;
  tarifa_name: string;
  tarifa_multiplier: number;
}

interface Product {
  id: number;
  name: string;
  price: number;
  category_name: string;
  stock_quantity: number;
}

interface SaleItem {
  id?: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  notes?: string;
  modifiers?: Array<{
    modifier_id: number;
    modifier_name: string;
    modifier_price: number;
    group_name: string;
  }>;
}

interface Sale {
  id?: number;
  sale_number?: string;
  table_id: number;
  table_number: string;
  tarifa_name: string;
  tarifa_multiplier: number;
  items: SaleItem[];
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  status: 'open' | 'completed';
}

const POSVentas: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  
  const handleLogout = () => {
    logout();
    navigate('/pos/login');
  };

  // Estado principal
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentSale, setCurrentSale] = useState<Sale | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMesa, setSelectedMesa] = useState<Mesa | null>(null);

  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showMesaSelector, setShowMesaSelector] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [showModifiersModal, setShowModifiersModal] = useState(false);
  const [selectedProductForModifiers, setSelectedProductForModifiers] = useState<Product | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [availableTablesForTransfer, setAvailableTablesForTransfer] = useState<Mesa[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showMixedPaymentModal, setShowMixedPaymentModal] = useState(false);
  const [showSplitBillModal, setShowSplitBillModal] = useState(false);

  // Estados del sistema de propinas
  const [showTipModal, setShowTipModal] = useState(false);
  const [tipAmount, setTipAmount] = useState(0);
  const [tipPercentage, setTipPercentage] = useState<number | null>(null);
  const [tipMethod, setTipMethod] = useState<'percentage' | 'fixed' | 'custom'>('custom');
  const [tipPresetId, setTipPresetId] = useState<number | undefined>(undefined);
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState<string>('');

  // Estados del sistema de cajas
  const [cashSession, setCashSession] = useState<CashSession | null>(null);
  const [showOpenCashModal, setShowOpenCashModal] = useState(false);
  const [showCloseCashModal, setShowCloseCashModal] = useState(false);

  // Estados de los nuevos componentes integrados
  const [showVirtualKeyboard, setShowVirtualKeyboard] = useState(false);
  const [keyboardValue, setKeyboardValue] = useState('');
  const [keyboardMode, setKeyboardMode] = useState<'numeric' | 'full' | 'calculator'>('numeric');
  const [selectedItemForQuantity, setSelectedItemForQuantity] = useState<SaleItem | null>(null);
  const [showQuickNotes, setShowQuickNotes] = useState(false);
  const [selectedItemForNotes, setSelectedItemForNotes] = useState<SaleItem | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]);
  const [showPaymentMethodsExtended, setShowPaymentMethodsExtended] = useState(false);

  // Keyboard Shortcuts Integration
  useKeyboardShortcuts({
    onNewSale: () => setShowMesaSelector(true),
    onFinalize: () => currentSale && startPaymentProcess(),
    onCancel: () => setCurrentSale(null),
    onReprintLast: () => {/* Implementar reimpresión */},
    onOpenSales: () => navigate('/pos/parked'),
    onKitchen: () => navigate('/pos/kitchen'),
    userId: user?.id.toString() || ''
  });

  useEffect(() => {
    loadMesas();
    loadProducts();
    loadCashSession();
  }, []);

  const loadCashSession = async () => {
    try {
      const sessionData = await cashService.getCurrentSession();
      setCashSession(sessionData.session);
    } catch (err) {
      console.error('Error cargando sesión de caja:', err);
    }
  };

  const handleOpenCashSession = () => {
    setShowOpenCashModal(true);
  };

  const handleCloseCashSession = () => {
    if (cashSession) {
      setShowCloseCashModal(true);
    }
  };

  const handleCashSessionOpened = async () => {
    await loadCashSession();
    setShowOpenCashModal(false);
  };

  const handleCashSessionClosed = async () => {
    await loadCashSession();
    setShowCloseCashModal(false);
  };

  const loadMesas = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/v1/tables', {
        headers: {
          'Authorization': `Bearer ${user?.token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setMesas(data.tables.filter((m: Mesa) => m.status === 'free'));
      }
    } catch (err) {
      setError('Error cargando mesas');
    }
  };

  const loadProducts = async () => {
    try {
      // Como no tenemos endpoint de products funcional, usaremos datos mock
      const mockProducts: Product[] = [
        { id: 1, name: 'Coca Cola', price: 2500, category_name: 'Bebidas', stock_quantity: 100 },
        { id: 2, name: 'Hamburguesa Clásica', price: 8900, category_name: 'Comidas', stock_quantity: 50 },
        { id: 3, name: 'Papas Fritas', price: 3500, category_name: 'Comidas', stock_quantity: 75 },
        { id: 4, name: 'Tiramisu', price: 4500, category_name: 'Postres', stock_quantity: 20 },
        { id: 5, name: 'Menú Completo', price: 12900, category_name: 'Packs', stock_quantity: 30 },
      ];
      setProducts(mockProducts);
    } catch (err) {
      setError('Error cargando productos');
    }
  };

  const startNewSale = (mesa: Mesa) => {
    const newSale: Sale = {
      table_id: mesa.id,
      table_number: mesa.table_number,
      tarifa_name: mesa.tarifa_name,
      tarifa_multiplier: mesa.tarifa_multiplier,
      items: [],
      subtotal: 0,
      vat_amount: 0,
      total_amount: 0,
      status: 'open'
    };

    setCurrentSale(newSale);
    setSelectedMesa(mesa);
    setShowMesaSelector(false);
  };

  const addProductToSale = (product: Product) => {
    if (!currentSale) return;

    // Open modifiers modal for customization
    setSelectedProductForModifiers(product);
    setShowModifiersModal(true);
    setShowProductSearch(false);
  };

  const handleModifiersConfirm = (selectedModifiers: SelectedModifier[], modifierCost: number) => {
    if (!currentSale || !selectedProductForModifiers) return;

    const product = selectedProductForModifiers;

    // Calculate base price with tariff
    const basePrice = product.price * currentSale.tarifa_multiplier;

    // Calculate total unit price including modifiers
    const unitPriceWithModifiers = basePrice + modifierCost;

    // Create new item with modifiers
    const newItem: SaleItem = {
      product_id: product.id,
      product_name: product.name,
      quantity: 1,
      unit_price: unitPriceWithModifiers,
      total: unitPriceWithModifiers,
      modifiers: selectedModifiers.map(m => ({
        modifier_id: m.modifier_id,
        modifier_name: m.modifier_name,
        modifier_price: m.modifier_price,
        group_name: m.group_name
      }))
    };

    const updatedItems = [...currentSale.items, newItem];

    // Recalcular totales
    const subtotal = updatedItems.reduce((sum, item) => sum + item.total, 0);
    const vat_amount = subtotal * 0.19; // 19% IVA
    const total_amount = subtotal + vat_amount;

    setCurrentSale({
      ...currentSale,
      items: updatedItems,
      subtotal,
      vat_amount,
      total_amount
    });

    // Close modal and reset selection
    setShowModifiersModal(false);
    setSelectedProductForModifiers(null);
  };

  const updateItemQuantity = (productId: number, newQuantity: number) => {
    if (!currentSale) return;

    if (newQuantity <= 0) {
      removeItem(productId);
      return;
    }

    const updatedItems = currentSale.items.map(item =>
      item.product_id === productId
        ? { ...item, quantity: newQuantity, total: item.unit_price * newQuantity }
        : item
    );

    const subtotal = updatedItems.reduce((sum, item) => sum + item.total, 0);
    const vat_amount = subtotal * 0.19;
    const total_amount = subtotal + vat_amount;

    setCurrentSale({
      ...currentSale,
      items: updatedItems,
      subtotal,
      vat_amount,
      total_amount
    });
  };

  const removeItem = (productId: number) => {
    if (!currentSale) return;

    const updatedItems = currentSale.items.filter(item => item.product_id !== productId);
    const subtotal = updatedItems.reduce((sum, item) => sum + item.total, 0);
    const vat_amount = subtotal * 0.19;
    const total_amount = subtotal + vat_amount;

    setCurrentSale({
      ...currentSale,
      items: updatedItems,
      subtotal,
      vat_amount,
      total_amount
    });
  };

  // FUNCIONALIDAD CRÍTICA: Transferencia de Mesa (Backend API)
  const handleTransferTable = async () => {
    if (!currentSale || !currentSale.id) {
      setError('No hay una venta guardada para transferir');
      return;
    }

    // Load available tables for transfer
    try {
      const response = await fetch('http://localhost:3001/api/v1/tables', {
        headers: {
          'Authorization': `Bearer ${user?.token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        // Show only free tables, excluding current table
        const available = data.tables.filter((m: Mesa) =>
          m.status === 'free' && m.id !== currentSale.table_id
        );
        setAvailableTablesForTransfer(available);
        setShowTransferModal(true);
      }
    } catch (err) {
      setError('Error cargando mesas disponibles');
    }
  };

  const confirmTransferTable = async (newTableId: number) => {
    if (!currentSale || !currentSale.id) return;

    setLoading(true);
    try {
      const updatedSale = await salesService.transferTable(currentSale.id, newTableId);

      // Find the new table details
      const newTable = availableTablesForTransfer.find(t => t.id === newTableId);

      if (newTable) {
        // Update local state with the transferred sale
        setCurrentSale({
          ...currentSale,
          table_id: newTable.id,
          table_number: newTable.table_number,
          tarifa_name: newTable.tarifa_name,
          tarifa_multiplier: newTable.tarifa_multiplier
        });
        setSelectedMesa(newTable);
      }

      setShowTransferModal(false);
      setError('');
      alert(`✅ Venta transferida exitosamente a Mesa ${newTable?.table_number}`);

      // Reload tables to update statuses
      loadMesas();
    } catch (err: any) {
      setError(err.message || 'Error al transferir mesa');
    } finally {
      setLoading(false);
    }
  };

  // FUNCIONALIDAD: Cambio de mesa (solo para ventas nuevas sin guardar)
  const changeMesa = (newMesa: Mesa) => {
    if (!currentSale) return;

    // Si la venta ya está guardada en BD, usar transferencia
    if (currentSale.id) {
      setError('Use "Transferir Mesa" para ventas guardadas');
      return;
    }

    // Recalcular precios con nueva tarifa (solo para ventas no guardadas)
    const updatedItems = currentSale.items.map(item => {
      const product = products.find(p => p.id === item.product_id);
      if (!product) return item;

      const newUnitPrice = product.price * newMesa.tarifa_multiplier;
      return {
        ...item,
        unit_price: newUnitPrice,
        total: newUnitPrice * item.quantity
      };
    });

    const subtotal = updatedItems.reduce((sum, item) => sum + item.total, 0);
    const vat_amount = subtotal * 0.19;
    const total_amount = subtotal + vat_amount;

    setCurrentSale({
      ...currentSale,
      table_id: newMesa.id,
      table_number: newMesa.table_number,
      tarifa_name: newMesa.tarifa_name,
      tarifa_multiplier: newMesa.tarifa_multiplier,
      items: updatedItems,
      subtotal,
      vat_amount,
      total_amount
    });

    setSelectedMesa(newMesa);
    setShowMesaSelector(false);
  };

  const handleTipConfirm = (
    amount: number,
    percentage: number | null,
    method: 'percentage' | 'fixed' | 'custom',
    presetId?: number
  ) => {
    // Guardar datos de propina
    setTipAmount(amount);
    setTipPercentage(percentage);
    setTipMethod(method);
    setTipPresetId(presetId);

    // Cerrar modal de propina y abrir modal de pago
    setShowTipModal(false);
    setShowPaymentModal(true);
  };

  const startPaymentProcess = (method: string = '') => {
    if (!currentSale || currentSale.items.length === 0) return;

    // Guardar el método de pago pendiente y abrir modal de propinas
    setPendingPaymentMethod(method);
    setShowTipModal(true);
  };

  const handleSinglePayment = async (method: string) => {
    if (!currentSale) return;

    setLoading(true);
    setShowPaymentModal(false);

    try {
      // Calcular total con propina
      const totalWithTip = currentSale.total_amount + tipAmount;

      // Procesar venta
      const result = await salesService.process({
        table_id: currentSale.table_id,
        items: currentSale.items.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
          modifiers: item.modifiers
        })),
        subtotal: currentSale.subtotal,
        tax_amount: currentSale.vat_amount,
        total_amount: totalWithTip,
        payment_method: method
      });

      // Agregar propina a la venta si existe
      if (tipAmount > 0 && result?.data?.id) {
        try {
          await tipsService.sales.addTipToSale({
            sale_id: result.data.id,
            tip_amount: tipAmount,
            tip_percentage: tipPercentage,
            tip_method: tipMethod,
            calculation_base: currentSale.total_amount,
            preset_id: tipPresetId
          });
        } catch (tipErr) {
          console.error('Error agregando propina:', tipErr);
          // No fallar la venta si falla la propina
        }
      }

      alert(`✅ Venta finalizada!\nMesa: ${currentSale.table_number}\nSubtotal: $${currentSale.total_amount.toLocaleString()}${tipAmount > 0 ? `\nPropina: $${tipAmount.toLocaleString()}` : ''}\nTotal: $${totalWithTip.toLocaleString()}\nMétodo: ${method}`);

      // Limpiar venta actual y propina
      setCurrentSale(null);
      setSelectedMesa(null);
      setTipAmount(0);
      setTipPercentage(null);
      setTipMethod('custom');
      setTipPresetId(undefined);

      // Recargar mesas
      loadMesas();
    } catch (err: any) {
      setError(err.message || 'Error finalizando venta');
    } finally {
      setLoading(false);
    }
  };

  const handleMixedPayment = () => {
    setShowPaymentModal(false);
    setShowMixedPaymentModal(true);
  };

  const confirmMixedPayment = async (paymentDetails: PaymentDetails) => {
    if (!currentSale) return;

    setLoading(true);
    setShowMixedPaymentModal(false);

    try {
      // Calcular total con propina
      const totalWithTip = currentSale.total_amount + tipAmount;

      // Procesar venta
      const result = await salesService.process({
        table_id: currentSale.table_id,
        items: currentSale.items.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
          modifiers: item.modifiers
        })),
        subtotal: currentSale.subtotal,
        tax_amount: currentSale.vat_amount,
        total_amount: totalWithTip,
        payment_method: 'mixed',
        payment_details: paymentDetails
      });

      // Agregar propina a la venta si existe
      if (tipAmount > 0 && result?.data?.id) {
        try {
          await tipsService.sales.addTipToSale({
            sale_id: result.data.id,
            tip_amount: tipAmount,
            tip_percentage: tipPercentage,
            tip_method: tipMethod,
            calculation_base: currentSale.total_amount,
            preset_id: tipPresetId
          });
        } catch (tipErr) {
          console.error('Error agregando propina:', tipErr);
        }
      }

      const paymentSummary = paymentDetails.payments
        .map(p => `${p.method}: $${p.amount.toLocaleString()}`)
        .join('\n');

      alert(`✅ Venta finalizada con pago mixto!\nMesa: ${currentSale.table_number}\nSubtotal: $${currentSale.total_amount.toLocaleString()}${tipAmount > 0 ? `\nPropina: $${tipAmount.toLocaleString()}` : ''}\nTotal: $${totalWithTip.toLocaleString()}\n\n${paymentSummary}\n${paymentDetails.change ? `\nCambio: $${paymentDetails.change.toLocaleString()}` : ''}`);

      // Limpiar venta actual y propina
      setCurrentSale(null);
      setSelectedMesa(null);
      setTipAmount(0);
      setTipPercentage(null);
      setTipMethod('custom');
      setTipPresetId(undefined);

      // Recargar mesas
      loadMesas();
    } catch (err: any) {
      setError(err.message || 'Error finalizando venta');
    } finally {
      setLoading(false);
    }
  };

  const handleSplitBill = async (splits: any[], splitMethod: 'items' | 'equal' | 'custom') => {
    if (!currentSale || !currentSale.id) {
      setError('No hay una venta guardada para dividir');
      return;
    }

    setLoading(true);
    setShowSplitBillModal(false);

    try {
      const result = await salesService.splitSale(currentSale.id, splits, splitMethod);

      const splitsSummary = result.splits
        .map((s, i) => `División ${i + 1}: $${s.total.toLocaleString()} (${s.payment_method})`)
        .join('\n');

      alert(`✅ Cuenta dividida exitosamente!\n\n${splitsSummary}`);

      // Limpiar venta actual
      setCurrentSale(null);
      setSelectedMesa(null);

      // Recargar mesas
      loadMesas();
    } catch (err: any) {
      setError(err.message || 'Error al dividir cuenta');
    } finally {
      setLoading(false);
    }
  };

  // Handlers para nuevos componentes
  const handleFavoritesFilterChange = (showFavOnly: boolean, favs?: Product[]) => {
    setShowFavoritesOnly(showFavOnly);
    if (showFavOnly && favs) {
      setFavoriteProducts(favs);
    }
  };

  const handleQuickNoteSelect = (note: string) => {
    if (selectedItemForNotes && currentSale) {
      const updatedItems = currentSale.items.map(item =>
        item === selectedItemForNotes ? { ...item, notes: note } : item
      );
      setCurrentSale({ ...currentSale, items: updatedItems });
      setShowQuickNotes(false);
      setSelectedItemForNotes(null);
    }
  };

  const handleKeyboardInput = (value: string) => {
    setKeyboardValue(value);
  };

  const handleKeyboardConfirm = () => {
    if (selectedItemForQuantity && currentSale) {
      const quantity = parseFloat(keyboardValue);
      if (quantity > 0) {
        const updatedItems = currentSale.items.map(item =>
          item === selectedItemForQuantity
            ? { ...item, quantity, total: item.unit_price * quantity }
            : item
        );
        setCurrentSale({ ...currentSale, items: updatedItems });
        calculateTotals(updatedItems);
      }
    }
    setShowVirtualKeyboard(false);
    setKeyboardValue('');
    setSelectedItemForQuantity(null);
  };

  const openQuantityKeyboard = (item: SaleItem) => {
    setSelectedItemForQuantity(item);
    setKeyboardValue(item.quantity.toString());
    setKeyboardMode('numeric');
    setShowVirtualKeyboard(true);
  };

  const openNotesModal = (item: SaleItem) => {
    setSelectedItemForNotes(item);
    setShowQuickNotes(true);
  };

  const filteredProducts = (showFavoritesOnly ? favoriteProducts : products).filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Top Navigation Bar */}
      <header className="bg-blue-600 text-white px-6 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">🍽️</span>
          <div>
            <h1 className="text-xl font-bold">SYSME POS - Terminal Garzones</h1>
            <p className="text-blue-100 text-sm">{user?.assigned_tpv || 'TPV'}</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {/* Pending Sales Badge */}
          <PendingSalesBadge userId={user?.id?.toString() || ''} showAll={false} />

          <div className="text-right">
            <p className="font-semibold">{user?.username}</p>
            <p className="text-blue-200 text-xs">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <span>🚪</span>
            <span>Salir</span>
          </button>
        </div>
      </header>

      {/* Cash Session Status Banner */}
      <div className="px-6 py-3 bg-white border-b border-gray-200">
        <CashSessionStatus
          session={cashSession}
          onOpenSession={handleOpenCashSession}
          onCloseSession={handleCloseCashSession}
        />
      </div>

      {/* Main POS Content */}
      <div className="flex-1 flex bg-gray-50">
      {/* Panel Izquierdo - Productos y Acciones */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-blue-600 text-white">
          <h2 className="text-xl font-bold">💳 POS Ventas</h2>
          <p className="text-blue-100 text-sm">Sistema como Legacy</p>
        </div>

        {/* Mesa Actual */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          {selectedMesa ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Mesa Actual:</p>
                <p className="font-bold text-lg">{selectedMesa.table_number}</p>
                <p className="text-xs text-gray-500">
                  {selectedMesa.tarifa_name} ({selectedMesa.tarifa_multiplier}x)
                </p>
              </div>
              <button
                onClick={() => setShowMesaSelector(true)}
                className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600"
              >
                🔄 Cambiar Mesa
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowMesaSelector(true)}
              className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-bold"
            >
              🍽️ Seleccionar Mesa
            </button>
          )}
        </div>

        {/* Búsqueda de Productos */}
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={() => setShowProductSearch(!showProductSearch)}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 mb-3"
          >
            📦 {showProductSearch ? 'Ocultar' : 'Buscar'} Productos
          </button>

          {showProductSearch && (
            <div>
              {/* Favorites Filter Button */}
              <div className="mb-2">
                <FavoritesFilter
                  userId={user?.id?.toString() || ''}
                  onFilterChange={handleFavoritesFilterChange}
                />
              </div>

              <input
                type="text"
                placeholder="Buscar producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg mb-2"
              />
              <div className="max-h-60 overflow-y-auto space-y-1">
                {filteredProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => addProductToSale(product)}
                    disabled={!currentSale}
                    className="w-full text-left p-2 bg-gray-50 hover:bg-blue-50 rounded border disabled:opacity-50"
                  >
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-gray-600">
                      ${product.price.toLocaleString()} - {product.category_name}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Acciones Rápidas */}
        <div className="p-4 space-y-2">
          <button
            onClick={handleTransferTable}
            disabled={!currentSale || !currentSale.id}
            className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700 disabled:opacity-50 font-medium"
            title={!currentSale?.id ? 'Guarde la venta primero para transferir' : 'Transferir venta a otra mesa'}
          >
            🔄 Transferir Mesa
          </button>
          <button
            onClick={() => setShowSplitBillModal(true)}
            disabled={!currentSale || !currentSale.id}
            className="w-full bg-orange-600 text-white py-2 rounded hover:bg-orange-700 disabled:opacity-50 font-medium"
            title={!currentSale?.id ? 'Guarde la venta primero para dividir' : 'Dividir cuenta entre múltiples pagos'}
          >
            💰 Dividir Cuenta
          </button>
          <button
            onClick={() => setCurrentSale(null)}
            disabled={!currentSale}
            className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600 disabled:opacity-50"
          >
            ❌ Cancelar Venta
          </button>
        </div>
      </div>

      {/* Panel Central - Venta Actual */}
      <div className="flex-1 flex flex-col">
        {currentSale ? (
          <>
            {/* Lista de Items */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-bold">🧾 Venta en Curso</h3>
                  <p className="text-sm text-gray-600">
                    Mesa {currentSale.table_number} - {currentSale.tarifa_name}
                  </p>
                </div>

                <div className="divide-y divide-gray-200">
                  {currentSale.items.map((item, index) => (
                    <div key={`${item.product_id}-${index}`} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium">{item.product_name}</h4>
                          <p className="text-sm text-gray-600">
                            ${item.unit_price.toLocaleString()} c/u
                          </p>
                          {/* Show modifiers if present */}
                          {item.modifiers && item.modifiers.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {item.modifiers.map((mod, modIndex) => (
                                <div key={modIndex} className="flex items-center text-xs text-purple-600">
                                  <span className="mr-1">🔧</span>
                                  <span className="font-medium">{mod.modifier_name}</span>
                                  {mod.modifier_price !== 0 && (
                                    <span className="ml-1 text-gray-500">
                                      ({mod.modifier_price > 0 ? '+' : ''}${mod.modifier_price.toLocaleString()})
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Show notes if present */}
                          {item.notes && (
                            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                              <span className="font-semibold text-yellow-800">Nota: </span>
                              <span className="text-yellow-700">{item.notes}</span>
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="mt-2 flex space-x-1">
                            <button
                              onClick={() => openQuantityKeyboard(item)}
                              className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                              title="Cambiar cantidad"
                            >
                              🔢 Cant.
                            </button>
                            <button
                              onClick={() => openNotesModal(item)}
                              className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs hover:bg-yellow-200"
                              title="Agregar nota de cocina"
                            >
                              📝 Nota
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateItemQuantity(item.product_id, item.quantity - 1)}
                            className="w-8 h-8 bg-red-100 text-red-600 rounded hover:bg-red-200"
                          >
                            -
                          </button>
                          <span className="w-12 text-center font-bold">{item.quantity}</span>
                          <button
                            onClick={() => updateItemQuantity(item.product_id, item.quantity + 1)}
                            className="w-8 h-8 bg-green-100 text-green-600 rounded hover:bg-green-200"
                          >
                            +
                          </button>
                        </div>

                        <div className="w-24 text-right">
                          <p className="font-bold">${item.total.toLocaleString()}</p>
                        </div>

                        <button
                          onClick={() => removeItem(item.product_id)}
                          className="ml-2 w-8 h-8 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}

                  {currentSale.items.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                      <p>No hay productos en la venta</p>
                      <p className="text-sm">Busca y agrega productos para comenzar</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Panel de Totales */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="max-w-md ml-auto space-y-2">
                <div className="flex justify-between text-lg">
                  <span>Subtotal:</span>
                  <span>${currentSale.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span>IVA (19%):</span>
                  <span>${currentSale.vat_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xl font-bold border-t pt-2">
                  <span>TOTAL:</span>
                  <span>${currentSale.total_amount.toLocaleString()}</span>
                </div>

                <button
                  onClick={() => setShowPaymentMethodsExtended(true)}
                  disabled={loading || currentSale.items.length === 0}
                  className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 font-bold text-lg mt-4"
                >
                  {loading ? 'Procesando...' : '💳 PROCEDER AL PAGO'}
                </button>
                <button
                  onClick={() => startPaymentProcess()}
                  disabled={loading || currentSale.items.length === 0}
                  className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium text-sm mt-2"
                >
                  🔄 Pago Sistema Antiguo
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="text-6xl mb-4">🍽️</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Selecciona una Mesa</h3>
              <p className="text-gray-600">Para comenzar una nueva venta</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal Selector de Mesas */}
      {showMesaSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">🍽️ Seleccionar Mesa</h3>
              <button
                onClick={() => setShowMesaSelector(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✖️
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {mesas.map(mesa => (
                <button
                  key={mesa.id}
                  onClick={() => selectedMesa ? changeMesa(mesa) : startNewSale(mesa)}
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">🍽️</div>
                    <div className="font-bold">{mesa.table_number}</div>
                    <div className="text-sm text-gray-600">{mesa.salon_name}</div>
                    <div className="text-xs text-blue-600">
                      {mesa.tarifa_name} ({mesa.tarifa_multiplier}x)
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg">
          {error}
          <button
            onClick={() => setError('')}
            className="ml-2 text-white hover:text-gray-200"
          >
            ✖️
          </button>
        </div>
      )}

      {/* Product Modifiers Selection Modal */}
      {showModifiersModal && selectedProductForModifiers && (
        <ProductModifiersSelectionModal
          productId={selectedProductForModifiers.id}
          productName={selectedProductForModifiers.name}
          productPrice={selectedProductForModifiers.price * (currentSale?.tarifa_multiplier || 1)}
          isOpen={showModifiersModal}
          onClose={() => {
            setShowModifiersModal(false);
            setSelectedProductForModifiers(null);
          }}
          onConfirm={handleModifiersConfirm}
        />
      )}

      {/* Modal Transferencia de Mesa */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">🔄 Transferir Mesa</h3>
              <button
                onClick={() => setShowTransferModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✖️
              </button>
            </div>

            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-800">
                <strong>Mesa Actual:</strong> {currentSale?.table_number} - {currentSale?.tarifa_name}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Selecciona la mesa destino para transferir esta venta
              </p>
            </div>

            {availableTablesForTransfer.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-lg">😔 No hay mesas disponibles</p>
                <p className="text-sm">Todas las demás mesas están ocupadas</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {availableTablesForTransfer.map(mesa => (
                  <button
                    key={mesa.id}
                    onClick={() => confirmTransferTable(mesa.id)}
                    disabled={loading}
                    className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors disabled:opacity-50"
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">🍽️</div>
                      <div className="font-bold">{mesa.table_number}</div>
                      <div className="text-sm text-gray-600">{mesa.salon_name}</div>
                      <div className="text-xs text-purple-600">
                        {mesa.tarifa_name} ({mesa.tarifa_multiplier}x)
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Selección de Método de Pago */}
      {showPaymentModal && currentSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6 pb-4 border-b">
              <h3 className="text-xl font-bold">💳 Método de Pago</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✖️
              </button>
            </div>

            <div className="mb-6 bg-blue-50 border border-blue-200 rounded p-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total a Pagar:</span>
                <span className="text-2xl font-bold text-blue-700">
                  ${currentSale.total_amount.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleSinglePayment('cash')}
                className="w-full bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 font-medium text-lg flex items-center justify-center space-x-2"
              >
                <span>💵</span>
                <span>Efectivo</span>
              </button>

              <button
                onClick={() => handleSinglePayment('card')}
                className="w-full bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 font-medium text-lg flex items-center justify-center space-x-2"
              >
                <span>💳</span>
                <span>Tarjeta</span>
              </button>

              <button
                onClick={() => handleSinglePayment('transfer')}
                className="w-full bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 font-medium text-lg flex items-center justify-center space-x-2"
              >
                <span>🏦</span>
                <span>Transferencia</span>
              </button>

              <div className="border-t pt-3">
                <button
                  onClick={handleMixedPayment}
                  className="w-full bg-orange-600 text-white p-4 rounded-lg hover:bg-orange-700 font-medium text-lg flex items-center justify-center space-x-2"
                >
                  <span>💳💵</span>
                  <span>Pago Mixto</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pago Mixto */}
      {showMixedPaymentModal && currentSale && (
        <MixedPaymentModal
          isOpen={showMixedPaymentModal}
          total={currentSale.total_amount}
          onClose={() => setShowMixedPaymentModal(false)}
          onConfirm={confirmMixedPayment}
        />
      )}

      {/* Modal Dividir Cuenta */}
      {showSplitBillModal && currentSale && currentSale.id && (
        <SplitBillModal
          isOpen={showSplitBillModal}
          saleId={currentSale.id}
          saleTotal={currentSale.total_amount}
          items={currentSale.items}
          onClose={() => setShowSplitBillModal(false)}
          onConfirm={handleSplitBill}
        />
      )}

      {/* Modal Propinas */}
      {showTipModal && currentSale && (
        <TipSelectionModal
          isOpen={showTipModal}
          saleTotal={currentSale.total_amount}
          onClose={() => {
            setShowTipModal(false);
            setTipAmount(0);
            setTipPercentage(null);
          }}
          onConfirm={handleTipConfirm}
        />
      )}

      {/* Modal Abrir Caja */}
      <OpenCashSessionModal
        isOpen={showOpenCashModal}
        onClose={() => setShowOpenCashModal(false)}
        onSuccess={handleCashSessionOpened}
      />

      {/* Modal Cerrar Caja */}
      {cashSession && (
        <CloseCashSessionModal
          isOpen={showCloseCashModal}
          onClose={() => setShowCloseCashModal(false)}
          onSuccess={handleCashSessionClosed}
          session={cashSession}
        />
      )}

      {/* Modal Teclado Virtual */}
      {showVirtualKeyboard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <VirtualKeyboard
            onInput={handleKeyboardInput}
            onEnter={handleKeyboardConfirm}
            onCancel={() => {
              setShowVirtualKeyboard(false);
              setKeyboardValue('');
              setSelectedItemForQuantity(null);
            }}
            initialValue={keyboardValue}
            mode={keyboardMode}
            title="Ingresar Cantidad"
          />
        </div>
      )}

      {/* Modal Notas Rápidas */}
      {showQuickNotes && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <QuickNotes
            onSelectNote={handleQuickNoteSelect}
            onClose={() => {
              setShowQuickNotes(false);
              setSelectedItemForNotes(null);
            }}
            allowCustom={true}
          />
        </div>
      )}

      {/* Modal Métodos de Pago Extendidos */}
      {showPaymentMethodsExtended && currentSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <PaymentMethodsExtended
            saleTotal={currentSale.total_amount}
            onPaymentComplete={(payments) => {
              // Procesar pagos y finalizar venta
              finalizeSale(payments);
              setShowPaymentMethodsExtended(false);
            }}
            onCancel={() => setShowPaymentMethodsExtended(false)}
          />
        </div>
      )}
      </div>
    </div>
  );
};

export default POSVentas;