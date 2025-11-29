/**
 * Tips Settings Page
 * Administrative configuration for tips system
 */

import React, { useState, useEffect } from 'react';
import { DollarSign, Percent, Save, Plus, Trash2, Settings, Users, Calculator } from 'lucide-react';
import toast from 'react-hot-toast';
import tipsService, { TipSettings, TipPreset, TipDistributionRule } from '../services/tipsService';

const TipsSettingsPage: React.FC = () => {
  // State
  const [settings, setSettings] = useState<TipSettings | null>(null);
  const [presets, setPresets] = useState<TipPreset[]>([]);
  const [distributionRules, setDistributionRules] = useState<TipDistributionRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [showAddPresetModal, setShowAddPresetModal] = useState(false);
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);

  // New preset form
  const [newPreset, setNewPreset] = useState({
    percentage: 10,
    display_text: '10%',
    description: '',
    is_default: false
  });

  // New rule form
  const [newRule, setNewRule] = useState({
    role: 'waiter',
    percentage: 100,
    description: ''
  });

  // Load data
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [settingsData, presetsData, rulesData] = await Promise.all([
        tipsService.settings.getSettings(),
        tipsService.presets.getAll(),
        tipsService.distribution.getRules()
      ]);
      setSettings(settingsData);
      setPresets(presetsData);
      setDistributionRules(rulesData);
    } catch (error: any) {
      toast.error(error.message || 'Error cargando configuración');
    } finally {
      setIsLoading(false);
    }
  };

  // Update general settings
  const handleUpdateSettings = async (updates: Partial<TipSettings>) => {
    if (!settings) return;

    setIsSaving(true);
    try {
      const updated = await tipsService.settings.updateSettings({
        ...settings,
        ...updates
      });
      setSettings(updated);
      toast.success('Configuración actualizada');
    } catch (error: any) {
      toast.error(error.message || 'Error actualizando configuración');
    } finally {
      setIsSaving(false);
    }
  };

  // Preset management
  const handleCreatePreset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await tipsService.presets.create(newPreset);
      toast.success('Preset creado exitosamente');
      setShowAddPresetModal(false);
      setNewPreset({ percentage: 10, display_text: '10%', description: '', is_default: false });
      loadAllData();
    } catch (error: any) {
      toast.error(error.message || 'Error creando preset');
    }
  };

  const handleDeletePreset = async (id: number) => {
    if (!confirm('¿Eliminar este preset de propina?')) return;
    try {
      await tipsService.presets.delete(id);
      toast.success('Preset eliminado');
      loadAllData();
    } catch (error: any) {
      toast.error(error.message || 'Error eliminando preset');
    }
  };

  const handleSetDefaultPreset = async (id: number) => {
    try {
      await tipsService.presets.setDefault(id);
      toast.success('Preset predeterminado actualizado');
      loadAllData();
    } catch (error: any) {
      toast.error(error.message || 'Error actualizando preset');
    }
  };

  // Distribution rules management
  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate total percentage
    const currentTotal = distributionRules.reduce((sum, rule) => sum + rule.percentage, 0);
    const newTotal = currentTotal + newRule.percentage;

    if (newTotal > 100) {
      toast.error(`La suma total de distribución no puede exceder 100%. Actualmente: ${currentTotal}%`);
      return;
    }

    try {
      await tipsService.distribution.createRule(newRule);
      toast.success('Regla de distribución creada');
      setShowAddRuleModal(false);
      setNewRule({ role: 'waiter', percentage: 100, description: '' });
      loadAllData();
    } catch (error: any) {
      toast.error(error.message || 'Error creando regla');
    }
  };

  const handleDeleteRule = async (id: number) => {
    if (!confirm('¿Eliminar esta regla de distribución?')) return;
    try {
      await tipsService.distribution.deleteRule(id);
      toast.success('Regla eliminada');
      loadAllData();
    } catch (error: any) {
      toast.error(error.message || 'Error eliminando regla');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: No se pudo cargar la configuración</p>
          <button
            onClick={loadAllData}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Calculate distribution total
  const distributionTotal = distributionRules.reduce((sum, rule) => sum + rule.percentage, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <DollarSign className="h-8 w-8 text-green-500" />
          Configuración de Propinas
        </h1>
        <p className="text-gray-600 mt-1">Gestión del sistema de propinas y distribución</p>
      </div>

      {/* General Settings */}
      <div className="bg-white rounded-lg shadow mb-6 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configuración General
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tips Enabled */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="font-medium text-gray-900">Sistema de Propinas</label>
              <p className="text-sm text-gray-600">Habilitar o deshabilitar propinas</p>
            </div>
            <button
              onClick={() => handleUpdateSettings({ tips_enabled: !settings.tips_enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.tips_enabled ? 'bg-green-500' : 'bg-gray-300'
              }`}
              disabled={isSaving}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.tips_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Allow Custom Tip */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="font-medium text-gray-900">Propina Personalizada</label>
              <p className="text-sm text-gray-600">Permitir ingreso manual de propina</p>
            </div>
            <button
              onClick={() => handleUpdateSettings({ allow_custom_tip: !settings.allow_custom_tip })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.allow_custom_tip ? 'bg-green-500' : 'bg-gray-300'
              }`}
              disabled={isSaving}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.allow_custom_tip ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Suggest Tip Before Payment */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="font-medium text-gray-900">Sugerir Antes de Pago</label>
              <p className="text-sm text-gray-600">Mostrar propina antes del pago</p>
            </div>
            <button
              onClick={() => handleUpdateSettings({ suggest_tip_before_payment: !settings.suggest_tip_before_payment })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.suggest_tip_before_payment ? 'bg-green-500' : 'bg-gray-300'
              }`}
              disabled={isSaving}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.suggest_tip_before_payment ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Include in Total */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="font-medium text-gray-900">Incluir en Total</label>
              <p className="text-sm text-gray-600">Agregar propina al total de venta</p>
            </div>
            <button
              onClick={() => handleUpdateSettings({ include_in_total: !settings.include_in_total })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.include_in_total ? 'bg-green-500' : 'bg-gray-300'
              }`}
              disabled={isSaving}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.include_in_total ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Auto Distribute */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="font-medium text-gray-900">Distribución Automática</label>
              <p className="text-sm text-gray-600">Distribuir propinas según reglas</p>
            </div>
            <button
              onClick={() => handleUpdateSettings({ auto_distribute: !settings.auto_distribute })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.auto_distribute ? 'bg-green-500' : 'bg-gray-300'
              }`}
              disabled={isSaving}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.auto_distribute ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Show Tip in Receipt */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="font-medium text-gray-900">Mostrar en Boleta</label>
              <p className="text-sm text-gray-600">Incluir propina en recibo impreso</p>
            </div>
            <button
              onClick={() => handleUpdateSettings({ show_tip_in_receipt: !settings.show_tip_in_receipt })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.show_tip_in_receipt ? 'bg-green-500' : 'bg-gray-300'
              }`}
              disabled={isSaving}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.show_tip_in_receipt ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Minimum Tip Amount */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <label className="block font-medium text-gray-900 mb-2">
            Monto Mínimo de Propina
          </label>
          <div className="flex items-center gap-4">
            <input
              type="number"
              min="0"
              step="100"
              value={settings.minimum_tip_amount}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 0;
                setSettings({ ...settings, minimum_tip_amount: value });
              }}
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-600">CLP</span>
            <button
              onClick={() => handleUpdateSettings({ minimum_tip_amount: settings.minimum_tip_amount })}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              disabled={isSaving}
            >
              <Save className="h-4 w-4" />
              Guardar
            </button>
          </div>
        </div>
      </div>

      {/* Tip Presets */}
      <div className="bg-white rounded-lg shadow mb-6 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Presets de Propina
          </h2>
          <button
            onClick={() => setShowAddPresetModal(true)}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Agregar Preset
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className={`p-4 border-2 rounded-lg ${
                preset.is_default ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold text-gray-900">{preset.percentage}%</span>
                {preset.is_default && (
                  <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full">
                    Predeterminado
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-3">{preset.display_text}</p>
              {preset.description && (
                <p className="text-xs text-gray-500 mb-3">{preset.description}</p>
              )}
              <div className="flex gap-2">
                {!preset.is_default && (
                  <button
                    onClick={() => handleSetDefaultPreset(preset.id!)}
                    className="flex-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded transition-colors"
                  >
                    Hacer Predeterminado
                  </button>
                )}
                <button
                  onClick={() => handleDeletePreset(preset.id!)}
                  className="text-red-600 hover:text-red-800 p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {presets.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No hay presets configurados. Agrega el primero.
          </div>
        )}
      </div>

      {/* Distribution Rules */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Reglas de Distribución
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Total distribuido: <span className={distributionTotal === 100 ? 'text-green-600 font-bold' : 'text-orange-600 font-bold'}>{distributionTotal}%</span>
              {distributionTotal !== 100 && (
                <span className="text-orange-600 ml-2">(Debe sumar 100%)</span>
              )}
            </p>
          </div>
          <button
            onClick={() => setShowAddRuleModal(true)}
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            disabled={distributionTotal >= 100}
          >
            <Plus className="h-4 w-4" />
            Agregar Regla
          </button>
        </div>

        <div className="space-y-3">
          {distributionRules.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4 flex-1">
                <Users className="h-5 w-5 text-gray-400" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 capitalize">{rule.role}</p>
                  {rule.description && <p className="text-sm text-gray-600">{rule.description}</p>}
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-purple-600">{rule.percentage}%</span>
                </div>
              </div>
              <button
                onClick={() => handleDeleteRule(rule.id!)}
                className="ml-4 text-red-600 hover:text-red-800 p-2"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {distributionRules.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No hay reglas de distribución. Agrega la primera.
          </div>
        )}
      </div>

      {/* Add Preset Modal */}
      {showAddPresetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Agregar Preset de Propina</h3>
            <form onSubmit={handleCreatePreset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Porcentaje (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  required
                  value={newPreset.percentage}
                  onChange={(e) => setNewPreset({ ...newPreset, percentage: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Texto a Mostrar
                </label>
                <input
                  type="text"
                  required
                  value={newPreset.display_text}
                  onChange={(e) => setNewPreset({ ...newPreset, display_text: e.target.value })}
                  placeholder="Ej: 10% - Buen Servicio"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción (opcional)
                </label>
                <textarea
                  value={newPreset.description}
                  onChange={(e) => setNewPreset({ ...newPreset, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={newPreset.is_default}
                  onChange={(e) => setNewPreset({ ...newPreset, is_default: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="is_default" className="text-sm text-gray-700">
                  Hacer predeterminado
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Crear Preset
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddPresetModal(false);
                    setNewPreset({ percentage: 10, display_text: '10%', description: '', is_default: false });
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Distribution Rule Modal */}
      {showAddRuleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Agregar Regla de Distribución</h3>
            <form onSubmit={handleCreateRule} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rol
                </label>
                <select
                  required
                  value={newRule.role}
                  onChange={(e) => setNewRule({ ...newRule, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="waiter">Mesero/Garzon</option>
                  <option value="cook">Cocinero</option>
                  <option value="bartender">Barman</option>
                  <option value="manager">Gerente</option>
                  <option value="host">Anfitrión</option>
                  <option value="busser">Ayudante de Mesa</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Porcentaje (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max={100 - distributionTotal}
                  step="1"
                  required
                  value={newRule.percentage}
                  onChange={(e) => setNewRule({ ...newRule, percentage: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Disponible: {100 - distributionTotal}%
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción (opcional)
                </label>
                <textarea
                  value={newRule.description}
                  onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                  rows={2}
                  placeholder="Ej: Distribución estándar para servicio de mesa"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Crear Regla
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddRuleModal(false);
                    setNewRule({ role: 'waiter', percentage: 100, description: '' });
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TipsSettingsPage;
