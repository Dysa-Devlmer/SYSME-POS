// web-interface/frontend/src/components/CodeSearch.jsx
// Componente de Búsqueda Inteligente de Código

import React, { useState, useEffect, useRef } from 'react';

const CodeSearch = ({ socket }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState(null);
  const [searching, setSearching] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    // Solicitar estadísticas iniciales
    socket.emit('code-search:get-stats');

    // Escuchar resultados de búsqueda
    socket.on('code-search:results', (data) => {
      setResults(data.results);
      setSearching(false);
    });

    // Escuchar estadísticas
    socket.on('code-search:stats', (data) => {
      setStats(data);
      setIsIndexing(false);
    });

    // Escuchar estado de indexación
    socket.on('code-search:indexing', (data) => {
      setIsIndexing(data.isIndexing);
    });

    // Escuchar detalles de archivo
    socket.on('code-search:file-details', (data) => {
      setSelectedResult(data);
    });

    return () => {
      socket.off('code-search:results');
      socket.off('code-search:stats');
      socket.off('code-search:indexing');
      socket.off('code-search:file-details');
    };
  }, [socket]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim() || !socket) return;

    setSearching(true);
    socket.emit('code-search:search', {
      query: query.trim(),
      options: { limit: 20 }
    });
  };

  const handleReindex = () => {
    if (!socket) return;
    setIsIndexing(true);
    socket.emit('code-search:reindex');
  };

  const handleSelectResult = (result) => {
    setSelectedResult(result);
    // Solicitar detalles completos del archivo
    socket.emit('code-search:get-file-details', result.file.path);
  };

  const handleClearSearch = () => {
    setQuery('');
    setResults([]);
    setSelectedResult(null);
    searchInputRef.current?.focus();
  };

  const getMatchTypeIcon = (matchType) => {
    const icons = {
      'function-exact': '⚡',
      'function-partial': '🔧',
      'class-exact': '📦',
      'class-partial': '📦',
      'keyword': '🔍',
      'filename': '📄',
      'path': '📁'
    };
    return icons[matchType] || '🔍';
  };

  const getMatchTypeLabel = (matchType) => {
    const labels = {
      'function-exact': 'Función Exacta',
      'function-partial': 'Función Parcial',
      'class-exact': 'Clase Exacta',
      'class-partial': 'Clase Parcial',
      'keyword': 'Keyword',
      'filename': 'Nombre de Archivo',
      'path': 'Path'
    };
    return labels[matchType] || matchType;
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-cyan-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-gray-400';
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>🔍</span>
            <span>Búsqueda Inteligente de Código</span>
          </h2>
          <button
            onClick={handleReindex}
            disabled={isIndexing}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              isIndexing
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
            }`}
          >
            {isIndexing ? '🔄 Indexando...' : '🔄 Re-indexar'}
          </button>
        </div>

        {/* Estadísticas */}
        {stats && (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">Archivos</p>
              <p className="text-2xl font-bold text-white">{stats.totalFiles}</p>
            </div>
            <div className="bg-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">Líneas</p>
              <p className="text-2xl font-bold text-cyan-400">
                {stats.totalLines.toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">Funciones</p>
              <p className="text-2xl font-bold text-purple-400">{stats.totalFunctions}</p>
            </div>
            <div className="bg-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">Clases</p>
              <p className="text-2xl font-bold text-pink-400">{stats.totalClasses}</p>
            </div>
          </div>
        )}
      </div>

      {/* Barra de búsqueda */}
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
        <form onSubmit={handleSearch} className="flex space-x-3">
          <div className="flex-1 relative">
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar funciones, clases, archivos, keywords..."
              className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 pr-10"
              disabled={searching}
            />
            {query && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={!query.trim() || searching}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              !query.trim() || searching
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700'
            }`}
          >
            {searching ? '🔍 Buscando...' : '🔍 Buscar'}
          </button>
        </form>
      </div>

      {/* Resultados */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lista de resultados */}
          <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col max-h-[600px]">
            <div className="p-4 bg-gray-750 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">
                📋 Resultados ({results.length})
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {results.map((result, index) => (
                <div
                  key={index}
                  onClick={() => handleSelectResult(result)}
                  className={`p-4 border-b border-gray-700 cursor-pointer transition-all ${
                    selectedResult?.file?.path === result.file.path
                      ? 'bg-cyan-600 bg-opacity-20 border-l-4 border-cyan-500'
                      : 'hover:bg-gray-750'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-lg">
                          {getMatchTypeIcon(result.matchType)}
                        </span>
                        <p className="text-white font-medium truncate">
                          {result.file.path.split(/[\/\\]/).pop()}
                        </p>
                      </div>
                      <p className="text-xs text-gray-400 truncate">
                        {result.file.path}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-bold ml-2 flex-shrink-0 ${getScoreColor(
                        result.score
                      )}`}
                    >
                      {result.score}%
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-xs">
                    <span className="px-2 py-1 bg-gray-700 rounded text-gray-300">
                      {getMatchTypeLabel(result.matchType)}
                    </span>
                    <span className="text-gray-400">
                      {formatFileSize(result.file.size)}
                    </span>
                    <span className="text-gray-400">{result.file.lines} líneas</span>
                  </div>

                  {result.functionName && (
                    <div className="mt-2">
                      <span className="text-xs text-cyan-400">
                        ⚡ {result.functionName}
                      </span>
                    </div>
                  )}

                  {result.className && (
                    <div className="mt-2">
                      <span className="text-xs text-purple-400">
                        📦 {result.className}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Detalles del archivo seleccionado */}
          <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col max-h-[600px]">
            <div className="p-4 bg-gray-750 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">📄 Detalles del Archivo</h3>
            </div>

            {selectedResult ? (
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                {/* Info básica */}
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-3">ℹ️ Información</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Nombre:</span>
                      <span className="text-white font-medium">
                        {selectedResult.file.path.split(/[\/\\]/).pop()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Tamaño:</span>
                      <span className="text-white">
                        {formatFileSize(selectedResult.file.size)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Líneas:</span>
                      <span className="text-white">{selectedResult.file.lines}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Extensión:</span>
                      <span className="text-cyan-400">
                        {selectedResult.file.extension}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Funciones */}
                {selectedResult.file.functions && selectedResult.file.functions.length > 0 && (
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-3">
                      ⚡ Funciones ({selectedResult.file.functions.length})
                    </h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {selectedResult.file.functions.map((fn, i) => (
                        <div key={i} className="text-sm text-cyan-400">
                          • {fn}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clases */}
                {selectedResult.file.classes && selectedResult.file.classes.length > 0 && (
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-3">
                      📦 Clases ({selectedResult.file.classes.length})
                    </h4>
                    <div className="space-y-1">
                      {selectedResult.file.classes.map((cls, i) => (
                        <div key={i} className="text-sm text-purple-400">
                          • {cls}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Imports */}
                {selectedResult.file.imports && selectedResult.file.imports.length > 0 && (
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-3">
                      📥 Imports ({selectedResult.file.imports.length})
                    </h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {selectedResult.file.imports.slice(0, 10).map((imp, i) => (
                        <div key={i} className="text-xs text-gray-400 truncate">
                          • {imp}
                        </div>
                      ))}
                      {selectedResult.file.imports.length > 10 && (
                        <div className="text-xs text-gray-500 italic">
                          ... y {selectedResult.file.imports.length - 10} más
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Exports */}
                {selectedResult.file.exports && selectedResult.file.exports.length > 0 && (
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-3">
                      📤 Exports ({selectedResult.file.exports.length})
                    </h4>
                    <div className="space-y-1">
                      {selectedResult.file.exports.map((exp, i) => (
                        <div key={i} className="text-sm text-green-400">
                          • {exp}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Path completo */}
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-2">📂 Path Completo</h4>
                  <code className="text-xs text-gray-300 break-all">
                    {selectedResult.file.path}
                  </code>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <p className="text-4xl mb-2">📄</p>
                  <p>Selecciona un resultado para ver detalles</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sin resultados */}
      {!searching && query && results.length === 0 && (
        <div className="bg-gray-800 rounded-lg p-12 text-center shadow-lg">
          <p className="text-6xl mb-4">🔍</p>
          <p className="text-xl text-gray-400 mb-2">No se encontraron resultados</p>
          <p className="text-sm text-gray-500">
            Intenta con otros términos de búsqueda
          </p>
        </div>
      )}

      {/* Estado inicial */}
      {!query && results.length === 0 && (
        <div className="bg-gray-800 rounded-lg p-12 text-center shadow-lg">
          <p className="text-6xl mb-4">💡</p>
          <p className="text-xl text-white mb-2">Comienza tu búsqueda</p>
          <p className="text-sm text-gray-400 mb-4">
            Busca funciones, clases, archivos o cualquier código en el proyecto
          </p>
          <div className="space-y-2 text-left max-w-md mx-auto text-sm text-gray-500">
            <p>💡 Ejemplos de búsqueda:</p>
            <p className="ml-4">• "initialize" - Buscar funciones de inicialización</p>
            <p className="ml-4">• "NotificationSystem" - Buscar clase específica</p>
            <p className="ml-4">• "autonomous" - Buscar archivos relacionados</p>
            <p className="ml-4">• "socket" - Buscar por keywords</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodeSearch;
