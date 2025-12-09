// web-interface/frontend/src/components/PerformanceDashboard.jsx
// Dashboard de Performance y Optimización

import React, { useState, useEffect } from 'react';

const PerformanceDashboard = ({ socket }) => {
  const [metrics, setMetrics] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [activeView, setActiveView] = useState('overview'); // 'overview', 'operations', 'memory', 'cache'
  const [autoOptimizing, setAutoOptimizing] = useState(false);

  useEffect(() => {
    if (!socket) return;

    // Event listeners
    socket.on('performance:metrics', (data) => {
      setMetrics(data);
    });

    socket.on('performance:recommendations', (data) => {
      setRecommendations(data);
    });

    socket.on('performance:auto-optimized', (data) => {
      setAutoOptimizing(false);
      alert(`✅ Auto-optimización completada:\n${data.actions.map(a => `• ${a.action}: ${a.result}`).join('\n')}`);
      // Refresh metrics
      socket.emit('performance:get-metrics');
    });

    socket.on('performance:cache-cleared', () => {
      alert('✅ Cache limpiado exitosamente');
      socket.emit('performance:get-metrics');
    });

    socket.on('performance:error', (data) => {
      alert(`❌ Error: ${data.message}`);
    });

    // Initial load
    socket.emit('performance:get-metrics');
    socket.emit('performance:get-recommendations');

    // Auto-refresh cada 10 segundos
    const interval = setInterval(() => {
      socket.emit('performance:get-metrics');
    }, 10000);

    return () => {
      socket.off('performance:metrics');
      socket.off('performance:recommendations');
      socket.off('performance:auto-optimized');
      socket.off('performance:cache-cleared');
      socket.off('performance:error');
      clearInterval(interval);
    };
  }, [socket]);

  const handleAutoOptimize = () => {
    if (!socket || autoOptimizing) return;
    setAutoOptimizing(true);
    socket.emit('performance:auto-optimize');
  };

  const handleClearCache = () => {
    if (!socket || !confirm('¿Limpiar todo el cache?')) return;
    socket.emit('performance:clear-cache');
  };

  const formatBytes = (bytes) => {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const formatDuration = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-600';
      case 'warning': return 'bg-yellow-600';
      case 'info': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };

  const renderOverview = () => {
    if (!metrics) return <p className="text-gray-400">Cargando métricas...</p>;

    const { summary, cache, memory } = metrics;

    return (
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Total Requests</div>
            <div className="text-2xl font-bold text-white">{summary.totalRequests}</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Avg Response</div>
            <div className="text-2xl font-bold text-cyan-400">{summary.averageResponseTime}ms</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Slow Ops</div>
            <div className="text-2xl font-bold text-yellow-400">{summary.slowOperations}</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Critical Ops</div>
            <div className="text-2xl font-bold text-red-400">{summary.criticalOperations}</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Active Ops</div>
            <div className="text-2xl font-bold text-purple-400">{summary.activeOperations}</div>
          </div>
        </div>

        {/* Cache Stats */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4">💾 Cache Performance</h3>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="text-gray-400 text-sm mb-1">Hit Rate</div>
              <div className="text-3xl font-bold text-green-400">{cache.hitRate}%</div>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${cache.hitRate}%` }}
                />
              </div>
            </div>

            <div>
              <div className="text-gray-400 text-sm mb-1">Cache Size</div>
              <div className="text-2xl font-bold text-cyan-400">{cache.size} / {cache.maxSize}</div>
              <div className="text-xs text-gray-500 mt-1">
                {Math.round((cache.size / cache.maxSize) * 100)}% utilizado
              </div>
            </div>

            <div>
              <div className="text-gray-400 text-sm mb-1">Hits</div>
              <div className="text-2xl font-bold text-green-400">{cache.hits}</div>
            </div>

            <div>
              <div className="text-gray-400 text-sm mb-1">Misses</div>
              <div className="text-2xl font-bold text-red-400">{cache.misses}</div>
            </div>
          </div>
        </div>

        {/* Memory Stats */}
        {memory && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4">🧠 Memory Usage</h3>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-gray-400 text-sm mb-1">Heap Used</div>
                <div className="text-2xl font-bold text-purple-400">{memory.current.heapUsedMB} MB</div>
                <div className="text-xs text-gray-500 mt-1">
                  de {memory.current.heapTotalMB} MB total
                </div>
              </div>

              <div>
                <div className="text-gray-400 text-sm mb-1">RSS</div>
                <div className="text-2xl font-bold text-blue-400">{memory.current.rssMB} MB</div>
              </div>

              <div>
                <div className="text-gray-400 text-sm mb-1">Average Used</div>
                <div className="text-2xl font-bold text-cyan-400">{memory.average.heapUsedMB} MB</div>
              </div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4">💡 Recomendaciones</h3>

            <div className="space-y-3">
              {recommendations.map((rec, idx) => (
                <div key={idx} className={`${getSeverityColor(rec.severity)} bg-opacity-20 border ${getSeverityColor(rec.severity)} rounded-lg p-4`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-white mb-1">{rec.message}</p>
                      <p className="text-sm text-gray-300">💡 {rec.suggestion}</p>
                    </div>
                    <span className={`px-3 py-1 ${getSeverityColor(rec.severity)} text-white rounded text-xs font-semibold`}>
                      {rec.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderOperations = () => {
    if (!metrics) return <p className="text-gray-400">Cargando métricas...</p>;

    const { recentOperations, slowOperations, criticalOperations } = metrics;

    return (
      <div className="space-y-6">
        {/* Recent Operations */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4">🔄 Operaciones Recientes</h3>

          {recentOperations.length === 0 ? (
            <p className="text-gray-400 text-center py-4">No hay operaciones recientes</p>
          ) : (
            <div className="space-y-2">
              {recentOperations.slice(0, 20).map((op, idx) => (
                <div key={idx} className="bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-white">{op.name}</span>
                        <span className="px-2 py-1 bg-gray-600 text-white rounded text-xs">
                          {op.category}
                        </span>
                        {op.success ? (
                          <span className="text-green-400 text-xs">✓</span>
                        ) : (
                          <span className="text-red-400 text-xs">✗</span>
                        )}
                      </div>
                      {op.error && (
                        <p className="text-red-400 text-xs mt-1">{op.error}</p>
                      )}
                    </div>

                    <div className="text-right">
                      <div className={`font-bold ${op.duration > 1000 ? 'text-red-400' : 'text-cyan-400'}`}>
                        {formatDuration(op.duration)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatBytes(op.memoryDelta)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Slow Operations */}
        {slowOperations.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4">⚠️ Operaciones Lentas</h3>

            <div className="space-y-2">
              {slowOperations.map((op, idx) => (
                <div key={idx} className="bg-yellow-900 bg-opacity-20 border border-yellow-500 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-white">{op.name}</span>
                      <span className="ml-2 px-2 py-1 bg-gray-600 text-white rounded text-xs">
                        {op.category}
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-yellow-400">{formatDuration(op.duration)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Critical Operations */}
        {criticalOperations.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4">🚨 Operaciones Críticas</h3>

            <div className="space-y-2">
              {criticalOperations.map((op, idx) => (
                <div key={idx} className="bg-red-900 bg-opacity-20 border border-red-500 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-white">{op.name}</span>
                      <span className="ml-2 px-2 py-1 bg-gray-600 text-white rounded text-xs">
                        {op.category}
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-red-400">{formatDuration(op.duration)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">⚡ Performance & Optimization</h2>
          <p className="text-gray-400 text-sm mt-1">
            Monitoreo de rendimiento y optimización automática
          </p>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={handleClearCache}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-semibold"
          >
            🧹 Limpiar Cache
          </button>
          <button
            onClick={handleAutoOptimize}
            disabled={autoOptimizing}
            className="px-4 py-2 bg-gradient-to-r from-green-600 to-cyan-600 text-white rounded-lg hover:from-green-700 hover:to-cyan-700 font-semibold disabled:opacity-50"
          >
            {autoOptimizing ? '⏳ Optimizando...' : '🔧 Auto-Optimizar'}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex space-x-2">
        <button
          onClick={() => setActiveView('overview')}
          className={`px-4 py-2 rounded-lg font-semibold ${
            activeView === 'overview'
              ? 'bg-cyan-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          📊 Overview
        </button>
        <button
          onClick={() => setActiveView('operations')}
          className={`px-4 py-2 rounded-lg font-semibold ${
            activeView === 'operations'
              ? 'bg-cyan-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          🔄 Operaciones
        </button>
      </div>

      {/* Content */}
      {activeView === 'overview' && renderOverview()}
      {activeView === 'operations' && renderOperations()}
    </div>
  );
};

export default PerformanceDashboard;
