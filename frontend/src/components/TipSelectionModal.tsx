/**
 * TipSelectionModal - Modal para seleccionar propina en el POS
 * Soporta porcentajes predefinidos, monto fijo, y cantidad personalizada
 */

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import tipsService, { TipSettings, TipPreset } from '@/api/tipsService';

interface TipSelectionModalProps {
  isOpen: boolean;
  saleTotal: number;
  onClose: () => void;
  onConfirm: (tipAmount: number, tipPercentage: number | null, method: 'percentage' | 'fixed' | 'custom', presetId?: number) => void;
}

const TipSelectionModal: React.FC<TipSelectionModalProps> = ({
  isOpen,
  saleTotal,
  onClose,
  onConfirm
}) => {
  const [settings, setSettings] = useState<TipSettings | null>(null);
  const [presets, setPresets] = useState<TipPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<number>(0);
  const [customPercentage, setCustomPercentage] = useState<number>(15);
  const [useCustomAmount, setUseCustomAmount] = useState(false);
  const [useCustomPercentage, setUseCustomPercentage] = useState(false);
  const [calculatedTip, setCalculatedTip] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadTipData();
    }
  }, [isOpen]);

  useEffect(() => {
    calculateTip();
  }, [selectedPresetId, customAmount, customPercentage, useCustomAmount, useCustomPercentage, saleTotal]);

  const loadTipData = async () => {
    setIsLoading(true);
    try {
      const [settingsData, presetsData] = await Promise.all([
        tipsService.settings.getSettings(),
        tipsService.presets.getAll(true)
      ]);

      setSettings(settingsData);
      setPresets(presetsData);

      // Pre-select first preset if available
      if (presetsData.length > 0 && presetsData[0].percentage === 0) {
        // Skip "Sin Propina" preset for default selection
        if (presetsData.length > 1) {
          setSelectedPresetId(presetsData[1].id);
        }
      } else if (presetsData.length > 0) {
        setSelectedPresetId(presetsData[0].id);
      }
    } catch (error: any) {
      console.error('Error loading tip data:', error);
      toast.error('Error al cargar configuración de propinas');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTip = () => {
    if (useCustomAmount) {
      setCalculatedTip(customAmount);
    } else if (useCustomPercentage) {
      const tip = Math.round((saleTotal * customPercentage) / 100);
      setCalculatedTip(tip);
    } else if (selectedPresetId) {
      const preset = presets.find(p => p.id === selectedPresetId);
      if (preset) {
        if (preset.is_percentage) {
          const tip = Math.round((saleTotal * preset.percentage) / 100);
          setCalculatedTip(tip);
        } else {
          setCalculatedTip(preset.fixed_amount);
        }
      }
    } else {
      setCalculatedTip(0);
    }
  };

  const handlePresetClick = (presetId: number) => {
    setSelectedPresetId(presetId);
    setUseCustomAmount(false);
    setUseCustomPercentage(false);
  };

  const handleCustomPercentageClick = () => {
    setUseCustomPercentage(true);
    setUseCustomAmount(false);
    setSelectedPresetId(null);
  };

  const handleCustomAmountClick = () => {
    setUseCustomAmount(true);
    setUseCustomPercentage(false);
    setSelectedPresetId(null);
  };

  const handleConfirm = () => {
    let method: 'percentage' | 'fixed' | 'custom' = 'custom';
    let tipPercentage: number | null = null;
    let presetId: number | undefined = undefined;

    if (useCustomAmount) {
      method = 'fixed';
    } else if (useCustomPercentage) {
      method = 'percentage';
      tipPercentage = customPercentage;
    } else if (selectedPresetId) {
      const preset = presets.find(p => p.id === selectedPresetId);
      if (preset) {
        method = preset.is_percentage ? 'percentage' : 'fixed';
        tipPercentage = preset.is_percentage ? preset.percentage : null;
        presetId = preset.id;
      }
    }

    onConfirm(calculatedTip, tipPercentage, method, presetId);
  };

  const handleSkip = () => {
    onConfirm(0, 0, 'custom');
  };

  if (!isOpen) return null;

  const totalWithTip = saleTotal + calculatedTip;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full m-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                💰 ¿Desea agregar propina?
              </h3>
              <p className="text-sm text-gray-600 mt-2">
                Seleccione el monto de propina para esta venta
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-3xl font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando opciones...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Sale Total */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total de la Venta:</span>
                  <span className="text-2xl font-bold text-blue-700">
                    ${saleTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Preset Buttons */}
              {presets.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold mb-3">Opciones Rápidas:</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {presets.map(preset => {
                      const isSelected = selectedPresetId === preset.id && !useCustomAmount && !useCustomPercentage;
                      const presetTip = preset.is_percentage
                        ? Math.round((saleTotal * preset.percentage) / 100)
                        : preset.fixed_amount;

                      return (
                        <button
                          key={preset.id}
                          onClick={() => handlePresetClick(preset.id)}
                          className={`p-4 border-2 rounded-lg transition-all ${
                            isSelected
                              ? 'border-green-500 bg-green-50 shadow-lg'
                              : 'border-gray-200 hover:border-green-300 bg-white'
                          }`}
                        >
                          <div className="text-left">
                            <div className="font-bold text-lg text-gray-900">
                              {preset.name}
                            </div>
                            {preset.description && (
                              <div className="text-xs text-gray-600 mt-1">
                                {preset.description}
                              </div>
                            )}
                            <div className="mt-2 flex justify-between items-center">
                              <span className="text-sm text-gray-700">
                                {preset.is_percentage ? `${preset.percentage}%` : 'Monto fijo'}
                              </span>
                              <span className="text-lg font-bold text-green-600">
                                ${presetTip.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Custom Percentage */}
              {settings?.allow_custom_amount && (
                <div>
                  <h4 className="text-lg font-semibold mb-3">Porcentaje Personalizado:</h4>
                  <div
                    className={`border-2 rounded-lg p-4 ${
                      useCustomPercentage
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={useCustomPercentage}
                        onChange={handleCustomPercentageClick}
                        className="w-5 h-5 text-green-600"
                      />
                      <div className="flex-1">
                        <input
                          type="number"
                          value={customPercentage}
                          onChange={(e) => setCustomPercentage(parseFloat(e.target.value) || 0)}
                          onFocus={handleCustomPercentageClick}
                          min={settings.min_percentage}
                          max={settings.max_percentage}
                          step="0.5"
                          className="w-24 p-2 border border-gray-300 rounded text-center font-bold"
                        />
                        <span className="ml-2 text-lg">%</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">Propina</div>
                        <div className="text-xl font-bold text-green-600">
                          ${Math.round((saleTotal * customPercentage) / 100).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Amount */}
              {settings?.allow_custom_amount && (
                <div>
                  <h4 className="text-lg font-semibold mb-3">Monto Personalizado:</h4>
                  <div
                    className={`border-2 rounded-lg p-4 ${
                      useCustomAmount
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={useCustomAmount}
                        onChange={handleCustomAmountClick}
                        className="w-5 h-5 text-green-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center">
                          <span className="text-lg mr-2">$</span>
                          <input
                            type="number"
                            value={customAmount}
                            onChange={(e) => setCustomAmount(parseFloat(e.target.value) || 0)}
                            onFocus={handleCustomAmountClick}
                            min="0"
                            step="100"
                            className="flex-1 p-2 border border-gray-300 rounded font-bold text-lg"
                            placeholder="Ingrese monto"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Total Preview */}
              <div className="bg-gradient-to-r from-green-100 to-blue-100 border-2 border-green-300 rounded-lg p-5">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Subtotal Venta:</span>
                    <span className="text-lg font-semibold">
                      ${saleTotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Propina:</span>
                    <span className="text-lg font-semibold text-green-600">
                      +${calculatedTip.toLocaleString()}
                    </span>
                  </div>
                  <div className="border-t-2 border-green-300 pt-2 mt-2"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold">TOTAL A PAGAR:</span>
                    <span className="text-3xl font-bold text-green-700">
                      ${totalWithTip.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-3">
            {!settings?.is_required && (
              <button
                onClick={handleSkip}
                className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-400 transition-colors font-medium"
              >
                Sin Propina
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 bg-red-500 text-white py-3 px-4 rounded-lg hover:bg-red-600 transition-colors font-medium"
            >
              Cancelar
              </button>
            <button
              onClick={handleConfirm}
              className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-bold"
            >
              ✅ Confirmar ${totalWithTip.toLocaleString()}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TipSelectionModal;
