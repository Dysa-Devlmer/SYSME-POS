/**
 * AdvancedProductFilters Component
 * Filtros avanzados para productos (Talla, Color, Atributos)
 * Para retail y moda
 */

import React, { useState, useEffect } from 'react';

export interface ProductAttribute {
  id: number;
  name: string;
  code: string;
  type: 'size' | 'color' | 'material' | 'brand' | 'custom';
  values: AttributeValue[];
}

export interface AttributeValue {
  id: number;
  value: string;
  display_name: string;
  color_code?: string; // Para colores
  sort_order: number;
}

export interface ProductFilters {
  categories: number[];
  sizes: string[];
  colors: string[];
  brands: string[];
  materials: string[];
  priceRange: { min: number; max: number } | null;
  stockStatus: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  isActive: boolean | null;
  customAttributes: Record<string, string[]>;
}

interface AdvancedProductFiltersProps {
  attributes: ProductAttribute[];
  categories: Array<{ id: number; name: string }>;
  currentFilters: ProductFilters;
  onFilterChange: (filters: ProductFilters) => void;
  onClear: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const AdvancedProductFilters: React.FC<AdvancedProductFiltersProps> = ({
  attributes,
  categories,
  currentFilters,
  onFilterChange,
  onClear,
  isOpen,
  onClose
}) => {
  const [filters, setFilters] = useState<ProductFilters>(currentFilters);

  useEffect(() => {
    setFilters(currentFilters);
  }, [currentFilters]);

  if (!isOpen) return null;

  const sizeAttribute = attributes.find(a => a.type === 'size');
  const colorAttribute = attributes.find(a => a.type === 'color');
  const brandAttribute = attributes.find(a => a.type === 'brand');
  const materialAttribute = attributes.find(a => a.type === 'material');
  const customAttributes = attributes.filter(a => a.type === 'custom');

  const toggleArrayValue = (array: string[], value: string): string[] => {
    return array.includes(value)
      ? array.filter(v => v !== value)
      : [...array, value];
  };

  const handleApply = () => {
    onFilterChange(filters);
    onClose();
  };

  const handleClear = () => {
    const clearedFilters: ProductFilters = {
      categories: [],
      sizes: [],
      colors: [],
      brands: [],
      materials: [],
      priceRange: null,
      stockStatus: 'all',
      isActive: null,
      customAttributes: {}
    };
    setFilters(clearedFilters);
    onClear();
  };

  const activeFiltersCount = [
    filters.categories.length,
    filters.sizes.length,
    filters.colors.length,
    filters.brands.length,
    filters.materials.length,
    filters.priceRange ? 1 : 0,
    filters.stockStatus !== 'all' ? 1 : 0,
    filters.isActive !== null ? 1 : 0,
    Object.values(filters.customAttributes).flat().length
  ].reduce((sum, count) => sum + count, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-end z-50">
      <div className="bg-white h-full w-full max-w-md shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-600 to-rose-600 text-white p-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2">
              🔍 Filtros Avanzados
              {activeFiltersCount > 0 && (
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-sm">
                  {activeFiltersCount}
                </span>
              )}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Filters Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Categorías */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">📁 Categorías</h3>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setFilters({
                    ...filters,
                    categories: filters.categories.includes(cat.id)
                      ? filters.categories.filter(c => c !== cat.id)
                      : [...filters.categories, cat.id]
                  })}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    filters.categories.includes(cat.id)
                      ? 'bg-pink-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Tallas */}
          {sizeAttribute && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">📏 Tallas</h3>
              <div className="flex flex-wrap gap-2">
                {sizeAttribute.values.map(size => (
                  <button
                    key={size.id}
                    onClick={() => setFilters({
                      ...filters,
                      sizes: toggleArrayValue(filters.sizes, size.value)
                    })}
                    className={`w-12 h-12 rounded-lg font-bold text-sm transition-all ${
                      filters.sizes.includes(size.value)
                        ? 'bg-pink-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {size.display_name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Colores */}
          {colorAttribute && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">🎨 Colores</h3>
              <div className="flex flex-wrap gap-2">
                {colorAttribute.values.map(color => (
                  <button
                    key={color.id}
                    onClick={() => setFilters({
                      ...filters,
                      colors: toggleArrayValue(filters.colors, color.value)
                    })}
                    className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${
                      filters.colors.includes(color.value)
                        ? 'border-pink-500 ring-2 ring-pink-200'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: color.color_code || '#ccc' }}
                    title={color.display_name}
                  >
                    {filters.colors.includes(color.value) && (
                      <span className={`text-lg ${
                        isLightColor(color.color_code) ? 'text-gray-800' : 'text-white'
                      }`}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Marcas */}
          {brandAttribute && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">🏷️ Marcas</h3>
              <div className="flex flex-wrap gap-2">
                {brandAttribute.values.map(brand => (
                  <button
                    key={brand.id}
                    onClick={() => setFilters({
                      ...filters,
                      brands: toggleArrayValue(filters.brands, brand.value)
                    })}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                      filters.brands.includes(brand.value)
                        ? 'bg-pink-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {brand.display_name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Material */}
          {materialAttribute && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">🧵 Material</h3>
              <div className="flex flex-wrap gap-2">
                {materialAttribute.values.map(mat => (
                  <button
                    key={mat.id}
                    onClick={() => setFilters({
                      ...filters,
                      materials: toggleArrayValue(filters.materials, mat.value)
                    })}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                      filters.materials.includes(mat.value)
                        ? 'bg-pink-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {mat.display_name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Rango de precios */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">💰 Rango de Precios</h3>
            <div className="flex gap-3 items-center">
              <input
                type="number"
                placeholder="Mínimo"
                value={filters.priceRange?.min || ''}
                onChange={(e) => setFilters({
                  ...filters,
                  priceRange: {
                    min: parseInt(e.target.value) || 0,
                    max: filters.priceRange?.max || 999999
                  }
                })}
                className="flex-1 p-2 border border-gray-300 rounded-lg"
              />
              <span className="text-gray-400">-</span>
              <input
                type="number"
                placeholder="Máximo"
                value={filters.priceRange?.max || ''}
                onChange={(e) => setFilters({
                  ...filters,
                  priceRange: {
                    min: filters.priceRange?.min || 0,
                    max: parseInt(e.target.value) || 999999
                  }
                })}
                className="flex-1 p-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          {/* Estado de stock */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">📦 Estado de Stock</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'all', label: 'Todos', icon: '📦' },
                { value: 'in_stock', label: 'En Stock', icon: '✅' },
                { value: 'low_stock', label: 'Stock Bajo', icon: '⚠️' },
                { value: 'out_of_stock', label: 'Sin Stock', icon: '❌' }
              ].map(status => (
                <button
                  key={status.value}
                  onClick={() => setFilters({
                    ...filters,
                    stockStatus: status.value as any
                  })}
                  className={`p-3 rounded-lg text-sm transition-all ${
                    filters.stockStatus === status.value
                      ? 'bg-pink-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span className="mr-1">{status.icon}</span>
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          {/* Atributos personalizados */}
          {customAttributes.map(attr => (
            <div key={attr.id}>
              <h3 className="font-semibold text-gray-700 mb-3">
                {attr.name}
              </h3>
              <div className="flex flex-wrap gap-2">
                {attr.values.map(val => {
                  const isSelected = filters.customAttributes[attr.code]?.includes(val.value);
                  return (
                    <button
                      key={val.id}
                      onClick={() => {
                        const currentValues = filters.customAttributes[attr.code] || [];
                        setFilters({
                          ...filters,
                          customAttributes: {
                            ...filters.customAttributes,
                            [attr.code]: toggleArrayValue(currentValues, val.value)
                          }
                        });
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                        isSelected
                          ? 'bg-pink-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {val.display_name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-4">
          <div className="flex gap-3">
            <button
              onClick={handleClear}
              className="flex-1 py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-colors"
            >
              Limpiar
            </button>
            <button
              onClick={handleApply}
              className="flex-1 py-3 px-4 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl transition-colors"
            >
              Aplicar ({activeFiltersCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Helper para determinar si un color es claro
 */
function isLightColor(color?: string): boolean {
  if (!color) return true;
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155;
}

/**
 * FilterChips - Muestra los filtros activos como chips
 */
interface FilterChipsProps {
  filters: ProductFilters;
  attributes: ProductAttribute[];
  categories: Array<{ id: number; name: string }>;
  onRemove: (type: string, value?: string | number) => void;
  onClearAll: () => void;
}

export const FilterChips: React.FC<FilterChipsProps> = ({
  filters,
  attributes,
  categories,
  onRemove,
  onClearAll
}) => {
  const chips: Array<{ type: string; label: string; value?: string | number }> = [];

  // Categorías
  filters.categories.forEach(catId => {
    const cat = categories.find(c => c.id === catId);
    if (cat) chips.push({ type: 'category', label: cat.name, value: catId });
  });

  // Tallas
  filters.sizes.forEach(size => {
    chips.push({ type: 'size', label: `Talla: ${size}`, value: size });
  });

  // Colores
  filters.colors.forEach(color => {
    const colorAttr = attributes.find(a => a.type === 'color');
    const colorVal = colorAttr?.values.find(v => v.value === color);
    chips.push({ type: 'color', label: colorVal?.display_name || color, value: color });
  });

  // Marcas
  filters.brands.forEach(brand => {
    chips.push({ type: 'brand', label: brand, value: brand });
  });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {chips.map((chip, index) => (
        <span
          key={`${chip.type}-${index}`}
          className="inline-flex items-center gap-1 px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm"
        >
          {chip.label}
          <button
            onClick={() => onRemove(chip.type, chip.value)}
            className="ml-1 hover:bg-pink-200 rounded-full p-0.5"
          >
            ✕
          </button>
        </span>
      ))}
      <button
        onClick={onClearAll}
        className="text-sm text-pink-600 hover:text-pink-800 hover:underline"
      >
        Limpiar todos
      </button>
    </div>
  );
};

export default AdvancedProductFilters;
