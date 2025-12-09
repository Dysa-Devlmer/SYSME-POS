// web-interface/frontend/src/components/MemoriesPanel.jsx
// Panel de visualización de memorias del sistema

import React, { useState } from 'react';

export default function MemoriesPanel({ memories }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const filteredMemories = memories
    .filter(mem => {
      if (filterType !== 'all' && mem.type !== filterType) return false;
      if (searchTerm && !mem.content?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const types = ['all', ...new Set(memories.map(m => m.type).filter(Boolean))];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">🧠 Memoria del Sistema</h2>
        <div className="text-sm text-gray-400">
          Total: {memories.length} memorias
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="🔍 Buscar en memoria..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          {types.map(type => (
            <option key={type} value={type}>
              {type === 'all' ? 'Todos los tipos' : type}
            </option>
          ))}
        </select>
      </div>

      {/* Memories List */}
      <div className="grid grid-cols-1 gap-3">
        {filteredMemories.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <div className="text-4xl mb-2">🤔</div>
            <p className="text-gray-400">No se encontraron memorias</p>
          </div>
        ) : (
          filteredMemories.map((mem, index) => (
            <div
              key={mem.id || index}
              className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-gray-200 mb-2">{mem.content}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {mem.type && (
                      <span className="px-2 py-1 bg-blue-900 rounded">
                        {mem.type}
                      </span>
                    )}
                    {mem.timestamp && (
                      <span>
                        📅 {new Date(mem.timestamp).toLocaleString('es-ES')}
                      </span>
                    )}
                    {mem.importance && (
                      <span className={`px-2 py-1 rounded ${
                        mem.importance === 'high' ? 'bg-red-900' :
                        mem.importance === 'medium' ? 'bg-yellow-900' :
                        'bg-green-900'
                      }`}>
                        {mem.importance}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
