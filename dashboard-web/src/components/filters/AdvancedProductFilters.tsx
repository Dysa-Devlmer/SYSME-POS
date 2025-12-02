/**
 * Advanced Product Filters Component
 * Filters for retail: size, color, brand, price range, stock
 */

import React, { useState, useEffect } from 'react';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';

export interface ProductFilters {
  category?: string;
  size?: string;
  color?: string;
  brand?: string;
  priceMin?: number;
  priceMax?: number;
  inStock?: boolean;
  onSale?: boolean;
  search?: string;
}

interface AdvancedProductFiltersProps {
  onFiltersChange: (filters: ProductFilters) => void;
  categories?: Array<{ id: string; name: string }>;
  sizes?: string[];
  colors?: string[];
  brands?: string[];
}

export const AdvancedProductFilters: React.FC<AdvancedProductFiltersProps> = ({
  onFiltersChange,
  categories = [],
  sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  colors = ['Negro', 'Blanco', 'Rojo', 'Azul', 'Verde', 'Amarillo', 'Gris'],
  brands = []
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<ProductFilters>({});
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  useEffect(() => {
    // Count active filters
    const count = Object.values(filters).filter(v => v !== undefined && v !== '').length;
    setActiveFilterCount(count);

    // Notify parent
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const updateFilter = (key: keyof ProductFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const clearFilter = (key: keyof ProductFilters) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-800">Filtros Avanzados</h3>
          {activeFilterCount > 0 && (
            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Limpiar
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-600 hover:text-gray-800"
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Active Filters Pills */}
      {activeFilterCount > 0 && !isExpanded && (
        <div className="flex flex-wrap gap-2">
          {filters.category && (
            <FilterPill
              label="Categoría"
              value={categories.find(c => c.id === filters.category)?.name || filters.category}
              onRemove={() => clearFilter('category')}
            />
          )}
          {filters.size && (
            <FilterPill
              label="Talla"
              value={filters.size}
              onRemove={() => clearFilter('size')}
            />
          )}
          {filters.color && (
            <FilterPill
              label="Color"
              value={filters.color}
              onRemove={() => clearFilter('color')}
            />
          )}
          {filters.brand && (
            <FilterPill
              label="Marca"
              value={filters.brand}
              onRemove={() => clearFilter('brand')}
            />
          )}
          {(filters.priceMin !== undefined || filters.priceMax !== undefined) && (
            <FilterPill
              label="Precio"
              value={`$${filters.priceMin || 0} - $${filters.priceMax || '∞'}`}
              onRemove={() => {
                clearFilter('priceMin');
                clearFilter('priceMax');
              }}
            />
          )}
          {filters.inStock && (
            <FilterPill
              label="En Stock"
              value="Sí"
              onRemove={() => clearFilter('inStock')}
            />
          )}
          {filters.onSale && (
            <FilterPill
              label="En Oferta"
              value="Sí"
              onRemove={() => clearFilter('onSale')}
            />
          )}
        </div>
      )}

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) => updateFilter('search', e.target.value)}
              placeholder="Nombre o SKU..."
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category */}
          {categories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría
              </label>
              <select
                value={filters.category || ''}
                onChange={(e) => updateFilter('category', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Talla
            </label>
            <select
              value={filters.size || ''}
              onChange={(e) => updateFilter('size', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              {sizes.map(size => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Color
            </label>
            <select
              value={filters.color || ''}
              onChange={(e) => updateFilter('color', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {colors.map(color => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </select>
          </div>

          {/* Brand */}
          {brands.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marca
              </label>
              <select
                value={filters.brand || ''}
                onChange={(e) => updateFilter('brand', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas</option>
                {brands.map(brand => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Price Range */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rango de Precio
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={filters.priceMin || ''}
                onChange={(e) => updateFilter('priceMin', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Min"
                min="0"
                className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                value={filters.priceMax || ''}
                onChange={(e) => updateFilter('priceMax', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Max"
                min="0"
                className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Stock Status */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.inStock || false}
                onChange={(e) => updateFilter('inStock', e.target.checked || undefined)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Solo con stock</span>
            </label>
          </div>

          {/* On Sale */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.onSale || false}
                onChange={(e) => updateFilter('onSale', e.target.checked || undefined)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">En oferta</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

// Filter Pill Component
interface FilterPillProps {
  label: string;
  value: string;
  onRemove: () => void;
}

const FilterPill: React.FC<FilterPillProps> = ({ label, value, onRemove }) => {
  return (
    <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
      <span className="font-medium">{label}:</span>
      <span>{value}</span>
      <button
        onClick={onRemove}
        className="hover:text-blue-900"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};

export default AdvancedProductFilters;
