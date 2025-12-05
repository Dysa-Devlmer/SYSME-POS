import React, { useEffect, useState } from 'react';
import { combosService, Combo } from '@/api/combosService';
import toast from 'react-hot-toast';

const CombosPage: React.FC = () => {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadCombos();
  }, [filterType]);

  const loadCombos = async () => {
    try {
      setIsLoading(true);
      const response = await combosService.getCombos({
        type: filterType === 'all' ? undefined : filterType,
        limit: 100
      });
      setCombos(response.items);
    } catch (error) {
      toast.error('Error al cargar combos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (id: number) => {
    try {
      await combosService.toggleActive(id);
      toast.success('Estado actualizado');
      loadCombos();
    } catch (error) {
      toast.error('Error al actualizar estado');
    }
  };

  const handleToggleFeatured = async (id: number) => {
    try {
      await combosService.toggleFeatured(id);
      toast.success('Combo destacado actualizado');
      loadCombos();
    } catch (error) {
      toast.error('Error al actualizar');
    }
  };

  const filteredCombos = combos.filter(combo =>
    searchTerm === '' ||
    combo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    combo.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeBadge = (type: string) => {
    const config = {
      pack: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Pack' },
      menu: { bg: 'bg-green-100', text: 'text-green-800', label: 'Menú' },
      promotion: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Promoción' },
      combo: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Combo' }
    };
    const c = config[type as keyof typeof config] || config.combo;
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>{c.label}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Combos y Packs</h1>
            <p className="text-gray-600 mt-1">Gestiona combos, menús y promociones</p>
          </div>
          <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
            + Nuevo Combo
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre o código..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos</option>
                <option value="pack">Packs</option>
                <option value="menu">Menús</option>
                <option value="promotion">Promociones</option>
                <option value="combo">Combos</option>
              </select>
            </div>
          </div>
        </div>

        {/* Combos Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full p-8 text-center text-gray-500">Cargando...</div>
          ) : filteredCombos.length === 0 ? (
            <div className="col-span-full p-8 text-center text-gray-500">No se encontraron combos</div>
          ) : (
            filteredCombos.map((combo) => (
              <div key={combo.id} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow">
                {combo.image_url && (
                  <img src={combo.image_url} alt={combo.name} className="w-full h-48 object-cover" />
                )}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-lg">{combo.name}</h3>
                      <p className="text-sm text-gray-600">{combo.code}</p>
                    </div>
                    {getTypeBadge(combo.type)}
                  </div>

                  {combo.description && (
                    <p className="text-sm text-gray-600 mb-3">{combo.description}</p>
                  )}

                  <div className="flex justify-between items-center mb-3">
                    <div>
                      {combo.discount_percentage && combo.discount_percentage > 0 ? (
                        <>
                          <span className="text-sm text-gray-500 line-through">${combo.base_price.toFixed(2)}</span>
                          <span className="ml-2 text-lg font-bold text-green-600">${combo.final_price.toFixed(2)}</span>
                          <span className="ml-1 text-xs text-green-600">(-{combo.discount_percentage}%)</span>
                        </>
                      ) : (
                        <span className="text-lg font-bold text-gray-900">${combo.final_price.toFixed(2)}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${combo.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {combo.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                    {combo.featured && (
                      <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                        ⭐ Destacado
                      </span>
                    )}
                    {combo.track_stock && combo.stock_quantity !== null && (
                      <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        Stock: {combo.stock_quantity}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleActive(combo.id)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm ${
                        combo.is_active
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          : 'bg-green-500 text-white hover:bg-green-600'
                      }`}
                    >
                      {combo.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      onClick={() => handleToggleFeatured(combo.id)}
                      className="flex-1 px-3 py-2 rounded-lg text-sm bg-yellow-500 text-white hover:bg-yellow-600"
                    >
                      {combo.featured ? 'Quitar Destacado' : 'Destacar'}
                    </button>
                  </div>

                  <button className="w-full mt-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm">
                    Ver Detalles
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CombosPage;
